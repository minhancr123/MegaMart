/**
 * Utility functions for handling price formatting and validation
 */

/**
 * Format price from database BigInt to number for API response
 * Database stores price in cents (VND * 100), so we divide by 100
 * @param price - Price in cents as BigInt
 * @returns Price in VND as number
 */
export function formatPrice(price: bigint): number {
  return Number(price) / 100;
}

/**
 * Format price to VND currency string
 * @param price - Price as number or bigint
 * @returns Formatted price string (e.g., "29.990.000 ₫")
 */
export function formatPriceVND(price: number | bigint): string {
  const numPrice = typeof price === 'bigint' ? Number(price) : price;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
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
    throw new Error('Price cannot be negative');
  }
  return BigInt(Math.round(price));
}

/**
 * Validate price value
 * @param price - Price to validate
 * @returns true if valid, throws error if invalid
 */
export function validatePrice(price: number): boolean {
  if (typeof price !== 'number' || isNaN(price)) {
    throw new Error('Price must be a valid number');
  }
  if (price < 0) {
    throw new Error('Price cannot be negative');
  }
  if (price > 999999999999) { // 999 billion VND limit
    throw new Error('Price exceeds maximum limit');
  }
  return true;
}

/**
 * Calculate VAT amount
 * @param price - Base price
 * @param vatPercent - VAT percentage (default 10%)
 * @returns VAT amount as BigInt
 */
export function calculateVAT(price: number | bigint, vatPercent: number = 10): bigint {
  const numPrice = typeof price === 'bigint' ? Number(price) : price;
  return BigInt(Math.round(numPrice * vatPercent / 100));
}