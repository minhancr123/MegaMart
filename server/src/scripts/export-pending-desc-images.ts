/**
 * Xuất ảnh mô tả còn sót (chưa nằm trên R2) ra file để mirror.
 *
 * LOẠI ẢNH SẢN PHẨM bằng cách đối chiếu với bảng `ProductImage` — tức ảnh
 * nào đã nằm trong gallery của chính sản phẩm đó thì chắc chắn là ảnh sản
 * phẩm, không phải ảnh minh họa trong bài mô tả.
 *
 * KHÔNG đoán theo tên file. Regex kiểu `-(main|multi|...)` loại nhầm ảnh
 * minh họa hợp lệ có chữ "multi" trong tên tiếng Việt (`...-multi-air-flow.jpg`,
 * `ngan-chua-rong-rai-multi-drawer.jpg`, `...-cong-nghe-lam-lanh-da-chieu-multi-air-flow.jpg`).
 *
 * Giữ nguyên index gốc trong `descriptionImages` khi xuất, vì key R2 đặt theo
 * `desc-<index>`. Nếu đánh số lại từ 0 ở đây thì key sẽ lệch với ảnh đã
 * mirror sẵn, script mirror thấy key cũ đã tồn tại là bỏ qua, và map sẽ
 * trỏ nhầm ảnh này sang URL của ảnh khác.
 *
 * Đầu ra: crawler/out/pending-desc-mirror.json  {slug: [[index, url], ...]}
 *
 * Chạy: npx tsx src/scripts/export-pending-desc-images.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { basename, isProductImage, isR2 } from "./lib/description-images";

const prisma = new PrismaClient();

/**
 * Xuất ảnh mô tả còn sót (chưa nằm trên R2) ra file để mirror.
 *
 * Loại ảnh SẢN PHẨM trước khi mirror — xem `isProductImage` để biết vì sao
 * phải kết hợp hai tín hiệu thay vì đoán bằng tên file.
 *
 * Giữ nguyên index gốc trong `descriptionImages` khi xuất, vì key R2 đặt theo
 * `desc-<index>`. Nếu đánh số lại từ 0 ở đây thì key sẽ lệch với ảnh đã
 * mirror sẵn, script mirror thấy key cũ đã tồn tại là bỏ qua, và map sẽ
 * trỏ nhầm ảnh này sang URL của ảnh khác.
 *
 * Đầu ra: crawler/out/pending-desc-mirror.json  {slug: [[index, url], ...]}
 *
 * Chạy: npx tsx src/scripts/export-pending-desc-images.ts
 */

async function main() {
  const products = await prisma.product.findMany({
    select: {
      slug: true,
      descriptionImages: true,
      images: { select: { url: true } },
    },
  });

  const out: Record<string, [number, string][]> = {};
  let skipped = 0;
  for (const p of products) {
    const gallery = new Set(p.images.map((i) => basename(i.url)));
    const entries: [number, string][] = [];
    (p.descriptionImages ?? []).forEach((u, idx) => {
      if (isR2(u)) return; // đã mirror rồi
      if (/res\.cloudinary\.com/.test(u) || isProductImage(u, gallery)) {
        skipped += 1;
        return;
      }
      entries.push([idx, u]);
    });
    if (entries.length) out[p.slug] = entries;
  }

  const dest = path.resolve(__dirname, "../../../crawler/out/pending-desc-mirror.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 1));
  const total = Object.values(out).reduce((n, v) => n + v.length, 0);
  console.log(
    `Sản phẩm: ${Object.keys(out).length} | URL cần mirror: ${total} | bỏ (ảnh sản phẩm / Cloudinary): ${skipped}`,
  );
  console.log(`-> ${dest}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
