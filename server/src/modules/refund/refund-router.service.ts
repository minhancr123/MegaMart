import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prismaClient/prisma.service";
import { WalletRefundProvider } from "./providers/wallet-refund.provider";
import { SepayRefundProvider } from "./providers/sepay-refund.provider";
import { ManualRefundProvider } from "./providers/manual-refund.provider";
import {
  RefundChannel,
  RefundResult,
} from "./interfaces/refund-provider.interface";

/**
 * Quy tắc định tuyến:
 * - Guest (order.userId null) -> MANUAL (không có ví).
 * - method/channel WALLET (khách chọn hoàn vào ví) + có userId -> WALLET.
 * - COD có userId -> WALLET (tiền mặt đã thu qua shipper, hoàn ngay vào ví).
 * - BANK_TRANSFER -> SEPAY -> fallback MANUAL khi 422/off/missing origin tx.
 * - VNPay/MoMo/còn lại -> MANUAL.
 */
@Injectable()
export class RefundRouterService {
  private readonly logger = new Logger(RefundRouterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletProvider: WalletRefundProvider,
    private readonly sepayProvider: SepayRefundProvider,
    private readonly manualProvider: ManualRefundProvider,
  ) {}

  pickChannel(order: any, request: any): RefundChannel {
    if (!order?.userId) return "MANUAL";
    const method = String(
      request?.method || request?.channel || "",
    ).toUpperCase();
    if (method === "WALLET") return "WALLET";
    const providers = (order?.payments || []).map((p: any) =>
      String(p?.provider),
    );
    if (providers.includes("BANK_TRANSFER")) return "SEPAY";
    if (providers.includes("WALLET")) return "WALLET";
    if (providers.includes("COD")) return "WALLET";
    return "MANUAL";
  }

  /** Thực thi hoàn tiền theo kênh, persist kết quả lên RefundRequest. Chỉ COMPLETED mới cộng sổ ở orders.service. */
  async processRefund(
    request: any,
    orderWithPayments: any,
  ): Promise<RefundResult> {
    const channel =
      request?.channel || this.pickChannel(orderWithPayments, request);
    const ctx = {
      request,
      order: orderWithPayments,
      payments: orderWithPayments?.payments || [],
    };

    let result: RefundResult;
    if (channel === "WALLET" && orderWithPayments?.userId) {
      result = await this.walletProvider.refund({
        ...ctx,
        request: { ...request, channel },
      });
    } else if (channel === "SEPAY") {
      result = await this.sepayProvider.refund({
        ...ctx,
        request: { ...request, channel },
      });
    } else {
      // MANUAL: nếu request đã APPROVED nghĩa là admin xác nhận đã chuyển tay -> COMPLETED
      result = await this.manualProvider.refund({
        ...ctx,
        request: { ...request, channel: "MANUAL" },
      });
    }

    // Fallback SePay -> MANUAL: giữ APPROVED + ghi failureReason để admin chuyển tay
    const finalChannel = result.needsManualFallback ? "MANUAL" : result.channel;
    const finalStatus = result.needsManualFallback ? "APPROVED" : result.status;

    await (this.prisma as any).refundRequest
      .update({
        where: { id: request.id },
        data: {
          channel: finalChannel,
          status: finalStatus,
          externalRefundId: result.externalRefundId || undefined,
          failureReason: result.failureReason || undefined,
          rawResponse: result.rawResponse ?? undefined,
        },
      })
      .catch((e: any) =>
        this.logger.warn(
          `Persist refund result failed ${request.id}: ${e?.message}`,
        ),
      );

    return {
      ...result,
      channel: finalChannel,
      status: finalStatus,
    };
  }
}
