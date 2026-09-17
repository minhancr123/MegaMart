/**
 * Tồn kho khả dụng (Available) = On Hand - Reserved.
 * Server trả sẵn `availableStock`; fallback tính tay cho payload cũ.
 */
export function getAvailableStock(variant?: {
  stock?: number | null;
  reservedQuantity?: number | null;
  availableStock?: number | null;
} | null): number {
  if (!variant) return 0;
  if (variant.availableStock != null) return Math.max(0, Number(variant.availableStock));
  return Math.max(0, Number(variant.stock ?? 0) - Number(variant.reservedQuantity ?? 0));
}
