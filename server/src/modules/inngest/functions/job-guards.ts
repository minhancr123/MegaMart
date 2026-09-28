/**
 * Guard số học thuần túy dùng chung cho agent jobs.
 * Tách riêng để unit-test được (logic an toàn sống ở job, không ở LLM).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Trạng thái đơn được tính là "đã bán" khi ingest sale (loại PENDING/FAILED/REFUNDED/CANCELED). */
export const SALE_ORDER_STATUSES = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
  "COMPLETED",
  "PAID",
] as const;

/** Mốc 00:00 UTC của ngày chứa timestamp (facts dùng ngày UTC cho nhất quán). */
export function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export interface DaySaleItem {
  variantId: string;
  price: bigint | number;
  quantity: number;
}

/** Gom items 1 ngày → theo variant {qty, revenue VND} (revenue ép int). */
export function aggregateDaySales(
  items: DaySaleItem[],
): { variantId: string; qty: number; revenue: number }[] {
  const agg = new Map<string, { qty: number; revenue: number }>();
  for (const it of items) {
    const cur = agg.get(it.variantId) ?? { qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += Number(it.price) * it.quantity;
    agg.set(it.variantId, cur);
  }
  return [...agg.entries()].map(([variantId, v]) => ({
    variantId,
    qty: v.qty,
    revenue: Math.round(v.revenue),
  }));
}

export { DAY_MS };

/** Voucher hết hạn chưa. Dùng so sánh timestamp trực tiếp — KHÔNG dùng
 *  Math.ceil vì Math.ceil(-0.15) = -0 và (-0 < 0) === false (lọt voucher). */
export function isExpired(endDate: Date | null, now: Date): boolean {
  return endDate != null && endDate.getTime() <= now.getTime();
}

export function daysToExpiry(endDate: Date | null, now: Date): number | null {
  if (!endDate) return null;
  return Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS);
}

export interface SaleItemInput {
  price: number;
  discountPct: number;
  quantity: number;
  available: number;
}

/** Chuẩn hoá 1 sale item. Trả null nếu không hợp lệ để loại bỏ. */
export function clampSaleItem(input: SaleItemInput): {
  salePrice: number;
  quantity: number;
} | null {
  const pct =
    Number.isInteger(input.discountPct) &&
    input.discountPct >= 5 &&
    input.discountPct <= 25
      ? input.discountPct
      : 10;
  const salePrice = Math.round((input.price * (100 - pct)) / 100);
  if (salePrice < 1000) return null;
  const quantity = Math.min(
    Math.max(1, Math.floor(input.quantity)),
    input.available,
    50,
  );
  if (quantity < 1) return null;
  return { salePrice, quantity };
}

export interface RankingInput {
  productId: string;
  score: number;
  reason: string;
}

/** Loại productId trùng (giữ score cao nhất) — chống P2002 unique. */
export function dedupeRankings<T extends RankingInput>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const it of items) {
    const prev = seen.get(it.productId);
    if (!prev || it.score > prev.score) seen.set(it.productId, it);
  }
  return [...seen.values()];
}

export interface LoyaltyVoucherInput {
  value: number;
  minOrderValue: number;
  validityDays: number;
}

/** Ép thông số voucher về trần ngân sách đã chốt (50k / 300k / 7-14 ngày). */
export function clampLoyaltyVoucher(input: LoyaltyVoucherInput): {
  value: number;
  minOrderValue: number;
  validityDays: number;
} {
  return {
    value: Math.min(Math.max(1000, Math.floor(input.value)), 50000),
    minOrderValue: Math.max(Math.floor(input.minOrderValue), 300000),
    validityDays: Math.min(Math.max(Math.floor(input.validityDays), 7), 14),
  };
}
