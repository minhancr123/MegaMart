import { Injectable } from '@nestjs/common';
import { IRefundProvider, RefundContext, RefundResult } from '../interfaces/refund-provider.interface';

/** Hoàn thủ công: đánh dấu cần admin chuyển tay (VNPay/MoMo/guest COD/fallback SePay). */
@Injectable()
export class ManualRefundProvider implements IRefundProvider {
  readonly code = 'MANUAL' as const;

  canHandle(_order: any, _request: any): boolean {
    return true; // fallback cuối cùng, kênh nào cũng nhận
  }

  async refund(ctx: RefundContext): Promise<RefundResult> {
    const { request } = ctx;
    // complete lần 1 = admin mới duyệt/ghi nhận -> giữ APPROVED chờ chuyển tay;
    // khi admin bấm complete lần 2 (đã chuyển tiền) thì router cho COMPLETED.
    const alreadyApproved = request?.status === 'APPROVED';
    if (alreadyApproved) {
      return { ok: true, status: 'COMPLETED', channel: 'MANUAL' };
    }
    return {
      ok: true,
      status: 'APPROVED',
      channel: 'MANUAL',
      failureReason: request?.failureReason || undefined,
    };
  }
}
