import { Injectable, Logger } from "@nestjs/common";
import {
  AuditAction,
  AuditEntity,
  AuditLogService,
} from "../../audit-log/audit-log.service";
import { PrismaService } from "../../../prismaClient/prisma.service";
import { FlashSaleCampaignService } from "../../agent/flash-sale.workflow";
import type { SaleCandidate } from "../../agent/nodes/flash-sale.nodes";
import { SALE_ORDER_STATUSES, utcDayStart } from "./job-guards";
import { clampSaleItem } from "./job-guards";
import { inngest } from "../inngest.client";
import { InngestRegistryService } from "../inngest-registry.service";
import { getJobRuntime } from "../agent-job-runtime";
import { isJobEnabled } from "../job-flags";

const MIN_AVAILABLE = 20;

/**
 * Durable job: 02:15 VN hàng ngày tìm variant tồn cao/bán chậm → crew lên
 * kế hoạch sale → tạo FlashSale DRAFT (active:false + tiền tố [DRAFT],
 * store lọc cứng active:true nên không lộ). Admin duyệt bằng toggleActive.
 */
@Injectable()
export class FlashSaleCampaignJob {
  private readonly logger = new Logger(FlashSaleCampaignJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaign: FlashSaleCampaignService,
    private readonly audit: AuditLogService,
    registry: InngestRegistryService,
  ) {
    // Công tắc env: tắt thì không đăng ký (cron không bắn). Đổi env phải restart.
    if (isJobEnabled("JOB_FLASH_SALE")) {
      registry.register(this.buildFunction());
    }
  }

