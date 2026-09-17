import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditEntity, AuditLogService } from '../../audit-log/audit-log.service';
import { PrismaService } from '../../../prismaClient/prisma.service';
import { RecommendationService } from '../../agent/recommendation.workflow';
import { dedupeRankings } from './job-guards';
import type {
  BehaviorSignals,
  RankCandidate,
} from '../../agent/nodes/recommendation.nodes';
import { inngest } from '../inngest.client';
import { InngestRegistryService } from '../inngest-registry.service';
import { getJobRuntime } from '../agent-job-runtime';
import { isJobEnabled } from '../job-flags';

const MAX_CANDIDATES = 30;

function topN(
  items: (string | null | undefined)[],
  n: number,
): { name: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const it of items) {
    if (!it) continue;
    freq.set(it, (freq.get(it) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

/**
 * Durable job: mỗi 6h gom tín hiệu hành vi (đơn đã giao, wishlist,
 * đánh giá tốt, xem gần đây) → crew rank top 10 → lưu UserRecommendation.
 * productId hallucinate bị loại bằng code trước khi lưu.
 */
@Injectable()
export class RecommendationRefreshJob {
  private readonly logger = new Logger(RecommendationRefreshJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recommender: RecommendationService,
    private readonly audit: AuditLogService,
    registry: InngestRegistryService,
  ) {
    // Công tắc env: tắt thì không đăng ký (cron không bắn). Đổi env phải restart.
    if (isJobEnabled('JOB_RECOMMENDATION')) {
      registry.register(this.buildFunction());
    }
  }

  private buildFunction() {
    return inngest.createFunction(
      {
        id: 'recommendation-refresh',
        name: 'Recommendation Refresh (6h)',
        retries: 2,
        // 1 run tại 1 thời điểm: chống trigger đè gây trùng unique/audit đôi.
        concurrency: { limit: 1 },
        // Chạy 05:20 VN hàng ngày (gợi ý không cần tươi theo giờ; 4 lần/ngày ngốn quota).
        triggers: [{ cron: '20 22 * * *' }],
      },
      async ({ step }) => {
        // Step 0 — công tắc runtime (env boot + UI admin): tắt thì thoát
        // ngay, 0 token. Đổi trên UI có hiệu lực ngay kỳ cron tới.
        const runtime = await getJobRuntime(this.prisma, 'recommendation-refresh');
        if (!runtime.enabled) {
          this.logger.log('⏸️ recommendation-refresh đang tắt — bỏ qua kỳ này.');
          return { skipped: true };
        }
        // Step 1 — user có tương tác gần đây (view/cart 7 ngày hoặc đơn mới).
        const userIds = await step.run(
          'fetch-active-users',
          async (): Promise<string[]> => {
            const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const [viewers, buyers] = await Promise.all([
              this.prisma.userEvent.findMany({
                where: {
                  userId: { not: null },
                  eventType: { in: ['PRODUCT_VIEW', 'ADD_TO_CART'] },
                  createdAt: { gte: since },
                },
                select: { userId: true },
                distinct: ['userId'],
                take: Math.max(runtime.batchSize, 20),
              }),
              this.prisma.order.findMany({
                where: { userId: { not: null }, createdAt: { gte: since } },
                select: { userId: true },
                distinct: ['userId'],
                take: Math.max(runtime.batchSize, 20),
              }),
            ]);
            const ids = new Set<string>();
            for (const r of [...viewers, ...buyers]) {
              if (r.userId) ids.add(r.userId);
              // Gom dư 1 ít để vòng sau lọc, giới hạn theo batch runtime.
              if (ids.size >= runtime.batchSize * 2) break;
            }
            return [...ids].slice(0, runtime.batchSize);
          },
        );

        let done = 0;
        for (let i = 0; i < userIds.length; i++) {
          const userId = userIds[i];
          // Step 2 — gom tín hiệu (full code, không LLM).
          const bundle = await step.run(`signals-${userId}`, async () => {
            const [items, wishlist, reviews, views] = await Promise.all([
              this.prisma.orderItem.findMany({
                where: {
                  order: {
                    userId,
                    status: { in: ['DELIVERED', 'COMPLETED'] },
                  },
                },
                select: {
                  variant: {
                    select: {
                      product: {
                        select: {
                          id: true,
                          category: { select: { name: true } },
                          brand: true,
                        },
                      },
                    },
                  },
                },
                take: 100,
              }),
              this.prisma.wishlistItem.findMany({
                where: { userId },
                select: { productId: true },
                take: 50,
              }),
              this.prisma.review.findMany({
                where: { userId, rating: { gte: 4 } },
                select: { productId: true },
                take: 50,
              }),
              this.prisma.userEvent.findMany({
                where: {
                  userId,
                  eventType: 'PRODUCT_VIEW',
                },
                orderBy: { createdAt: 'desc' },
                take: 30,
                select: { metadata: true },
              }),
            ]);
            const purchasedIds = [
              ...new Set(items.map((it) => it.variant.product.id)),
            ];
            const signals: BehaviorSignals = {
              topCategories: topN(
                items.map((it) => it.variant.product.category?.name),
                3,
              ),
              topBrands: topN(
                items.map((it) => it.variant.product.brand),
                3,
              ),
              wishlistIds: wishlist.map((w) => w.productId),
              highRatedIds: reviews.map((r) => r.productId),
              recentViewIds: [
                ...new Set(
                  views
                    .map(
                      (v) =>
                        (v.metadata as { productId?: unknown } | null)
                          ?.productId,
                    )
                    .filter(
                      (p): p is string =>
                        typeof p === 'string' && p.length > 0,
                    ),
                ),
              ].slice(0, 10),
              purchasedIds,
            };
            const hasSignal =
              signals.topCategories.length > 0 ||
              signals.wishlistIds.length > 0 ||
              signals.highRatedIds.length > 0 ||
              signals.recentViewIds.length > 0;
            return { signals, hasSignal };
          });

          if (!bundle.hasSignal) continue;

          // Step 3 — candidates (loại đã mua, bán chạy trước).
          const candidates = await step.run(
            `candidates-${userId}`,
            async (): Promise<RankCandidate[]> => {
              const rows = await this.prisma.product.findMany({
                where: {
                  deletedAt: null,
                  id: { notIn: bundle.signals.purchasedIds },
                },
                orderBy: { soldCount: 'desc' },
                take: MAX_CANDIDATES,
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  category: { select: { name: true } },
                  soldCount: true,
                },
              });
              return rows.map((p) => ({
                productId: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category?.name ?? null,
                soldCount: p.soldCount,
              }));
            },
          );
          if (candidates.length === 0) continue;

          // Step 4 — crew rank (2 LLM calls).
          const rec = await step.run(`rank-${userId}`, () =>
            this.recommender.runRecommend(bundle.signals, candidates),
          );

          // Step 5 — kiểm chứng id + dedupe (chống P2002 unique) + lưu.
          // Rỗng (LLM lỗi/hallucinate hết) → GIỮ recs cũ, không xóa trắng DB.
          await step.run(`save-${userId}`, async () => {
            const validIds = new Set(candidates.map((c) => c.productId));
            const clean = dedupeRankings(
              rec.rankings.filter((r) => validIds.has(r.productId)),
            );
            if (clean.length === 0) {
              await this.audit.log(
                AuditAction.RECOMMENDATION_REFRESH,
                AuditEntity.USER,
                undefined,
                userId,
                {
                  actor: 'system:agent-crew',
                  source: 'recommendation-refresh',
                  count: 0,
                  dropped: rec.rankings.length,
                  status: 'SKIPPED_EMPTY',
                },
              );
              return { saved: 0, skipped: true };
            }
            await this.prisma.$transaction(async (tx) => {
              await tx.userRecommendation.deleteMany({
                where: { userId },
              });
              if (clean.length > 0) {
                await tx.userRecommendation.createMany({
                  data: clean.map((r) => ({
                    userId,
                    productId: r.productId,
                    score: r.score,
                    reason: r.reason,
                  })),
                });
              }
            });
            await this.audit.log(
              AuditAction.RECOMMENDATION_REFRESH,
              AuditEntity.USER,
              undefined,
              userId,
              {
                actor: 'system:agent-crew',
                source: 'recommendation-refresh',
                count: clean.length,
                dropped: rec.rankings.length - clean.length,
              },
            );
            return { saved: clean.length };
          });
          done += 1;

          if (i < userIds.length - 1) {
            await step.sleep(`throttle-${userId}`, '5s');
          }
        }

        this.logger.log(`✅ recommendation-refresh: ${done}/${userIds.length} users`);
        return { users: userIds.length, done };
      },
    );
  }
}
