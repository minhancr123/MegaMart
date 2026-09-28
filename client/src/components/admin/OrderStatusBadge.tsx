import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

interface StatusConfig {
  label: string;
  tone: BadgeTone;
}

/**
 * Map trạng thái đơn hàng -> nhãn tiếng Việt + tone màu theo design system Stitch.
 * Dùng chung cho trang danh sách và trang chi tiết đơn hàng.
 */
export const ORDER_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: { label: "Chờ xử lý", tone: "warning" },
  CONFIRMED: { label: "Đã xác nhận", tone: "info" },
  PROCESSING: { label: "Đang xử lý", tone: "info" },
  SHIPPING: { label: "Đang giao hàng", tone: "info" },
  DELIVERED: { label: "Đã giao", tone: "success" },
  COMPLETED: { label: "Hoàn thành", tone: "success" },
  PAID: { label: "Đã thanh toán", tone: "success" },
  CANCELED: { label: "Đã hủy", tone: "destructive" },
  FAILED: { label: "Thất bại", tone: "destructive" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "secondary" },
};

export function getOrderStatusConfig(status: string): StatusConfig {
  return ORDER_STATUS_CONFIG[status] ?? { label: status, tone: "secondary" };
}

/**
 * Map trạng thái THANH TOÁN (Payment.status) -> nhãn + tone.
 * Tách riêng vì PENDING của payment nghĩa là "Chưa thanh toán",
 * không phải "Chờ xử lý" như trạng thái đơn hàng.
 */
export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  PENDING: { label: "Chưa thanh toán", tone: "warning" },
  PAID: { label: "Đã thanh toán", tone: "success" },
  FAILED: { label: "Thất bại", tone: "destructive" },
  REFUNDED: { label: "Đã hoàn tiền", tone: "secondary" },
};

export function getPaymentStatusConfig(status?: string | null): StatusConfig {
  if (!status) return { label: "—", tone: "secondary" };
  return PAYMENT_STATUS_CONFIG[status] ?? { label: status, tone: "secondary" };
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  const config = getPaymentStatusConfig(status);
  return (
    <Badge variant={config.tone} className={cn(className)}>
      {config.label}
    </Badge>
  );
}

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = getOrderStatusConfig(status);
  return (
    <Badge variant={config.tone} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