  /**
   * Số lượng bán 30 ngày qua theo variant.
   * Nguồn chính: facts DailyVariantSale (job sales-ingest gom đêm trước).
   * Chỉ dùng facts khi độ phủ ngày đủ (≥25/30) — facts thưa (mới deploy,
   * ingest crash giữa chừng) mà dùng sẽ over-pick hàng hot thành "hàng ế".
   * Fallback: quét live OrderItem CÓ lọc trạng thái (giống ingest).
   * `since` được chuẩn hoá về đầu ngày UTC để không rơi mất ngày thứ 30.
   */
  private async soldLast30Days(since: Date): Promise<Map<string, number>> {
    const from = utcDayStart(since);
    const covered = await this.prisma.dailyVariantSale.findMany({
      where: { date: { gte: from } },
      select: { date: true },
      distinct: ["date"],
    });
    if (covered.length >= 25) {
      const facts = await this.prisma.dailyVariantSale.groupBy({
        by: ["variantId"],
        where: { date: { gte: from } },
        _sum: { qty: true },
      });
      return new Map(facts.map((f) => [f.variantId, f._sum.qty ?? 0]));
    }
    const live = await this.prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        order: {
          createdAt: { gte: since },
          status: { in: [...SALE_ORDER_STATUSES] as any },
        },
      },
      _sum: { quantity: true },
    });
    return new Map(live.map((s) => [s.variantId, s._sum.quantity ?? 0]));
  }

  private buildFunction() {
    return inngest.createFunction(
      {
        id: "flash-sale-campaign",
        name: "Flash Sale Campaign (daily)",
        retries: 2,
        // 1 run tại 1 thời điểm: chống trigger đè gây trùng unique/audit đôi.
        concurrency: { limit: 1 },
        triggers: [{ cron: "15 19 * * *" }],
      },
      async ({ step }) => {
        // Step 0 — công tắc runtime (env boot + UI admin): tắt thì thoát
        // ngay, 0 token. Đổi trên UI có hiệu lực ngay kỳ cron tới.
        const runtime = await getJobRuntime(this.prisma, "flash-sale-campaign");
        if (!runtime.enabled) {
          this.logger.log("⏸️ flash-sale-campaign đang tắt — bỏ qua kỳ này.");
          return { skipped: true };
        }
        // Step 1 — ứng viên: tồn khả dụng ≥ 20, không sale, bán chậm 30 ngày.
        const candidates = await step.run(
          "fetch-candidates",
          async (): Promise<SaleCandidate[]> => {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const now = new Date();
            const variants = await this.prisma.variant.findMany({
              where: {
                product: { deletedAt: null },
                OR: [{ saleEndDate: null }, { saleEndDate: { lt: now } }],
              },
              orderBy: { stock: "desc" },
              // Lấy dư để lọc (sale đang chạy, bán chậm) rồi mới slice batch.
              take: Math.max(runtime.batchSize * 3, 30),
              select: {
                id: true,
                sku: true,
                price: true,
                stock: true,
                reservedQuantity: true,
                product: { select: { name: true } },
                flashSaleItems: {
                  where: { flashSale: { active: true } },
                  select: { id: true },
                },
              },
            });
            // Số bán 30d đọc từ facts ingest (nhanh, ổn định sau refund/hủy).
            // Facts trống (job sales-ingest chưa chạy lần nào) → fallback live.
            const soldMap = await this.soldLast30Days(since);
            return variants
              .filter((v) => v.flashSaleItems.length === 0)
              .map((v) => ({
                variantId: v.id,
                productName: v.product.name,
                sku: v.sku,
                price: Number(v.price),
                available: v.stock - v.reservedQuantity,
                sold30d: soldMap.get(v.id) ?? 0,
              }))
              .filter((c) => c.available >= MIN_AVAILABLE && c.sold30d === 0)
              .slice(0, runtime.batchSize);
          },
        );

        if (candidates.length === 0) {
          return { candidates: 0, items: 0, draftId: null };
        }

        // Step 2 — crew lên kế hoạch (3 LLM calls).
        const plan = await step.run("run-crew", () =>
          this.campaign.runCampaign(candidates),
        );

        if (plan.items.length === 0) {
          await this.audit.log(
            AuditAction.FLASHSALE_CREATE,
            AuditEntity.FLASHSALE,
            undefined,
            "none",
            {
              actor: "system:agent-crew",
              source: "flash-sale-campaign",
              status: "NO_APPROVED_ITEMS",
              rejected: plan.rejected,
              notes: plan.notes,
            },
          );
          return { candidates: candidates.length, items: 0, draftId: null };
        }

        // Step 3 — tạo DRAFT (guard số học bằng code, idempotent theo tên).
        const created = await step.run("create-draft", async () => {
          const day = new Date();
          const label = `${String(day.getDate()).padStart(2, "0")}/${String(day.getMonth() + 1).padStart(2, "0")}`;
          const name = `[DRAFT] ${plan.copy.name} ${label}`;
          // Idempotent theo ngày: cùng ngày rerun (LLM đổi tên) vẫn reuse draft
          // đã tạo, tránh spam nhiều chiến dịch trùng ngày.
          const existing = await this.prisma.flashSale.findFirst({
            where: { name: { startsWith: "[DRAFT]", endsWith: label } },
            select: { id: true },
          });
          if (existing) return { id: existing.id, reused: true };

          const byId = new Map(candidates.map((c) => [c.variantId, c]));
          const items = plan.items
            .map((it) => {
              const c = byId.get(it.variantId);
              if (!c) return null;
              const clamped = clampSaleItem({
                price: c.price,
                discountPct: it.discountPct,
                quantity: it.quantity,
                available: c.available,
              });
              if (!clamped) return null;
              return {
                variantId: c.variantId,
                salePrice: clamped.salePrice,
                quantity: clamped.quantity,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);
          if (items.length === 0)
            return { id: null as string | null, reused: false };

          const start = new Date();
          start.setDate(start.getDate() + 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 2);

          const draft = await this.prisma.flashSale.create({
            data: {
              name,
              description: `${plan.copy.tagline}\n\n${plan.copy.description}`,
              startTime: start,
              endTime: end,
              active: false, // DRAFT: store không bao giờ đọc active:false
              items: {
                create: items.map((it) => ({
                  variantId: it.variantId,
                  salePrice: BigInt(it.salePrice),
                  quantity: it.quantity,
                })),
              },
            },
            select: { id: true },
          });
          await this.audit.log(
            AuditAction.FLASHSALE_CREATE,
            AuditEntity.FLASHSALE,
            undefined,
            draft.id,
            {
              actor: "system:agent-crew",
              source: "flash-sale-campaign",
              status: "DRAFT_PENDING_ADMIN",
              itemCount: items.length,
              rejected: plan.rejected,
            },
          );
          return { id: draft.id as string | null, reused: false };
        });

        this.logger.log(
          `✅ flash-sale-campaign: ${candidates.length} candidates → draft ${created.id}`,
        );
        return {
          candidates: candidates.length,
          items: plan.items.length,
          draftId: created.id,
        };
      },
    );
  }
}
