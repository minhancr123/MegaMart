import { Injectable, Logger } from "@nestjs/common";
import { WalletService } from "../../wallet/wallet.service";
import {
  IRefundProvider,
  RefundContext,
  RefundResult,
} from "../interfaces/refund-provider.interface";

/**
 * Hoàn vào ví nội bộ: cộng tiền atomic + idempotency theo refundRequestId.
 * Dùng cho đơn COD, đơn trả bằng ví, hoặc khách chọn "hoàn vào ví (nhận ngay)".
 */
@Injectable()
export class WalletRefundProvider implements IRefundProvider {
  readonly code = "WALLET" as const;
  private readonly logger = new Logger(WalletRefundProvider.name);

  constructor(private readonly walletService: WalletService) {}

  canHandle(order: any, _request: any): boolean {
    // Guest checkout (userId null) không có ví -> bỏ qua
    return !!order?.userId;
  }

  async refund(ctx: RefundContext): Promise<RefundResult> {
    const { request, order } = ctx;
    if (!order?.userId) {
      return {
        ok: false,
        status: "APPROVED",
        channel: "MANUAL",
        needsManualFallback: true,
        failureReason:
          "Đơn khách vãng lai không có ví, chuyển sang hoàn thủ công",
      };
    }
    try {
      const tx = await this.walletService.credit(
        order.userId,
        Number(request.amount || 0),
        request.id,
        "REFUND",
        `Hoàn tiền đơn ${order.code}: ${(request.reason || "").slice(0, 200)}`,
        order.id,
      );
      return {
        ok: true,
        status: "COMPLETED",
        channel: "WALLET",
        externalRefundId: tx?.id,
        rawResponse: { walletTransactionId: tx?.id },
      };
    } catch (e: any) {
      this.logger.warn(`Wallet refund failed ${request.id}: ${e?.message}`);
      return {
        ok: false,
        status: "FAILED",
        channel: "WALLET",
        failureReason: e?.message || "Cộng ví thất bại",
      };
    }
  }
}
