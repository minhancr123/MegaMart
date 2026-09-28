/**
 * Đổi URL ảnh trong DB từ Cloudinary (đã disable) sang Cloudflare R2.
 *
 * Cloudinary trả 401 nên mọi ảnh trong bảng ProductImage và cột
 * Product.descriptionImages đều hỏng. Script mirror_to_r2.py đã tải lại ảnh
 * từ CDN nguồn, nén WebP và đẩy lên R2, xuất map {url_nguon: url_r2}.
 * Script này đọc map đó rồi ghi vào DB.
 *
 * Chạy (từ thư mục server/):
 *   npx ts-node src/scripts/update-image-urls-to-r2.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/update-image-urls-to-r2.ts  # ghi thật
 *
 * Map đọc từ crawler/out/r2-url-map.json (cùng thư mục cha với server/).
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const MAP_PATH = path.resolve(
  __dirname,
  "../../../crawler/out/r2-url-map.json",
);

type UrlMap = Record<string, string>;

function loadMap(): UrlMap {
  if (!fs.existsSync(MAP_PATH)) {
    console.error(`❌ Không tìm thấy ${MAP_PATH}`);
    console.error("   Chạy crawler/mirror_to_r2.py trước để tạo map.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
}

/** URL Cloudinary còn sót lại trong DB sẽ bị thay bằng R2. */
function isStale(url: string): boolean {
  return url.includes("res.cloudinary.com");
}

async function main() {
  const apply = process.env.APPLY === "1";
  const map = loadMap();
  console.log(`Map: ${Object.keys(map).length} URL nguồn -> R2`);
  console.log(apply ? "CHẾ ĐỘ GHI THẬT vào DB" : "dry-run (chưa ghi)");

  // 1. ProductImage: cột `url` lưu link Cloudinary.
  const images = await prisma.productImage.findMany({
    where: { url: { contains: "res.cloudinary.com" } },
    select: { id: true, url: true, productId: true },
  });

  let imageHits = 0;
  const imageOps: { update: { where: { id: string }; data: { url: string } } }[] =
    [];
  for (const image of images) {
    const next = map[image.url];
    if (!next) continue;
    imageHits += 1;
    imageOps.push({ update: { where: { id: image.id }, data: { url: next } } });
  }
  console.log(`ProductImage: ${imageHits}/${images.length} URL có trong map`);

  // 2. Product.descriptionImages: String[] lưu link Cloudinary.
  const products = await prisma.product.findMany({
    where: { descriptionImages: { has: "res.cloudinary.com" } },
    select: { id: true, slug: true, descriptionImages: true },
  });

  let descHits = 0;
  const productOps: {
    update: { where: { id: string }; data: { descriptionImages: string[] } };
  }[] = [];
  for (const product of products) {
    let changed = false;
    const next = product.descriptionImages.map((url) => {
      if (!isStale(url)) return url;
      const replacement = map[url];
      if (!replacement) return url;
      changed = true;
      descHits += 1;
      return replacement;
    });
    if (changed) {
      productOps.push({
        update: {
          where: { id: product.id },
          data: { descriptionImages: next },
        },
      });
    }
  }
  console.log(`descriptionImages: ${descHits} URL trên ${products.length} sản phẩm`);

  // 3. Báo cáo ảnh Cloudinary còn sót (không có trong map vì nguồn chết).
  const leftoverImages = images.length - imageHits;
  const leftoverDesc = products.length * 0; // đếm chi tiết bên dưới nếu cần
  console.log(`Còn sót (không mirror được): ${leftoverImages} ảnh chính`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  // Ghi theo lô để tránh transaction quá dài trên DB cloud.
  const BATCH = 200;
  for (let i = 0; i < imageOps.length; i += BATCH) {
    const batch = imageOps.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((op) => prisma.productImage.update(op.update)),
    );
    console.log(`  ảnh: ${Math.min(i + BATCH, imageOps.length)}/${imageOps.length}`);
  }
  for (let i = 0; i < productOps.length; i += BATCH) {
    const batch = productOps.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((op) => prisma.product.update(op.update)),
    );
    console.log(`  sản phẩm: ${Math.min(i + BATCH, productOps.length)}/${productOps.length}`);
  }

  console.log(`\nXong. ${imageHits} ảnh + ${descHits} ảnh mô tả đã đổi sang R2.`);
  void leftoverDesc;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
