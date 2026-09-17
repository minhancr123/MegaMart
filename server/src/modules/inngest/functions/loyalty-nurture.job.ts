import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditEntity, AuditLogService } from '../../audit-log/audit-log.service';
import { PrismaService } from '../../../prismaClient/prisma.service';
import { LoyaltyNurtureService } from '../../agent/loyalty.workflow';
import { TIER_RULES } from '../../agent/nodes/loyalty.nodes';
import type { NurtureCandidate } from '../../agent/nodes/loyalty.nodes';
import { clampLoyaltyVoucher } from './job-guards';
import { inngest } from '../inngest.client';
import { InngestRegistryService } from '../inngest-registry.service';
import { getJobRuntime } from '../agent-job-runtime';
import { isJobEnabled } from '../job-flags';

const DAY_MS = 24 * 60 * 60 * 1000;

function pointsOf(totalSpent: number): number {
  return Math.floor(totalSpent / 10000);
}

function tierOf(points: number): string {
  for (const t of TIER_RULES) {
    if (points >= t.minPoints) return t.name;
  }
  return 'Mới';
}

function nextTierOf(points: number): { name: string; minPoints: number } | null {
  const asc = [...TIER_RULES].reverse();
  for (const t of asc) {
    if (points < t.minPoints) return { name: t.name, minPoints: t.minPoints };
  }
  return null;
}

/**
 * Durable job: 08:30 VN sáng thứ Hai hàng tuần tìm user NEW/DORMANT/NEAR_TIER
 * → crew soạn ưu đãi (trần 50k, đơn tối thiểu 300k) → tạo voucher FIXED +
 * hàng chờ LoyaltyNurtureQueue (PENDING) để admin duyệt trước khi gửi.
 */
@Injectable()
export class LoyaltyNurtureJob {
  private readonly logger = new Logger(LoyaltyNurtureJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nurture: LoyaltyNurtureService,
    private readonly audit: AuditLogService,
    registry: InngestRegistryService,
  ) {
    // Công tắc env: tắt thì không đăng ký (cron không bắn). Đổi env phải restart.
    if (isJobEnabled('JOB_LOYALTY_NURTURE')) {
      registry.register(this.buildFunction());
    }
  }

