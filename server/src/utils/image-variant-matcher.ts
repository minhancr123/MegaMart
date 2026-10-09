/**
 * So khớp ảnh với variant qua SKU trong URL (dùng khi gộp product).
 *
 * Quy tắc an toàn:
 * - Tách URL thành token theo ranh giới non-alnum rồi mới so khớp. KHÔNG
 *   nối liền cả URL rồi includes (sẽ ăn gian ký tự qua biên: SKU
 *   `NOKIA1104GPRO_1` nuốt số `1` đầu của `10056362` trong tên file).
 * - SKU phải là tiền tố của token (bằng nguyên token càng tốt), khớp dài
 *   nhất thắng (`m185red` thắng `m185`), mờ (đồng hạng) thì bỏ.
 * - SKU thuần số (id thư mục crawler như `10058146`) bị bỏ qua: khớp số
 *   thứ tự ảnh với mã số là vô nghĩa.
 * - Không khớp chắc chắn -> null (giữ ảnh chung, an toàn).
 */

/** Token của URL theo ranh giới non-alnum. */
export function urlTokens(url: string | null | undefined): string[] {
  return (url ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Key SKU: chữ thường, chỉ giữ alnum. */
export function skuKey(sku: string | null | undefined): string {
  return (sku ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Variant duy nhất mà SKU của nó khớp token trong URL ảnh, hoặc null.
 * Điều kiện khớp: key(SKU) >= 3 ký tự, có ít nhất 1 chữ cái, và bằng nguyên
 * token hoặc là tiền tố của token.
 */
export function matchImageVariant(
  imageUrl: string | null | undefined,
  variants: { id: string; sku: string }[],
): string | null {
  const tokens = urlTokens(imageUrl);
  if (tokens.length === 0) return null;
  let best: { id: string; len: number } | null = null;
  let tied = false;
  for (const v of variants) {
    const s = skuKey(v.sku);
    if (s.length < 3 || !/[a-z]/.test(s)) continue;
    if (!tokens.some((t) => t === s || t.startsWith(s))) continue;
    if (!best || s.length > best.len) {
      best = { id: v.id, len: s.length };
      tied = false;
    } else if (s.length === best.len && v.id !== best.id) {
      tied = true;
    }
  }
  return best && !tied ? best.id : null;
}

/**
 * Kiểm tra variant hiện tại có được URL ảnh "ủng hộ" không (dùng để phát
 * hiện ảnh gán nhầm: assignment cũ không khớp token nào nhưng variant khác
 * khớp duy nhất).
 */
export function isSupportedByUrl(
  imageUrl: string | null | undefined,
  sku: string | null | undefined,
): boolean {
  const s = skuKey(sku);
  if (s.length < 3 || !/[a-z]/.test(s)) return false;
  return urlTokens(imageUrl).some((t) => t === s || t.startsWith(s));
}
