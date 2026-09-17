import { OrderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * Valid order status transitions
 * Each status can only transition to specific next statuses
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Chờ xác nhận -> Có thể xác nhận, hủy, hoặc thanh toán thất bại
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED, OrderStatus.FAILED],
  
  // Đã xác nhận -> Đang xử lý hoặc hủy
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELED],
  
  // Đang xử lý -> Đang giao hoặc hủy
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING, OrderStatus.CANCELED],
  
  // Đang giao -> Đã giao hoặc thất bại
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  
  // Đã giao -> Hoàn thành hoặc hoàn tiền
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
  
  // Hoàn thành -> Có thể hoàn tiền nếu có vấn đề
  [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
  
  // Đã thanh toán (legacy) -> Xác nhận
  [OrderStatus.PAID]: [OrderStatus.CONFIRMED],
  
  // Thất bại (giao thất bại/thất lạc/hư hỏng) -> Có thể thử lại, hủy, hoặc hoàn tiền
  [OrderStatus.FAILED]: [OrderStatus.PENDING, OrderStatus.CANCELED, OrderStatus.REFUNDED],
  
  // Terminal states - không thể chuyển đi đâu nữa
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CANCELED]: [],
};

/**
 * Statuses that require stock restoration when reached
 */
export const REQUIRE_STOCK_RESTORE = [
  OrderStatus.CANCELED,
  OrderStatus.REFUNDED,
  OrderStatus.FAILED
];

/**
 * Đơn ở các trạng thái này vẫn đang GIỮ hàng (reservation còn hiệu lực,
 * On Hand chưa trừ). Hủy/thất bại từ đây -> chỉ xả reserved.
 */
export const PRE_FULFILLMENT_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.PAID,
];

/**
 * Hủy/thất bại khi đơn chưa xuất kho -> chỉ giải phóng reserved,
 * KHÔNG cộng On Hand (vì lúc tạo đơn chưa từng trừ On Hand).
 */
export function shouldReleaseReservation(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  const isTerminal = toStatus === OrderStatus.CANCELED || toStatus === OrderStatus.FAILED;
  return isTerminal && (PRE_FULFILLMENT_STATUSES as readonly OrderStatus[]).includes(fromStatus);
}

/**
 * Hủy/thất bại sau khi đã xuất kho, hoặc hoàn tiền -> cộng lại On Hand.
 * Đơn đã FAILED thì reservation đã được xử lý ở bước vào FAILED nên
 * FAILED -> CANCELED không động đến kho nữa (tránh cộng trùng 2 lần).
 */
export function shouldRestoreOnHand(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
  if (fromStatus === OrderStatus.FAILED) return false;
  if (toStatus === OrderStatus.REFUNDED) return true;
  const isTerminal = toStatus === OrderStatus.CANCELED || toStatus === OrderStatus.FAILED;
  return isTerminal && !(PRE_FULFILLMENT_STATUSES as readonly OrderStatus[]).includes(fromStatus);
}

/**
 * Statuses that prevent order modification
 */
export const IMMUTABLE_STATUSES = [
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
  OrderStatus.REFUNDED,
  OrderStatus.CANCELED
];

/**
 * Check if transition from current status to new status is valid
 */
export function canTransitionTo(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Validate and throw error if transition is invalid
 */
export function validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
  if (!canTransitionTo(currentStatus, newStatus)) {
    throw new BadRequestException(
      `Không thể chuyển trạng thái từ "${getStatusLabel(currentStatus)}" sang "${getStatusLabel(newStatus)}". ` +
      `Các trạng thái hợp lệ: ${VALID_TRANSITIONS[currentStatus].map(s => getStatusLabel(s)).join(', ')}`
    );
  }
}

/**
 * Check if status requires stock restoration
 */
export function shouldRestoreStock(status: OrderStatus): boolean {
  return (REQUIRE_STOCK_RESTORE as readonly OrderStatus[]).includes(status);
}

/**
 * Check if order can be modified (cancelled by user)
 */
export function canUserCancel(status: OrderStatus): boolean {
  const nonCancellableStatuses: OrderStatus[] = [
    OrderStatus.SHIPPING,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
    OrderStatus.CANCELED
  ];
  return !nonCancellableStatuses.includes(status);
}

/**
 * Get human-readable status label in Vietnamese
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'Chờ xác nhận',
    [OrderStatus.CONFIRMED]: 'Đã xác nhận',
    [OrderStatus.PROCESSING]: 'Đang xử lý',
    [OrderStatus.SHIPPING]: 'Đang giao hàng',
    [OrderStatus.DELIVERED]: 'Đã giao',
    [OrderStatus.COMPLETED]: 'Hoàn thành',
    [OrderStatus.PAID]: 'Đã thanh toán',
    [OrderStatus.FAILED]: 'Thất bại',
    [OrderStatus.REFUNDED]: 'Đã hoàn tiền',
    [OrderStatus.CANCELED]: 'Đã hủy',
  };
  return labels[status] || status;
}

/**
 * Get next possible statuses for current status
 */
export function getNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