  private buildFunction() {
    return inngest.createFunction(
      {
        id: 'loyalty-nurture',
        name: 'Loyalty Nurture (weekly)',
        retries: 2,
        // 1 run tại 1 thời điểm: chống trigger đè gây trùng unique/audit đôi.
        concurrency: { limit: 1 },
        triggers: [{ cron: '30 1 * * 1' }],
      },
      async ({ step }) => {
        // Step 0 — công tắc runtime (env boot + UI admin): tắt thì thoát
        // ngay, 0 token. Đổi trên UI có hiệu lực ngay kỳ cron tới.
        const runtime = await getJobRuntime(this.prisma, 'loyalty-nurture');
        if (!runtime.enabled) {
          this.logger.log('⏸️ loyalty-nurture đang tắt — bỏ qua kỳ này.');
          return { skipped: true };
        }
        // Step 1 — chọn tối đa 5 ứng viên theo rule cứng.
        const candidates = await step.run(
          'fetch-candidates',
          async (): Promise<NurtureCandidate[]> => {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
            const [users, recentlyQueued] = await Promise.all([
              this.prisma.user.findMany({
              where: { orders: { some: {} } },
              select: {
                id: true,
                name: true,
                createdAt: true,
                orders: {
                  where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
                  select: { total: true, createdAt: true },
                },
              },
                take: 200,
              }),
              // Chống spam: user đã có queue trong 30 ngày qua thì bỏ qua.
              this.prisma.loyaltyNurtureQueue.findMany({
                where: { createdAt: { gte: thirtyDaysAgo } },
                select: { userId: true },
              }),
            ]);
            const queuedSet = new Set(recentlyQueued.map((q) => q.userId));
            const scored = users
              .filter((u) => !queuedSet.has(u.id))
              .map((u) => {
              const totalSpent = u.orders.reduce(
                (s, o) => s + Number(o.total),
                0,
              );
              const points = pointsOf(totalSpent);
              const last = u.orders.length
                ? Math.max(...u.orders.map((o) => o.createdAt.getTime()))
                : null;
              const daysSince =
                last == null ? null : Math.floor((now.getTime() - last) / DAY_MS);
              const ageDays = Math.floor(
                (now.getTime() - u.createdAt.getTime()) / DAY_MS,
              );
              const next = nextTierOf(points);
              const progress = next
                ? Math.round((points / next.minPoints) * 100)
                : 100;
              let segment: NurtureCandidate['segment'] | null = null;
              if (next && progress >= 85) segment = 'NEAR_TIER';
              else if (daysSince != null && daysSince >= 60) segment = 'DORMANT';
              else if (ageDays <= 7 && u.orders.length <= 1) segment = 'NEW';
              return {
                userId: u.id,
                name: u.name ?? 'bạn',
                segment,
                totalSpent,
                points,
                currentTier: tierOf(points),
                nextTier: next?.name ?? null,
                progressPct: progress,
                daysSinceLastOrder: daysSince,
              };
            });
            const rank: Record<string, number> = {
              NEAR_TIER: 0,
              DORMANT: 1,
              NEW: 2,
            };
            return scored
              .filter((s) => s.segment !== null)
              .sort(
                (a, b) =>
                  rank[a.segment!] - rank[b.segment!] ||
                  b.progressPct - a.progressPct,
              )
              .slice(0, runtime.batchSize) as NurtureCandidate[];
          },
        );

        let approved = 0;
        let rejected = 0;
        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i];
          // Step 2 — crew soạn ưu đãi cho 1 user.
          const plan = await step.run(`nurture-${c.userId}`, () =>
            this.nurture.runNurture(c),
          );
          // Step 3 — kiểm chứng trần bằng code rồi tạo voucher + hàng chờ.
          const saved = await step.run(`save-${c.userId}`, async () => {
            if (!plan.approved || !plan.content) {
              await this.audit.log(
                AuditAction.LOYALTY_NURTURE_PROPOSAL,
                AuditEntity.USER,
                undefined,
                c.userId,
                {
                  actor: 'system:agent-crew',
                  source: 'loyalty-nurture',
                  status: 'REJECTED_BY_CREW',
                  segment: plan.segment.segment,
                  reason: plan.reason,
                },
              );
              return { created: false };
            }
            const v = plan.content.voucher;
            // Lưới an toàn cuối: ép về trần ngân sách dù LLM trả gì.
            const { value, minOrderValue, validityDays } = clampLoyaltyVoucher({
              value: v.value,
              minOrderValue: v.minOrderValue,
              validityDays: v.validityDays,
            });
            // Idempotency: retry step sau khi tx đã commit thì thấy queue hôm nay
            // và thoát ngay, tránh sinh voucher thứ 2 cho cùng user.
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const dup = await this.prisma.loyaltyNurtureQueue.findFirst({
              where: { userId: c.userId, createdAt: { gte: todayStart } },
              select: { id: true },
            });
            if (dup) return { created: false, duplicate: true };
            const day = new Date();
            const stamp = `${String(day.getFullYear()).slice(2)}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`;
            let code = '';
            for (let t = 0; t < 3; t++) {
              const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
              const tryCode = `LOYAL-${plan.segment.segment}-${stamp}-${suffix}`;
              const exists = await this.prisma.voucher.findUnique({
                where: { code: tryCode },
                select: { id: true },
              });
              if (!exists) {
                code = tryCode;
                break;
              }
            }
            if (!code) return { created: false };
            const start = new Date();
            const end = new Date(start.getTime() + validityDays * DAY_MS);
            const created = await this.prisma.$transaction(async (tx) => {
              const voucher = await tx.voucher.create({
                data: {
                  code,
                  title: `Ưu đãi ${plan.segment.segment === 'NEAR_TIER' ? 'lên hạng' : plan.segment.segment === 'DORMANT' ? 'quay lại' : 'chào mừng'} — ${c.name}`,
                  description: plan.content!.message,
                  type: 'FIXED',
                  value,
                  minOrderValue,
                  usageLimit: 1,
                  usagePerUser: 1,
                  startDate: start,
                  endDate: end,
                  // TẮT mặc định: voucher chỉ có hiệu lực khi admin duyệt queue.
                  // Nếu active:true từ lúc PENDING thì lộ mã là dùng được ngay.
                  active: false,
                },
                select: { id: true, code: true },
              });
              const queue = await tx.loyaltyNurtureQueue.create({
                data: {
                  userId: c.userId,
                  voucherId: voucher.id,
                  segment: plan.segment.segment,
                  message: plan.content!.message,
                  status: 'PENDING',
                },
                select: { id: true },
              });
              return { voucher, queueId: queue.id };
            });
            await this.audit.log(
              AuditAction.VOUCHER_CREATE,
              AuditEntity.VOUCHER,
              undefined,
              created.voucher.id,
              {
                actor: 'system:agent-crew',
                source: 'loyalty-nurture',
                queueId: created.queueId,
                userId: c.userId,
                segment: plan.segment.segment,
                status: 'PENDING_ADMIN_APPROVAL',
              },
            );
            return { created: true };
          });
          if (saved.created) approved += 1;
          else rejected += 1;
          if (i < candidates.length - 1) {
            await step.sleep(`throttle-${c.userId}`, '5s');
          }
        }

        this.logger.log(
          `✅ loyalty-nurture: ${candidates.length} users → ${approved} vouchers queued`,
        );
        return { users: candidates.length, approved, rejected };
      },
    );
  }
}
