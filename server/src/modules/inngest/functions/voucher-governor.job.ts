import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditEntity, AuditLogService } from '../../audit-log/audit-log.service';
import { PrismaService } from '../../../prismaClient/prisma.service';
import { VoucherGovernorService } from '../../agent/voucher-governor.workflow';
import type { VoucherSummary } from '../../agent/nodes/voucher-governor.nodes';
import { daysToExpiry, isExpired } from './job-guards';
import { inngest } from '../inngest.client';
import { InngestRegistryService } from '../inngest-registry.service';
import { getJobRuntime } from '../agent-job-runtime';
import { isJobEnabled } from '../job-flags';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Durable job: 03:45 VN hàng ngày quét voucher → crew kiểm toán → tự tắt
 * voucher hết hạn/hết quota + ghi đề xuất (gia hạn/thêm quota/thu hồi)
 * vào audit để admin duyệt tay. KHÔNG BAO GIỜ tự thu hồi voucher đang dùng.
 */
@Injectable()
export class VoucherGovernorJob {
  private readonly logger = new Logger(VoucherGovernorJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly governor: VoucherGovernorService,
    private readonly audit: AuditLogService,
    registry: InngestRegistryService,
  ) {
    // Công tắc env: tắt thì không đăng ký (cron không bắn). Đổi env phải restart.
    if (isJobEnabled('JOB_VOUCHER_GOVERNANCE')) {
      registry.register(this.buildFunction());
    }
  }

  private buildFunction() {
    return inngest.createFunction(
      {
        id: 'voucher-governance',
        name: 'Voucher Governance (daily)',
        retries: 2,
        // 1 run tại 1 thời điểm: chống trigger đè gây trùng unique/audit đôi.
        concurrency: { limit: 1 },
        triggers: [{ cron: '45 20 * * *' }],
      },
      async ({ step }) => {
        // Step 0 — công tắc runtime (env boot + UI admin): tắt thì thoát
        // ngay, 0 token. Đổi trên UI có hiệu lực ngay kỳ cron tới.
        const runtime = await getJobRuntime(this.prisma, 'voucher-governance');
        if (!runtime.enabled) {
          this.logger.log('⏸️ voucher-governance đang tắt — bỏ qua kỳ này.');
          return { skipped: true };
        }
        // Step 1 — snapshot voucher active + tín hiệu lạm dụng (JSON-safe).
        const summaries = await step.run(
          'fetch-active-vouchers',
          async (): Promise<VoucherSummary[]> => {
            const now = new Date();
            const vouchers = await this.prisma.voucher.findMany({
              where: { active: true },
              select: {
                id: true,
                code: true,
                type: true,
                value: true,
                maxDiscount: true,
                minOrderValue: true,
                usageLimit: true,
                usagePerUser: true,
                usedCount: true,
                endDate: true,
                createdAt: true,
              },
            });
            const usage = await this.prisma.voucherUsage.groupBy({
              by: ['voucherId', 'userId'],
              // Chỉ quét voucher đang active (bảng history phình theo thời gian).
              where: { voucherId: { in: vouchers.map((v) => v.id) } },
              _count: { _all: true },
            });
            const idToCode = new Map(vouchers.map((v) => [v.id, v.code]));
            // usagePerUser null = KHÔNG giới hạn lượt/user → bỏ qua check
            // (fallback 1 sẽ gắn cờ oan mọi khách mua từ lần 2).
            const limitOf = new Map(
              vouchers.map((v) => [v.code, v.usagePerUser]),
            );
            const byVoucher = new Map<string, { userId: string; count: number }[]>();
            for (const u of usage) {
              const code = idToCode.get(u.voucherId);
              if (!code) continue;
              const perUser = limitOf.get(code);
              if (perUser == null) continue; // unlimited → không check lạm dụng
              const allowed = Math.max(perUser, 1);
              if (u._count._all > allowed) {
                const arr = byVoucher.get(code) ?? [];
                arr.push({ userId: u.userId, count: u._count._all });
                byVoucher.set(code, arr);
              }
            }
            return vouchers.map((v) => ({
              code: v.code,
              type: String(v.type),
              value: v.value,
              maxDiscount: v.maxDiscount,
              minOrderValue: v.minOrderValue,
              usageLimit: v.usageLimit,
              usagePerUser: v.usagePerUser,
              usedCount: v.usedCount,
              daysToExpiry: v.endDate ? daysToExpiry(v.endDate, now) : null,
              isExpired: isExpired(v.endDate, now),
              ageDays: Math.floor(
                (now.getTime() - v.createdAt.getTime()) / DAY_MS,
              ),
              exhausted:
                v.usageLimit != null && v.usedCount >= v.usageLimit,
              abusers: byVoucher.get(v.code) ?? [],
            }));
          },
        );

        if (summaries.length === 0) {
          return { checked: 0, autoDeactivated: 0, proposals: 0, rejected: 0 };
        }

        // Step 2 — crew kiểm toán (3 LLM calls).
        const verdict = await step.run('run-crew', () =>
          this.governor.runGovernance(summaries),
        );

        // Step 3 — thi hành phần an toàn + ghi đề xuất.
        const applied = await step.run('apply', async () => {
          const now = new Date();
          // Lưới an toàn bằng code: chỉ tắt voucher HẾT HẠN hoặc HẾT QUOTA,
          // bất kể LLM đề xuất gì.
          const candidates = new Map(
            summaries.map((s) => [s.code, s]),
          );
          const safeCodes = verdict.approvedAuto
            .map((a) => a.code)
            .filter((code) => {
              const s = candidates.get(code);
              if (!s) return false;
              return s.isExpired || s.exhausted;
            });
          let autoDeactivated = 0;
          if (safeCodes.length > 0) {
            const r = await this.prisma.voucher.updateMany({
              where: { code: { in: safeCodes }, active: true },
              data: { active: false },
            });
            autoDeactivated = r.count;
          }
          const actionable = verdict.proposals.filter(
            (x) => x.action !== 'none',
          );
          for (const p of actionable) {
            await this.audit.log(
              AuditAction.VOUCHER_GOVERNANCE_PROPOSAL,
              AuditEntity.VOUCHER,
              undefined,
              p.code,
              {
                actor: 'system:agent-crew',
                source: 'voucher-governance',
                action: p.action,
                params: p.params,
                reason: p.reason,
                status: 'PENDING_ADMIN_REVIEW',
              },
            );
          }
          this.logger.log(
            `✅ voucher-governance: ${summaries.length} checked, ${autoDeactivated} auto-off, ${actionable.length} proposals`,
          );
          return {
            autoDeactivated,
            proposals: actionable.length,
            rejected: verdict.rejected.length,
          };
        });

        return { checked: summaries.length, ...applied };
      },
    );
  }
}
