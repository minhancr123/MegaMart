import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';

/**
 * WalletService — ví nội bộ MegaMart.
 * Mọi thao tác cộng/trừ đều chạy trong Prisma transaction + idempotency
 * qua WalletTransaction.refundRequestId (@unique).
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Đảm bảo user luôn có ví (tạo lười). Chấp nhận tx để dùng chung transaction. */
  async getOrCreateWallet(userId: string, tx?: any) {
    if (!userId) {
      throw new HttpException({ success: false, message: 'Không xác định được người dùng ví' }, HttpStatus.UNAUTHORIZED);
    }
    const client = tx || this.prisma;
    let wallet = await client.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      try {
        wallet = await client.wallet.create({
          data: { userId, balance: BigInt(0), currency: 'VND', status: 'ACTIVE' },
        });
      } catch {
        // Race: 2 request tạo cùng lúc -> đọc lại
        wallet = await client.wallet.findUnique({ where: { userId } });
      }
    }
    if (!wallet) throw new HttpException({ success: false, message: 'Không tạo được ví' }, HttpStatus.INTERNAL_SERVER_ERROR);
    if ((wallet as any).status === 'LOCKED') {
      throw new HttpException({ success: false, message: 'Ví đang bị khóa, liên hệ CSKH' }, HttpStatus.FORBIDDEN);
    }
    return wallet;
  }

  /** Cộng tiền ví (hoàn tiền). Idempotent theo refundRequestId. */
  async credit(
    userId: string,
    amount: number | bigint,
    refundRequestId?: string,
    type = 'REFUND',
    description?: string,
    orderId?: string,
    tx?: any,
  ) {
    const amt = BigInt(Math.max(0, Math.round(Number(amount))));
    if (amt <= 0n) throw new HttpException({ success: false, message: 'Số tiền cộng ví không hợp lệ' }, HttpStatus.BAD_REQUEST);

    const run = async (client: any) => {
      // Idempotency: đã có transaction cho refundRequest này -> trả về luôn, không cộng lần 2
      if (refundRequestId) {
        const existed = await client.walletTransaction.findUnique({ where: { refundRequestId } }).catch(() => null);
        if (existed) return existed;
      }
      const wallet = await this.getOrCreateWallet(userId, client);
      const before = BigInt((wallet as any).balance || 0);
      const after = before + amt;
      await client.wallet.update({ where: { id: (wallet as any).id }, data: { balance: after } });
      try {
        return await client.walletTransaction.create({
          data: {
            walletId: (wallet as any).id,
            type,
            amount: amt,
            balanceBefore: before,
            balanceAfter: after,
            orderId: orderId || null,
            refundRequestId: refundRequestId || null,
            description: (description || `Hoàn tiền ${amt}₫`).slice(0, 2000),
          },
        });
      } catch (e: any) {
        // Unique constraint refundRequestId -> request retry/click đúp: đọc lại record cũ
        if (refundRequestId && String(e?.code) === 'P2002') {
          return client.walletTransaction.findUnique({ where: { refundRequestId } });
        }
        throw e;
      }
    };

    if (tx) return run(tx);
    return (this.prisma as any).$transaction((client: any) => run(client));
  }

  /** Trừ tiền ví khi checkout. Kiểm tra số dư khả dụng, atomic. */
  async debit(
    userId: string,
    amount: number | bigint,
    orderId?: string,
    type = 'PAYMENT',
    description?: string,
    tx?: any,
  ) {
    const amt = BigInt(Math.max(0, Math.round(Number(amount))));
    if (amt <= 0n) throw new HttpException({ success: false, message: 'Số tiền trừ ví không hợp lệ' }, HttpStatus.BAD_REQUEST);

    const run = async (client: any) => {
      const wallet = await this.getOrCreateWallet(userId, client);
      const before = BigInt((wallet as any).balance || 0);
      if (before < amt) {
        throw new HttpException(
          { success: false, message: `Số dư ví không đủ (khả dụng ${before}₫, cần ${amt}₫)` },
          HttpStatus.BAD_REQUEST,
        );
      }
      const after = before - amt;
      // Optimistic lock: chỉ trừ khi balance chưa đổi bởi luồng khác
      const locked = await client.wallet.updateMany({
        where: { id: (wallet as any).id, balance: before },
        data: { balance: after },
      });
      if (locked.count !== 1) {
        throw new HttpException({ success: false, message: 'Ví vừa thay đổi, vui lòng thử lại' }, HttpStatus.CONFLICT);
      }
      return client.walletTransaction.create({
        data: {
          walletId: (wallet as any).id,
          type,
          amount: amt,
          balanceBefore: before,
          balanceAfter: after,
          orderId: orderId || null,
          description: (description || `Thanh toán đơn hàng ${amt}₫`).slice(0, 2000),
        },
      });
    };

    if (tx) return run(tx);
    return (this.prisma as any).$transaction((client: any) => run(client));
  }

  /** Lấy số dư + lịch sử biến động cho client /profile/wallet. */
  async getWalletByUserId(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await (this.prisma as any).walletTransaction.findMany({
      where: { walletId: (wallet as any).id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      ...wallet,
      balance: Number((wallet as any).balance || 0),
      transactions: (transactions || []).map((t: any) => ({
        ...t,
        amount: Number(t.amount || 0),
        balanceBefore: Number(t.balanceBefore || 0),
        balanceAfter: Number(t.balanceAfter || 0),
      })),
    };
  }
}
