import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntity, AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../../prismaClient/prisma.service';

export interface GovernanceProposal {
  auditId: string;
  code: string;
  action: 'extend' | 'add_quota' | 'lower_min' | 'close_proposal';
  params: Record<string, number>;
  reason: string;
  createdAt: Date;
  applied: boolean;
}

function parseDetail(raw: unknown): Record<string, any> | null {
  try {
    if (typeof raw === 'string') return JSON.parse(raw);
    if (raw && typeof raw === 'object') return raw as Record<string, any>;
    return null;
  } catch {
    return null;
  }
}

/**
 * Admin áp dụng đề xuất governance do agent ghi vào AuditLog.
 * Mỗi đề xuất chỉ áp dụng 1 lần (check audit VOUCHER_UPDATE tham chiếu).
 * Mọi cập nhật đều clamp lại bằng code.
 */
@Injectable()
export class VoucherGovernanceService {
  private readonly logger = new Logger(VoucherGovernanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async listProposals(): Promise<GovernanceProposal[]> {
    const [proposals, appliedMarks] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: AuditAction.VOUCHER_GOVERNANCE_PROPOSAL },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: { id: true, entityId: true, oldData: true, createdAt: true },
      }),
      this.prisma.auditLog.findMany({
        where: { action: AuditAction.VOUCHER_UPDATE },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { oldData: true },
      }),
    ]);
    const applied = new Set<string>();
    for (const a of appliedMarks) {
      const d = parseDetail(a.oldData);
      if (d?.proposalAuditId) applied.add(String(d.proposalAuditId));
    }
    const out: GovernanceProposal[] = [];
    for (const p of proposals) {
      const d = parseDetail(p.oldData);
      if (!d || d.status !== 'PENDING_ADMIN_REVIEW') continue;
      if (!['extend', 'add_quota', 'lower_min', 'close_proposal'].includes(d.action)) {
        continue;
      }
      out.push({
        auditId: p.id,
        code: String(d.code ?? p.entityId),
        action: d.action,
        params:
          d.params && typeof d.params === 'object' ? d.params : {},
        reason: String(d.reason ?? ''),
        createdAt: p.createdAt,
        applied: applied.has(p.id),
      });
    }
    return out;
  }

  async applyProposal(auditId: string, adminId: string) {
    const found = (await this.listProposals()).find(
      (p) => p.auditId === auditId,
    );
    if (!found) throw new NotFoundException('Không tìm thấy đề xuất');
    if (found.applied) {
      return { auditId, applied: false, reason: 'ALREADY_APPLIED' };
    }
    const voucher = await this.prisma.voucher.findUnique({
      where: { code: found.code },
    });
    if (!voucher) throw new NotFoundException('Voucher không còn tồn tại');

    const before = {
      endDate: voucher.endDate,
      usageLimit: voucher.usageLimit,
      minOrderValue: voucher.minOrderValue,
      active: voucher.active,
      updatedAt: voucher.updatedAt,
    };
    const data: Record<string, unknown> = {};
    if (found.action === 'extend') {
      const days = Math.min(Math.max(Math.floor(found.params.days ?? 0), 1), 14);
      const base = voucher.endDate && voucher.endDate > new Date() ? voucher.endDate : new Date();
      data.endDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    } else if (found.action === 'add_quota') {
      if (voucher.usageLimit == null) {
        throw new BadRequestException(
          'Voucher không giới hạn lượt dùng — không cần thêm quota',
        );
      }
      const add = Math.min(Math.max(Math.floor(found.params.addQuota ?? 0), 1), 1000);
      data.usageLimit = voucher.usageLimit + add;
    } else if (found.action === 'lower_min') {
      if (voucher.minOrderValue == null) {
        throw new BadRequestException(
          'Voucher không giới hạn đơn tối thiểu — không thể hạ thêm',
        );
      }
      const want = Math.max(Math.floor(found.params.newMin ?? 0), 100000);
      if (!(want < voucher.minOrderValue)) {
        throw new BadRequestException(
          `Giá trị mới (${want}) phải thấp hơn hiện tại (${voucher.minOrderValue}) — đề xuất này làm TĂNG điều kiện, từ chối`,
        );
      }
      data.minOrderValue = want;
    } else {
      // close_proposal: admin bấm duyệt = đồng ý thu hồi (quyết định của người).
      data.active = false;
    }

    // Optimistic lock bằng updatedAt: 2 admin apply cùng lúc thì chỉ 1 qua
    // (người còn lại nhận CONCURRENT_MODIFICATION thay vì cộng dồn quota/hạn).
    const applied = await this.prisma.voucher.updateMany({
      where: { code: found.code, updatedAt: voucher.updatedAt },
      data,
    });
    if (applied.count === 0) {
      throw new ConflictException(
        'Voucher vừa bị thay đổi bởi người khác — tải lại đề xuất rồi thử lại',
      );
    }
    const updated = { id: voucher.id, code: voucher.code };
    await this.audit.log(
      AuditAction.VOUCHER_UPDATE,
      AuditEntity.VOUCHER,
      adminId,
      updated.id,
      {
        actor: 'admin',
        source: 'governance-apply',
        proposalAuditId: auditId,
        action: found.action,
        before: {
          endDate: before.endDate,
          usageLimit: before.usageLimit,
          minOrderValue: before.minOrderValue,
          active: before.active,
        },
        after: data,
      },
    );
    this.logger.log(
      `✅ governance apply: ${found.code} ${found.action} bởi ${adminId}`,
    );
    return { auditId, applied: true, code: updated.code, changes: data };
  }
}
