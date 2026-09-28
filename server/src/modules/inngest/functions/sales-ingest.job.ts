import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prismaClient/prisma.service";
import {
  SALE_ORDER_STATUSES,
  aggregateDaySales,
  utcDayStart,
} from "./job-guards";
import { inngest } from "../inngest.client";
import { InngestRegistryService } from "../inngest-registry.service";
import { isJobEnabled } from "../job-flags";
import { getJobRuntime } from "../agent-job-runtime";

/** Số ngày trailing recompute mỗi lần chạy (tự backfill + tự sửa số liệu muộn). */
const TRAILING_DAYS = 30;

/**
 * Durable job: 01:00 hàng ngày gom đơn kênh nội bộ (trừ PENDING/FAILED/
 * REFUNDED/CANCELED) thành facts DailyVariantSale theo ngày UTC.
 * Recompute trailing 30 ngày nên rerun idempotent (delete + create theo ngày)
 * và tự điền ngày còn thiếu. KHÔNG gọi LLM (0 token).
 * Chạy trước flash-sale-campaign (02:15 VN) để analyst đọc số tươi.
 */
@Injectable()
export class SalesIngestJob {
  private readonly logger = new Logger(SalesIngestJob.name);

  constructor(
    private readonly prisma: PrismaService,
    registry: InngestRegistryService,
  ) {
    if (isJobEnabled("JOB_SALES_INGEST")) {
      registry.register(this.buildFunction());
    }
  }

  private buildFunction() {
    return inngest.createFunction(
      {
        id: "sales-ingest",
        name: "Sales Ingest (daily)",
        retries: 2,
        // 1 run tại 1 thời điểm: tránh 2 run đè nhau createMany trùng unique.
        concurrency: { limit: 1 },
        triggers: [{ cron: "0 18 * * *" }],
      },
      async ({ step }) => {
        const runtime = await getJobRuntime(this.prisma, "sales-ingest");
        if (!runtime.enabled) {
          this.logger.log("⏸️ sales-ingest đang tắt — bỏ qua kỳ này.");
          return { skipped: true };
        }

        const written = await step.run("compute-30d", async () => {
          // Chỉ ingest ngày đã kết thúc trọn vẹn (bỏ hôm nay còn dở).
          const todayStart = utcDayStart(new Date());
          const windowStart = new Date(
            todayStart.getTime() - (TRAILING_DAYS - 1) * 24 * 60 * 60 * 1000,
          );
          // 1 query duy nhất cho cả cửa sổ (tránh 90 roundtrips tới DB remote).
          const items = await this.prisma.orderItem.findMany({
            where: {
              order: {
                createdAt: { gte: windowStart, lt: todayStart },
                status: { in: [...SALE_ORDER_STATUSES] as any },
              },
            },
            select: {
              variantId: true,
              price: true,
              quantity: true,
              order: { select: { createdAt: true } },
            },
          });
          // Gom theo ngày UTC trong RAM.
          const byDay = new Map<number, typeof items>();
          for (const it of items) {
            const key = utcDayStart(it.order.createdAt).getTime();
            const arr = byDay.get(key) ?? [];
            arr.push(it);
            byDay.set(key, arr);
          }
          // 1 transaction duy nhất: xóa + ghi lại cả cửa sổ (idempotent,
          // tự sửa số liệu muộn như refund/hủy đổi status sau).
          let totalRows = 0;
          await this.prisma.$transaction(async (tx) => {
            await tx.dailyVariantSale.deleteMany({
              where: { date: { gte: windowStart } },
            });
            for (const [dayMs, dayItems] of byDay) {
              const agg = aggregateDaySales(dayItems);
              if (agg.length === 0) continue;
              await tx.dailyVariantSale.createMany({
                data: agg.map((v) => ({
                  date: new Date(dayMs),
                  variantId: v.variantId,
                  qty: v.qty,
                  revenue: BigInt(v.revenue),
                })),
              });
              totalRows += agg.length;
            }
          });
          return { days: TRAILING_DAYS, rows: totalRows };
        });

        this.logger.log(
          `✅ sales-ingest: ${written.days} ngày, ${written.rows} facts`,
        );
        return written;
      },
    );
  }
}
