import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditEntity, AuditLogService } from '../../audit-log/audit-log.service';
import { PrismaService } from '../../../prismaClient/prisma.service';
import { AgentWorkflowService } from '../../agent/agent-workflow.service';
import { inngest } from '../inngest.client';
import { InngestRegistryService } from '../inngest-registry.service';
import { getJobRuntime } from '../agent-job-runtime';
import { isJobEnabled } from '../job-flags';

/** Số sản phẩm xử lý mỗi lần cron chạy (giữ nhỏ để tránh rate-limit Gemini free ~15 RPM). */

/** Nghỉ giữa các sản phẩm để không dồn request vào Gemini free tier. */
const THROTTLE_SECONDS = 5;

interface UnprocessedProduct {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  specsRaw: string;
}

/**
 * Durable job: cron 04:00 VN hàng ngày → lấy sản phẩm chưa có mô tả → crew 3 agent
 * làm giàu nội dung → lưu DB + ghi audit.
 *
 * Crash ở step nào thì resume đúng step đó (Inngest memoize kết quả các step
 * đã xong, không chạy lại query DB hay gọi LLM lại).
 */
@Injectable()
export class ProductEnrichmentJob {
  private readonly logger = new Logger(ProductEnrichmentJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: AgentWorkflowService,
    private readonly audit: AuditLogService,
    registry: InngestRegistryService,
  ) {
    // Công tắc env: tắt thì không đăng ký (cron không bắn). Đổi env phải restart.
    if (isJobEnabled('JOB_PRODUCT_ENRICHMENT')) {
      registry.register(this.buildFunction());
    }
  }

  private buildFunction() {
    return inngest.createFunction(
      {
        id: 'product-enrichment',
        name: 'Product Enrichment (hourly)',
        retries: 2, // retry cả function nếu step ném lỗi chưa bắt (ví dụ 429 Gemini)
        // 1 run tại 1 thời điểm: chống trigger đè gây trùng unique/audit đôi.
        concurrency: { limit: 1 },
        // Chạy 04:00 hàng ngày (đủ cho làm giàu nội dung; chạy hourly ngốn ~360 calls/ngày).
        // Muốn thưa hơn: đổi '0 4 * * *' → '0 4 * * 1' (sáng T2 hàng tuần).
        triggers: [{ cron: '0 21 * * *' }],
      },
      async ({ step }) => {
        // Step 0 — công tắc runtime (env boot + UI admin): tắt thì thoát
        // ngay, 0 token. Đổi trên UI có hiệu lực ngay kỳ cron tới.
        const runtime = await getJobRuntime(this.prisma, 'product-enrichment');
        if (!runtime.enabled) {
          this.logger.log('⏸️ product-enrichment đang tắt — bỏ qua kỳ này.');
          return { skipped: true };
        }
        // Step 1 — lấy batch sản phẩm chưa có description.
        const products = await step.run(
          'fetch-unprocessed-products',
          async (): Promise<UnprocessedProduct[]> => {
            const rows = await this.prisma.product.findMany({
              where: { description: null, deletedAt: null },
              orderBy: { createdAt: 'asc' },
              take: runtime.batchSize,
              select: {
                id: true,
                name: true,
                brand: true,
                category: { select: { name: true } },
                variants: {
                  take: 3,
                  select: {
                    sku: true,
                    price: true,
                    salePrice: true,
                    colors: true,
                    attributes: true,
                  },
                },
              },
            });
            return rows.map((p) => ({
              id: p.id,
              name: p.name,
              brand: p.brand,
              categoryName: p.category?.name ?? null,
              specsRaw: JSON.stringify({
                name: p.name,
                brand: p.brand,
                category: p.category?.name ?? null,
                variants: p.variants.map((v) => ({
                  sku: v.sku,
                  price: v.price != null ? Number(v.price) : null,
                  salePrice: v.salePrice != null ? Number(v.salePrice) : null,
                  colors: v.colors,
                  attributes: v.attributes,
                })),
              }),
            }));
          },
        );

        if (products.length === 0) {
          this.logger.log('📭 Không có sản phẩm nào cần làm giàu.');
          return { processed: 0, approved: 0, rejected: 0 };
        }

        let approved = 0;
        let rejected = 0;

        // Chạy tuần tự từng sản phẩm để không dính rate-limit Gemini free tier.
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          // Step 2 — crew 3 agent xử lý 1 sản phẩm.
          const result = await step.run(`enrich-${p.id}`, () =>
            this.agent.runEnrichment({
              productId: p.id,
              productName: p.name,
              brand: p.brand,
              categoryName: p.categoryName,
              specsRaw: p.specsRaw,
            }),
          );
          if (result.status === 'approved') approved += 1;
          else rejected += 1;

          // Step 3 — lưu DB + audit.
          // - APPROVED: update có guard description IS NULL (tránh ghi đè mô tả
          //   admin vừa gõ tay trong lúc job chạy). Guard fail → chỉ audit.
          // - REJECTED: KHÔNG động vào description (giữ null để người xử lý tay
          //   hoặc batch sau thử lại), chỉ ghi audit.
          // - userId để undefined (không có user thật); actor ghi trong detail
          //   để tránh vi phạm FK AuditLog.userId → User.
          await step.run(`save-${p.id}`, async () => {
            // Transaction bọc update + tạo ảnh: hoặc cả hai commit, hoặc không gì
            // commit → Inngest retry step sẽ chạy lại sạch, không mất ảnh, không trùng.
            // Audit log để ngoài transaction (append-only, retry ghi trùng vẫn chấp nhận được).
            const { saved, savedImages } = await this.prisma.$transaction(
              async (tx) => {
                let saved = false;
                let savedImages = 0;
                if (result.status === 'approved') {
                  const updated = await tx.product.updateMany({
                    where: { id: p.id, description: null },
                    data: { description: result.description },
                  });
                  saved = updated.count > 0;
                  // Lưu ảnh designer gen vào gallery sản phẩm (nối tiếp displayOrder).
                  // Chỉ khi update description thành công (guard pass).
                  if (saved && result.designerImages.length > 0) {
                    const existing = await tx.productImage.count({
                      where: { productId: p.id },
                    });
                    await tx.productImage.createMany({
                      data: result.designerImages.map((url, i) => ({
                        productId: p.id,
                        url,
                        alt: `${p.name} — ảnh minh họa AI`,
                        // Quy ước repo: sp chưa có ảnh thì ảnh đầu tiên là primary
                        // (inventory/sale query cứng isPrimary=true).
                        isPrimary: existing === 0 && i === 0,
                        displayOrder: existing + i,
                      })),
                    });
                    savedImages = result.designerImages.length;
                  }
                }
                return { saved, savedImages };
              },
            );
            await this.audit.log(
              AuditAction.PRODUCT_UPDATE,
              AuditEntity.PRODUCT,
              undefined,
              p.id,
              {
                actor: 'system:agent-crew',
                source: 'product-enrichment',
                status: result.status,
                saved,
                savedImages,
                retryCount: result.retryCount,
                reviewFeedback: result.reviewFeedback || undefined,
              },
            );
            return { id: p.id, status: result.status, saved, savedImages };
          });

          // Nghỉ durable giữa các sản phẩm (trừ sp cuối) để giãn tải Gemini.
          if (i < products.length - 1) {
            await step.sleep(
              `throttle-${p.id}`,
              `${THROTTLE_SECONDS}s`,
            );
          }
        }

        this.logger.log(
          `✅ product-enrichment: ${products.length} sp (${approved} approved, ${rejected} rejected)`,
        );
        return { processed: products.length, approved, rejected };
      },
    );
  }
}
