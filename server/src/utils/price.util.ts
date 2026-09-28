/**
 * Utility functions for handling price formatting and validation
 */

/**
 * Format price from database BigInt to number for API response
 * Database stores price in VND (not cents), so we return as-is
 * @param price - Price in VND as BigInt
 * @returns Price in VND as number
 */
export function formatPrice(price: bigint): number {
  return Number(price);
}

/**
 * Format price to VND currency string
 * @param price - Price as number or bigint
 * @returns Formatted price string (e.g., "29.990.000 ₫")
 */
export function formatPriceVND(price: number | bigint): string {
  const numPrice = typeof price === "bigint" ? Number(price) : price;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(numPrice);
}

/**
 * Parse price from number to BigInt for database storage
 * @param price - Price as number
 * @returns Price as BigInt
 */
export function parsePrice(price: number): bigint {
  if (price < 0) {
    throw new Error("Price cannot be negative");
  }
  return BigInt(Math.round(price));
}

/**
 * Validate price value
 * @param price - Price to validate
 * @returns true if valid, throws error if invalid
 */
export function validatePrice(price: number): boolean {
  if (typeof price !== "number" || isNaN(price)) {
    throw new Error("Price must be a valid number");
  }
  if (price < 0) {
    throw new Error("Price cannot be negative");
  }
  if (price > 999999999999) {
    // 999 billion VND limit
    throw new Error("Price exceeds maximum limit");
  }
  return true;
}

export interface SaleVariantLike {
  price: number | bigint;
  salePrice?: number | bigint | null;
  saleStartDate?: Date | string | null;
  saleEndDate?: Date | string | null;
}

function toMs(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const ms =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Sale chỉ còn hạn khi: có salePrice > 0, rẻ hơn giá gốc,
 * và thời điểm hiện tại nằm trong [saleStartDate, saleEndDate]
 * (đầu nào null/invalid thì coi như không giới hạn đầu đó).
 */
export function isSaleActive(
  variant: SaleVariantLike,
  now: Date = new Date(),
): boolean {
  if (variant == null) return false;
  const sale = Number(variant.salePrice ?? NaN);
  const base = Number(variant.price ?? NaN);
  if (!Number.isFinite(sale) || !Number.isFinite(base)) return false;
  if (!(sale > 0 && sale < base)) return false;
  const nowMs = now.getTime();
  const startMs = toMs(variant.saleStartDate);
  const endMs = toMs(variant.saleEndDate);
  if (startMs != null && nowMs < startMs) return false;
  if (endMs != null && nowMs > endMs) return false;
  return true;
}

/**
 * Đơn giá hiệu lực tại thời điểm tính tiền: giá sale nếu còn hạn,
 * ngược lại giá gốc. Thiếu ngày thì coi như sale không giới hạn thời gian.
 */
export function getEffectivePrice(
  variant: SaleVariantLike,
  now: Date = new Date(),
): number {
  if (isSaleActive(variant, now)) return Number(variant.salePrice);
  const base = Number(variant?.price ?? 0);
  return Number.isFinite(base) && base > 0 ? base : 0;
}

/**
 * Calculate VAT amount
 * @param price - Base price
 * @param vatPercent - VAT percentage (default 10%)
 * @returns VAT amount as BigInt
 */
export function calculateVAT(
  price: number | bigint,
  vatPercent: number = 10,
): bigint {
  const numPrice = typeof price === "bigint" ? Number(price) : price;
  return BigInt(Math.round((numPrice * vatPercent) / 100));
}
