import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prismaClient/prisma.service";
import { CreateVoucherDto } from "./dto/create-voucher.dto";
import { VoucherType } from "@prisma/client";

@Injectable()
export class VoucherService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVoucherDto) {
    const exists = await this.prisma.voucher.findUnique({
      where: { code: dto.code },
    });
    if (exists) {
      throw new BadRequestException("Mã voucher đã tồn tại");
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        maxDiscount: dto.maxDiscount,
        minOrderValue: dto.minOrderValue,
        usageLimit: dto.usageLimit,
        usagePerUser: dto.usagePerUser,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        active: dto.active ?? true,
      },
    });

    return voucher;
  }

  async getPublicVouchers() {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        active: true,
        assignedUserId: null,
        redeemedVoucher: null,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return vouchers.filter((v: any) => {
      if (v.usageLimit && v.usedCount >= v.usageLimit) return false;
      return true;
    });
  }

  private assertUsable(voucher: any, userId?: string, subtotal?: number) {
    const now = new Date();
    if (!voucher.active)
      throw new BadRequestException("Voucher không hoạt động");
    if (voucher.startDate && now < voucher.startDate)
      throw new BadRequestException("Voucher chưa tới ngày hiệu lực");
    if (voucher.endDate && now > voucher.endDate)
      throw new BadRequestException("Voucher đã hết hạn");
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)
      throw new BadRequestException("Voucher đã hết lượt dùng");
    const ownerId = voucher.assignedUserId || voucher.redeemedVoucher?.userId;
    if (ownerId && ownerId !== userId)
      throw new BadRequestException(
        "Voucher chỉ áp dụng cho tài khoản được chỉ định",
      );
    if (
      voucher.redeemedVoucher?.status &&
      voucher.redeemedVoucher.status !== "ACTIVE"
    )
      throw new BadRequestException("Voucher đổi điểm không còn khả dụng");
    if (
      voucher.minOrderValue &&
      subtotal !== undefined &&
      subtotal < voucher.minOrderValue
    )
      throw new BadRequestException("Đơn hàng chưa đạt giá trị tối thiểu");
    return true;
  }

  private calcDiscount(voucher: any, subtotal: number) {
    if (!subtotal || subtotal <= 0) return 0;
    if (voucher.type === VoucherType.FIXED)
      return Math.min(voucher.value, subtotal);
    if (voucher.type === VoucherType.PERCENT) {
      const raw = Math.floor((voucher.value / 100) * subtotal);
      return voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw;
    }
    if (voucher.type === VoucherType.FREESHIP) {
      // For now treat freeship as a fixed discount (shipping) caller can apply.
      return voucher.value || 0;
    }
    return 0;
  }

  async validate(
    code: string,
    userId: string | undefined,
    subtotal: number | undefined,
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const voucher = await client.voucher.findUnique({
      where: { code },
      include: { redeemedVoucher: true },
    });
    if (!voucher) throw new NotFoundException("Không tìm thấy voucher");

    this.assertUsable(voucher, userId, subtotal);

    if (userId && voucher.usagePerUser) {
      const used = await client.voucherUsage.count({
        where: { voucherId: voucher.id, userId },
      });
      if (used >= voucher.usagePerUser)
        throw new BadRequestException("Bạn đã dùng hết lượt voucher này");
    }

    const discount = this.calcDiscount(voucher, subtotal || 0);
    return { voucher, discount };
  }

  async getUserAvailableVouchers(userId: string) {
    const now = new Date();
    const vouchers = await this.prisma.voucher.findMany({
      where: {
        active: true,
        OR: [
          { assignedUserId: userId },
          { redeemedVoucher: { is: { userId, status: { not: "USED" } } } },
        ],
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      } as any,
      orderBy: { createdAt: "desc" },
      include: {
        usages: { where: { userId } },
        redeemedVoucher: true,
        _count: { select: { usages: true } },
      },
    } as any);
    return vouchers.filter((v: any) => {
      if (v.redeemedVoucher?.status && v.redeemedVoucher.status !== "ACTIVE")
        return false;
      if (v.usageLimit && v.usedCount >= v.usageLimit) return false;
      if (v.usagePerUser && (v.usages?.length || 0) >= v.usagePerUser)
        return false;
      return true;
    });
  }

  async getAssignedVouchers(userId: string) {
    return this.prisma.voucher.findMany({
      where: {
        OR: [
          { assignedUserId: userId },
          { usages: { some: { userId } } },
          { redeemedVoucher: { is: { userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        usages: {
          where: { userId },
          orderBy: { usedAt: "desc" },
          include: {
            order: {
              select: { id: true, code: true, status: true, total: true },
            },
          },
        },
        redeemedVoucher: true,
        _count: { select: { usages: true } },
      },
    } as any);
  }

  async consume(
    code: string,
    userId: string | undefined,
    orderId: string | undefined,
    subtotal: number,
    tx?: any,
  ) {
    if (!userId)
      throw new BadRequestException("Vui lòng đăng nhập để sử dụng voucher");
    const { voucher, discount } = await this.validate(
      code,
      userId,
      subtotal,
      tx,
    );
    const client = tx || this.prisma;

    await client.voucher.update({
      where: { id: voucher.id },
      data: { usedCount: { increment: 1 } },
    });
    await client.voucherUsage.create({
      data: {
        voucherId: voucher.id,
        userId,
        orderId,
      },
    });
    if (voucher.redeemedVoucher?.id) {
      await client.redeemedVoucher.update({
        where: { id: voucher.redeemedVoucher.id },
        data: { status: "USED" },
      });
    }

    return { voucher, discount };
  }

  /**
   * Hoàn voucher đã consume cho đơn hàng (khi hủy/thất bại đơn) để khách
   * đặt lại được. Idempotent: đơn không dùng voucher hoặc đã hoàn thì no-op.
   */
  async release(orderId: string, tx?: any) {
    const client = tx || this.prisma;
    const usages = await client.voucherUsage.findMany({
      where: { orderId },
      include: { voucher: { include: { redeemedVoucher: true } } },
    });
    if (usages.length === 0) return { released: 0 };

    let released = 0;
    for (const u of usages) {
      // Giảm usedCount nhưng không để âm (atomic ở tầng SQL)
      await client.voucher.updateMany({
        where: { id: u.voucherId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
      await client.voucherUsage.delete({ where: { id: u.id } });
      const redeemed = u.voucher?.redeemedVoucher;
      if (redeemed && redeemed.status === "USED") {
        const endDate = u.voucher?.endDate;
        await client.redeemedVoucher.update({
          where: { id: redeemed.id },
          data: {
            status:
              endDate && new Date() > new Date(endDate) ? "EXPIRED" : "ACTIVE",
          },
        });
      }
      released++;
    }
    return { released };
  }
}
