import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from "@nestjs/common";
import {
  AuditAction,
  AuditEntity,
  AuditLogService,
} from "../audit-log/audit-log.service";
import { PrismaService } from "../../prismaClient/prisma.service";
import { EmailService } from "../email/email.service";

/**
 * Admin duyệt hàng chờ nuôi dưỡng loyalty do agent tạo.
 * - approve: queue → APPROVED + bật voucher (active:true) + gửi mail best-effort.
 * - reject: queue → REJECTED, voucher giữ nguyên inactive.
 */
@Injectable()
export class LoyaltyNurtureAdminService {
  private readonly logger = new Logger(LoyaltyNurtureAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    @Optional()
    @Inject(forwardRef(() => EmailService))
    private readonly emailService?: EmailService,
  ) {}

  listQueue(status?: string) {
    const allowed = ["PENDING", "APPROVED", "SENT", "REJECTED"];
    // Status lạ → 400 rõ ràng thay vì âm thầm trả tất cả (bẫy UI admin).
    const normalized = status?.trim().toUpperCase();
    if (normalized && !allowed.includes(normalized)) {
      throw new BadRequestException(`status phải thuộc: ${allowed.join(", ")}`);
    }
    const where = normalized ? { status: normalized } : undefined;
    return this.prisma.loyaltyNurtureQueue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        segment: true,
        message: true,
        status: true,
        approvedAt: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true } },
        voucher: {
          select: {
            id: true,
            code: true,
            value: true,
            minOrderValue: true,
            endDate: true,
            active: true,
          },
        },
      },
    });
  }

  async approve(id: string, adminId: string) {
    const row = await this.prisma.loyaltyNurtureQueue.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        voucherId: true,
        segment: true,
        message: true,
        voucher: {
          select: { id: true, code: true, value: true, active: true },
        },
        user: { select: { email: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException("Không tìm thấy hàng chờ");
    if (row.status !== "PENDING") {
      throw new BadRequestException(`Hàng chờ đã ở trạng thái ${row.status}`);
    }

    const now = new Date();
    // updateMany có điều kiện status PENDING: 2 admin bấm cùng lúc thì chỉ
    // 1 request đổi được (count=1), request còn lại nhận Conflict → không mail trùng.
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.loyaltyNurtureQueue.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", approvedAt: now },
      });
      if (r.count === 0) {
        throw new ConflictException(
          "Hàng chờ đã được xử lý bởi người khác (không còn PENDING)",
        );
      }
      // Bật voucher đúng lúc duyệt (lúc tạo job để active:false).
      if (row.voucherId) {
        await tx.voucher.update({
          where: { id: row.voucherId },
          data: { active: true },
        });
      }
      return true;
    });

    // Gửi mail best-effort: lỗi mail không rollback quyết định duyệt.
    let mailed = false;
    if (row.user?.email && row.voucher) {
      try {
        await this.sendVoucherMail(
          row.user.email,
          row.user.name,
          row.voucher.code,
          row.voucher.value,
          row.message,
        );
        mailed = true;
      } catch (e) {
        this.logger.warn(
          `Gửi mail voucher ${row.voucher.code} thất bại: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    await this.audit.log(
      AuditAction.USER_UPDATE,
      AuditEntity.USER,
      adminId,
      row.userId,
      {
        actor: "admin",
        source: "loyalty-nurture-approve",
        queueId: id,
        voucherCode: row.voucher?.code,
        mailed,
      },
    );
    return { id, status: "APPROVED", voucherCode: row.voucher?.code, mailed };
  }

  async reject(id: string, adminId: string, note?: string) {
    const row = await this.prisma.loyaltyNurtureQueue.findUnique({
      where: { id },
      select: { id: true, status: true, userId: true },
    });
    if (!row) throw new NotFoundException("Không tìm thấy hàng chờ");
    if (row.status !== "PENDING") {
      throw new BadRequestException(`Hàng chờ đã ở trạng thái ${row.status}`);
    }
    await this.prisma.loyaltyNurtureQueue.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    await this.audit.log(
      AuditAction.USER_UPDATE,
      AuditEntity.USER,
      adminId,
      row.userId,
      {
        actor: "admin",
        source: "loyalty-nurture-reject",
        queueId: id,
        note: note ?? null,
      },
    );
    return { id, status: "REJECTED" };
  }

  private async sendVoucherMail(
    to: string,
    name: string | null | undefined,
    code: string,
    value: number,
    message: string,
  ): Promise<void> {
    const voucher: any = { code, type: "FIXED", value };
    const ok = await this.emailService?.sendVoucher(to, name, voucher, message);
    if (!ok) throw new Error("Gửi mail voucher thất bại");
  }
}
