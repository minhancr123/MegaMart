import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

/**
 * Tự động hủy đơn PENDING quá hạn giữ hàng (mặc định 30 phút) để giải
 * phóng tồn reserved về kho. Chỉ áp dụng đơn thanh toán online chưa trả
 * (VNPAY/MOMO/STRIPE/BANK_TRANSFER, payment PENDING) — đơn COD/OTHER giữ
 * lại cho admin xử lý tay.
 */
@Injectable()
export class OrderHoldTimeoutService {
  private readonly logger = new Logger(OrderHoldTimeoutService.name);
  private readonly HOLD_MINUTES = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseExpiredHolds() {
    const cutoff = new Date(Date.now() - this.HOLD_MINUTES * 60 * 1000);
    const expired = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lt: cutoff },
        payments: {
          some: {
            status: PaymentStatus.PENDING,
            provider: { in: ['VNPAY', 'MOMO', 'STRIPE', 'BANK_TRANSFER'] },
          },
        },
      },
      select: { id: true, code: true },
    });

    for (const order of expired) {
      try {
        await this.ordersService.cancelOrder(order.id);
        this.logger.log(`Auto-cancelled expired hold ${order.code}`);
      } catch (err) {
        this.logger.warn(`Failed to auto-cancel ${order.code}: ${(err as Error).message}`);
      }
    }
  }
}
