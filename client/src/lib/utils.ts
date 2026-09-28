import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Trích thông báo lỗi hiển thị được từ mọi shape lỗi trong repo:
 * - axiosClient reject: { status, errormassage, message, data }
 * - axios gốc: error.response.data.message
 * - Error JS thuần / ValidationPipe trả message dạng string[].
 */
export function getErrorMessage(error: any, fallback: string): string {
  if (typeof error === "string" && error.length > 0) return error;
  const raw =
    error?.data?.message ??
    error?.response?.data?.message ??
    error?.errormassage ??
    error?.message;
  if (Array.isArray(raw)) {
    const joined = raw.filter(Boolean).join(", ");
    return joined.length > 0 ? joined : fallback;
  }
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

/** Định dạng tiền VND, an toàn với null/undefined/NaN. */
export function formatPrice(amount: number | string | null | undefined, fallback = "—"): string {
  if (amount === null || amount === undefined || amount === "") return fallback;
  const n = Number(amount);
  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface SaleVariantLike {
  price?: number | string | null;
  salePrice?: number | string | null;
  saleStartDate?: string | Date | null;
  saleEndDate?: string | Date | null;
}

function toMs(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Sale còn hạn khi: có salePrice > 0, rẻ hơn giá gốc,
 * và hiện tại nằm trong [saleStartDate, saleEndDate]
 * (đầu nào null/invalid thì coi như không giới hạn đầu đó).
 */
export function isSaleActive(
  variant: SaleVariantLike | null | undefined,
  now: Date = new Date(),
): boolean {
  if (variant == null) return false;
  const sale = Number(variant.salePrice);
  const base = Number(variant.price);
  if (!Number.isFinite(sale) || !Number.isFinite(base)) return false;
  if (!(sale > 0 && sale < base)) return false;
  const nowMs = now.getTime();
  const startMs = toMs(variant.saleStartDate);
  const endMs = toMs(variant.saleEndDate);
  if (startMs != null && nowMs < startMs) return false;
  if (endMs != null && nowMs > endMs) return false;
  return true;
}

/** Đơn giá hiệu lực: giá sale nếu còn hạn, ngược lại giá gốc (0 nếu không hợp lệ). */
export function getEffectivePrice(
  variant: SaleVariantLike | null | undefined,
  now: Date = new Date(),
): number {
  if (isSaleActive(variant, now)) return Number(variant!.salePrice);
  const base = Number(variant?.price ?? 0);
  return Number.isFinite(base) && base > 0 ? base : 0;
}

/** Định dạng ngày giờ vi-VN, an toàn với null/invalid. */
export function formatDate(
  value: string | number | Date | null | undefined,
  opts: { withTime?: boolean } = {},
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return opts.withTime
    ? d.toLocaleString("vi-VN")
    : d.toLocaleDateString("vi-VN");
}
