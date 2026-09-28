import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prismaClient/prisma.service";

export const REDEEMABLE_REWARDS = [
  {
    id: "v1",
    name: "Giảm 20.000đ",
    pointsCost: 200,
    codePrefix: "POINT20K",
    value: 20000,
    minOrder: 200000,
    type: "FIXED",
  },
  {
    id: "v2",
    name: "Giảm 50.000đ",
    pointsCost: 450,
    codePrefix: "POINT50K",
    value: 50000,
    minOrder: 500000,
    type: "FIXED",
  },
  {
    id: "v3",
    name: "Giảm 100.000đ",
    pointsCost: 850,
    codePrefix: "POINT100K",
    value: 100000,
    minOrder: 1000000,
    type: "FIXED",
  },
  {
    id: "v4",
    name: "Giảm 200.000đ",
    pointsCost: 1600,
    codePrefix: "POINT200K",
    value: 200000,
    minOrder: 2000000,
    type: "FIXED",
  },
  {
    id: "v5",
    name: "Freeship 30K",
    pointsCost: 100,
    codePrefix: "POINTSHIP",
    value: 30000,
    minOrder: 0,
    type: "FREESHIP",
  },
];

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getLoyaltySummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true, lifetimePoints: true },
    });
    if (!user) throw new HttpException("User not found", HttpStatus.NOT_FOUND);

    const transactions = await (this.prisma as any).loyaltyTransaction.findMany(
      {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    );

    const redeemedVouchers = await (
      this.prisma as any
    ).redeemedVoucher.findMany({
      where: { userId },
      include: { voucher: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      totalPoints: user.loyaltyPoints,
      lifetimePoints: user.lifetimePoints,
      transactions,
      redeemedVouchers: redeemedVouchers.map((rv: any) => ({
        ...rv,
        isUsed: rv.voucher.usedCount >= (rv.voucher.usageLimit || 1),
      })),
    };
  }

  /** Cộng điểm từ đơn hàng (Idempotent). */
  async awardOrderPoints(orderId: string, tx?: any) {
    const client = tx || this.prisma;
    const order = await client.order.findUnique({ where: { id: orderId } });
    if (!order || !order.userId) return;

    const idempotencyKey = `order-award-${orderId}`;
    const existed = await client.loyaltyTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existed) return;

    const points = Math.max(1, Math.floor(Number(order.total || 0) / 10000));

    const run = async (p: any) => {
      const user = await p.user.findUnique({
        where: { id: order.userId },
        select: { id: true, loyaltyPoints: true, lifetimePoints: true },
      });
      // User đã bị xóa: bỏ qua cộng điểm để không rollback transaction ngoài.
      if (!user) return;

      // Lấy số dư từ kết quả update (atomic) thay vì snapshot đọc trước đó.
      const updatedUser = await p.user.update({
        where: { id: user.id },
        data: {
          loyaltyPoints: { increment: points },
          lifetimePoints: { increment: points },
        },
      });
      const after = Number(updatedUser.loyaltyPoints);
      const before = after - points;

      try {
        await p.loyaltyTransaction.create({
          data: {
            userId: user.id,
            amount: points,
            type: "EARN",
            description: `Tích ${points} điểm từ đơn hàng #${order.code || orderId.slice(-8)}`,
            orderId,
            idempotencyKey,
            balanceBefore: before,
            balanceAfter: after,
          },
        });
      } catch (e: any) {
        // Race: luồng khác đã ghi idempotencyKey trước -> coi như đã cộng điểm.
        if (e?.code === "P2002") return;
        throw e;
      }
    };

    // client có thể là tx của caller (không có $transaction) -> chạy trực tiếp
    // để nhập vào transaction ngoài, giữ nguyên tử toàn bộ chuyển trạng thái.
    if (typeof client.$transaction === "function") {
      await client.$transaction(run);
    } else {
      await run(client);
    }
    this.logger.log(
      `Awarded ${points} points to user ${order.userId} for order ${orderId}`,
    );
  }

  /** Admin tặng hoặc điều chỉnh điểm. */
  async adminAdjustPoints(
    userId: string,
    amount: number,
    reason: string,
    type = "BONUS",
  ) {
    const amt = Math.round(amount);
    if (amt === 0) return;

    return await this.prisma.$transaction(async (p: any) => {
      const user = await p.user.findUnique({
        where: { id: userId },
        select: { id: true, loyaltyPoints: true, lifetimePoints: true },
      });
      if (!user) throw new NotFoundException("Không tìm thấy khách hàng");

      const before = user.loyaltyPoints;
      const after = before + amt;

      await p.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: { increment: amt },
          // Chỉ tăng lifetime nếu là cộng điểm (không giảm lifetime khi trừ điểm điều chỉnh)
          lifetimePoints: amt > 0 ? { increment: amt } : undefined,
        },
      });

      return await p.loyaltyTransaction.create({
        data: {
          userId,
          amount: amt,
          type,
          description: `[Admin] ${reason}`,
          balanceBefore: before,
          balanceAfter: after,
        },
      });
    });
  }

  /** Đổi điểm lấy voucher thật trong DB. */
  async redeemVoucher(userId: string, templateId: string) {
    const template = REDEEMABLE_REWARDS.find((r) => r.id === templateId);
    if (!template)
      throw new HttpException(
        "Phần thưởng không hợp lệ",
        HttpStatus.BAD_REQUEST,
      );

    return await this.prisma.$transaction(async (p: any) => {
      const user = await p.user.findUnique({
        where: { id: userId },
        select: { id: true, loyaltyPoints: true },
      });
      if (user.loyaltyPoints < template.pointsCost) {
        throw new HttpException(
          `Không đủ điểm (cần ${template.pointsCost}, có ${user.loyaltyPoints})`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const before = user.loyaltyPoints;
      const after = before - template.pointsCost;
      const code = `${template.codePrefix}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 1. Trừ điểm user
      await p.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: template.pointsCost } },
      });

      // 2. Ghi log transaction
      await p.loyaltyTransaction.create({
        data: {
          userId,
          amount: -template.pointsCost,
          type: "REDEEM",
          description: `Đổi phần thưởng: ${template.name}`,
          balanceBefore: before,
          balanceAfter: after,
        },
      });

      // 3. Tạo voucher thật trong DB
      const voucher = await p.voucher.create({
        data: {
          code,
          title: `Loyalty: ${template.name}`,
          description: `Đổi từ điểm thưởng MegaMart. ${template.minOrder > 0 ? `Đơn từ ${template.minOrder.toLocaleString()}đ` : ""}`,
          type: template.type,
          value: template.value,
          minOrderValue: template.minOrder,
          usageLimit: 1,
          usagePerUser: 1,
          active: true,
          assignedUserId: userId,
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
        },
      });

      // 4. Lưu liên kết đổi quà
      await p.redeemedVoucher.create({
        data: {
          userId,
          voucherId: voucher.id,
          rewardTemplateId: templateId,
          pointsCost: template.pointsCost,
          code,
          status: "ACTIVE",
        },
      });

      return {
        success: true,
        code,
        message: `Đổi thành công! Mã của bạn là ${code}`,
      };
    });
  }
}
