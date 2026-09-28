/** Interface chuẩn cho mọi kênh hoàn tiền. */
export type RefundChannel = "WALLET" | "SEPAY" | "MANUAL";

export interface RefundContext {
  request: any;
  order: any;
  payments: any[];
}

export interface RefundResult {
  ok: boolean;
  /** COMPLETED: tiền đã về / ví đã cộng. APPROVED: chờ xử lý tay. FAILED: lỗi hẳn. */
  status: "COMPLETED" | "APPROVED" | "FAILED";
  channel: RefundChannel;
  /** true khi SePay lỗi -> cần fallback sang MANUAL mà không văng 500. */
  needsManualFallback?: boolean;
  externalRefundId?: string;
  failureReason?: string;
  rawResponse?: any;
}

export interface IRefundProvider {
  readonly code: RefundChannel;
  canHandle(order: any, request: any): boolean;
  refund(ctx: RefundContext): Promise<RefundResult>;
}
