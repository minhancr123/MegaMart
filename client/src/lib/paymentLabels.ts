/** Nhãn tiếng Việt dùng chung cho phương thức/trạng thái thanh toán & hoàn tiền. */

const PROVIDER_NAMES: Record<string, string> = {
  COD: "COD (Thanh toán khi nhận hàng)",
  OTHER: "COD (Thanh toán khi nhận hàng)",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  VNPAY: "VNPay",
  MOMO: "MoMo",
  STRIPE: "Thẻ quốc tế",
  WALLET: "Ví MegaMart",
};

export function paymentProviderName(provider?: string | null): string {
  if (!provider) return "N/A";
  return PROVIDER_NAMES[provider] || provider;
}

const PAYMENT_STATUS_NAMES: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
};

export function paymentStatusName(status?: string | null): string {
  if (!status) return "N/A";
  return PAYMENT_STATUS_NAMES[status] || status;
}

const REFUND_STATUS_NAMES: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  COMPLETED: "Hoàn tất",
};

export function refundStatusName(status?: string | null): string {
  if (!status) return "N/A";
  return REFUND_STATUS_NAMES[status] || status;
}

const REFUND_METHOD_NAMES: Record<string, string> = {
  MANUAL: "Hoàn thủ công",
  ORIGINAL_GATEWAY: "Hoàn về cổng thanh toán",
  BANK_TRANSFER: "Chuyển khoản ngân hàng",
  WALLET: "Hoàn vào Ví MegaMart (nhận ngay)",
};

export function refundMethodName(method?: string | null): string {
  if (!method) return "Hoàn thủ công";
  return REFUND_METHOD_NAMES[method] || method;
}

const REFUND_CHANNEL_NAMES: Record<string, string> = {
  WALLET: "Ví nội bộ",
  SEPAY: "SePay tự động",
  MANUAL: "Thủ công",
};

export function refundChannelName(channel?: string | null): string {
  if (!channel) return "—";
  return REFUND_CHANNEL_NAMES[String(channel).toUpperCase()] || String(channel);
}
