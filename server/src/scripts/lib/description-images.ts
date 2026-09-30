/**
 * Nhận diện ảnh SẢN PHẨM nằm nhầm trong `Product.descriptionImages`.
 *
 * Dùng bởi export-pending-desc-images.ts (loại trước khi mirror) và
 * cleanup-stale-description-images.ts (loại cả ảnh đã lên R2).
 */

const R2_HOST = "https://megamart24.tech";

export const isR2 = (url: string) => url.startsWith(R2_HOST);

/**
 * Khóa so khớp ảnh, bỏ những phần không mang thông tin nhận dạng:
 *   - đuôi kép do CDN tạo khi resize: `...-main--991_450.png.webp` → `...-main--991`
 *   - hậu tố kích thước nhiều tầng: `loa-a_main_182_1020.png` → `loa-a_main`
 * Giữ nguyên số đứng sau `-`/`--` vì đó là định danh ảnh (`-main--991` khác
 * `-main--992`), còn số sau `_` mới là kích thước.
 */
export function basename(url: string): string {
  return (url.split("/").pop() ?? "")
    .replace(/\?.*$/, "")
    .toLowerCase()
    .replace(/(\.\w+)+$/, "") // .png.webp, .webp, .jpg
    // Hậu tố kích thước 2-4 chữ số (_450, _182_1020). Số 1 chữ số (_6)
    // thường là số thứ tự ảnh thật, gọt đi sẽ gây trùng nhầm.
    .replace(/_\d{2,4}(_\d{2,4})*$/, "");
}

/**
 * Ảnh mô tả này có phải ảnh sản phẩm không?
 *
 * Không so với slug: bài viết thường lẫn ảnh của model khác cùng dòng
 * (`xiaomi-17t-5g-12gb512gb` bị lẫn `xiaomi-17t-pro-5g-12gb1tb-main--991.png`).
 * Chỉ dựa vào quy ước tên file của Điện máy Chợ Lớn.
 *
 * Sản phẩm:  `<...>-main--991.png`, `<...>-main-330343.webp`, `<...>-multi-0.png`,
 *            `<...>-multi-9-805.png`, `loa-x_main_182_1020.png`, `detail_product_26.png`
 * Minh họa:   `cong-nghe-multi-air-flow.jpg`, `ngan-chua-rong-rai-multi-drawer.jpg`,
 *            `tu-lanh-...-cong-nghe-lam-lanh-da-chieu-multi-air-flow.jpg`
 *
 * Điểm mấu chốt: sau `main`/`multi` PHẢI là số. `multi-air-flow` và
 * `multi-drawer` có chữ "multi" nhưng không kèm số, nên không phải ảnh sản
 * phẩm. Regex `-(main|multi)\b` sẽ ăn nhầm chúng vì ranh giới từ khớp ngay
 * sau dấu gạch ngang.
 */
const PRODUCT_IMAGE_PATTERNS: RegExp[] = [
  /-(main|multi|thumb|zoom)-{1,2}\d/, // -main--991, -multi-0, -thumb-3
  /_(main|multi)_\d/, // _main_182, _multi_0
  /^detail_product_/, // icon "Xem thêm tính năng"
];

export function isProductImage(url: string, galleryBasenames: Set<string>): boolean {
  const name = basename(url);
  if (galleryBasenames.has(name)) return true;
  return PRODUCT_IMAGE_PATTERNS.some((re) => re.test(name));
}
