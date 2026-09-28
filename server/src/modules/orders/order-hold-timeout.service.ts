import {
  Injectable,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "src/prismaClient/prisma.service";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { OrdersService } from "./orders.service";
import { EmailService } from "../email/email.service";

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
    @Optional()
    @Inject(forwardRef(() => EmailService))
    private readonly emailService?: EmailService,
  ) {}

  /**
   * Nhắc thanh toán 1 lần khi đơn còn ~10-15 phút giữ hàng
   * (đơn 10-20 phút tuổi, hạn 30 phút). Dedup qua history.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async remindExpiringHolds() {
    if (!this.emailService) return;
    const now = Date.now();
    const olderThan = new Date(now - 10 * 60 * 1000);
    const youngerThan = new Date(now - 20 * 60 * 1000);
    const candidates = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lt: olderThan, gte: youngerThan },
        payments: {
          some: {
            status: PaymentStatus.PENDING,
            provider: { in: ["VNPAY", "MOMO", "STRIPE", "BANK_TRANSFER"] },
          },
        },
      },
      select: { id: true, code: true },
    });
    for (const order of candidates) {
      try {
        await this.emailService.sendPaymentReminder(order.id);
      } catch (err) {
        this.logger.warn(
          `Reminder ${order.code} failed: ${(err as Error).message}`,
        );
      }
    }
  }

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
            provider: { in: ["VNPAY", "MOMO", "STRIPE", "BANK_TRANSFER"] },
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
        this.logger.warn(
          `Failed to auto-cancel ${order.code}: ${(err as Error).message}`,
        );
      }
    }
  }
}
