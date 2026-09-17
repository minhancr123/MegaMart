/**
 * Variant.attributes chứa lẫn metadata của crawler (nguồn cào, URL gốc, rating…)
 * bên cạnh thông số kỹ thuật thật. Khối "Thông số" trên storefront trước đây
 * render toàn bộ key nên hiện cả "Source: DIEN_MAY_CHO_LON" và link sang trang gốc.
 *
 * Lọc qua đây trước khi hiển thị cho khách.
 */

/** Key nội bộ, không bao giờ hiện ra UI. So khớp không phân biệt hoa thường. */
const INTERNAL_KEYS = new Set([
  'source',         // sàn nguồn: DIEN_MAY_CHO_LON / NGUYEN_KIM
  'sourceurl',      // link tới trang sản phẩm gốc
  'sourcecategory', // tên danh mục bên sàn nguồn, không khớp danh mục của mình
  'stockstatus',    // đã có badge còn hàng/hết hàng riêng
  'rating',         // đã hiển thị riêng bằng sao
  'reviewcount',    // đã hiển thị riêng cạnh sao
  'specs',          // chính là nội dung đã dựng nên description ở ngay phía trên
  'specstable',     // bảng thông số, đã có tab "Thông số kỹ thuật" riêng
]);

export function isInternalAttribute(key: string): boolean {
  return INTERNAL_KEYS.has(key.trim().toLowerCase());
}

/** Chỉ giữ lại các thông số dành cho khách xem. */
export function visibleAttributes(
  attributes: Record<string, unknown> | null | undefined,
): Array<[string, unknown]> {
  if (!attributes) return [];
  return Object.entries(attributes).filter(
    ([key, value]) =>
      !isInternalAttribute(key) &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0),
  );
}

/**
 * String(value) trên một mảng cho ra "a,b,c" dính liền nhau, còn trên object
 * cho ra "[object Object]". Định dạng lại trước khi in.
 */
export function formatAttributeValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatAttributeValue).join(' • ');
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
