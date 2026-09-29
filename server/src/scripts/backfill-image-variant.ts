/**
 * Gán ảnh về đúng biến thể (màu) sau khi gộp các bản ghi cùng dòng.
 *
 * Khi gộp, mọi ảnh của các màu khác nhau bị chuyển vào một product chung và
 * đánh số lại displayOrder, nên gallery không biết ảnh nào thuộc màu nào.
 * Dataset crawl vẫn giữ nguyên ranh giới: mỗi bản ghi có một SKU và danh sách
 * ảnh của riêng SKU đó. Script dùng tên file ảnh làm khoá nối ảnh về SKU, rồi
 * từ SKU tra cập variantId.
 *
 * Ảnh không khớp SKU nào được giữ variantId = NULL: đó là ảnh chung, hiển thị
 * cho mọi biến thể.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/backfill-image-variant.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/backfill-image-variant.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const CRAWL_JSON = path.resolve(
  __dirname,
  "../../../crawler/out/megamart-products.json",
);

/**
 * Khoá so khớp tên file: không dấu, chữ thường, bỏ ký tự không phải alnum.
 *
 * Phải bỏ cả đuôi file. Khi mirror lên R2 mọi ảnh được chuyển sang WebP
 * (…_PinkRose_Gold1.jpg -> …_PinkRose_Gold1.webp) nên tên file trong DB khác
 * tên trong dataset crawl ở đuôi, giữ đuôi lại thì không ảnh nào khớp.
 */
function key(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function basename(url: string): string {
  return url.split("?")[0].split("/").pop() ?? "";
}

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  if (!fs.existsSync(CRAWL_JSON)) {
    console.error(`❌ Không có ${CRAWL_JSON}`);
    process.exit(1);
  }

  // slug -> SKU duy nhất của bản ghi crawl đó.
  const slugSku = new Map<string, string>();
  // key(tên file ảnh) -> SKU sở hữu ảnh đó trong dataset gốc.
  const imageOwner = new Map<string, string>();
  // slug (đã bỏ dấu, không phân biệt hoa thường) -> SKU, để tra khi slug DB đã đổi.
  const crawlSkuBySlug: Record<string, string> = {};
  for (const product of JSON.parse(fs.readFileSync(CRAWL_JSON, "utf-8")).products ?? []) {
    const skus = (product.variants ?? []).map((v: { sku?: string }) => v.sku).filter(Boolean);
    if (skus.length === 1) {
      slugSku.set(product.slug, skus[0]);
      crawlSkuBySlug[key(product.slug)] = skus[0];
    }
    for (const image of product.images ?? []) {
      const file = basename(image.url ?? "");
      if (!file) continue;
      // Ảnh nào xuất hiện ở nhiều bản ghi thì bỏ qua, tránh gán nhầm SKU.
      const k = key(file);
      const prev = imageOwner.get(k);
      if (prev && prev !== skus[0]) imageOwner.set(k, "__ambiguous__");
      else if (!prev) imageOwner.set(k, skus[0] ?? "");
    }
  }
  console.log(`Dataset crawl: ${slugSku.size} bản ghi, ${imageOwner.size} ảnh`);

  // Chỉ xét product nhiều biến thể — ảnh chung của sản phẩm đơn màu không cần.
  const products = await prisma.product.findMany({
    where: { deletedAt: null, variants: { some: {} } },
    select: {
      slug: true,
      variants: { select: { id: true, sku: true } },
      images: { select: { id: true, url: true, variantId: true } },
    },
  });

  let assigned = 0, shared = 0, unknownVariant = 0, productsTouched = 0;
  const updates: { id: string; variantId: string | null }[] = [];

  for (const product of products) {
    if (product.variants.length < 2) continue;
    const bySku = new Map(product.variants.map((v) => [v.sku, v.id]));

    /**
     * Slug sau khi gộp không còn khớp slug gốc: crawler giữ hậu tố SKU nguyên
     * văn ("…-HD16CEPKROSEGDCASE") còn DB lưu lowercase. Tìm SKU của bản ghi
     * gốc bằng cách thử chính slug, rồi thử bản lowercase, không dấu.
     */
    const crawlSku =
      slugSku.get(product.slug) ??
      slugSku.get(product.slug.toLowerCase()) ??
      Object.entries(crawlSkuBySlug).find(
        ([slug]) => key(slug) === key(product.slug),
      )?.[1];

    let touched = false;
    for (const image of product.images) {
      if (image.variantId) continue;
      const owner = imageOwner.get(key(basename(image.url)));
      if (!owner || owner === "__ambiguous__") {
        shared += 1;
        continue;
      }
      const variantId = bySku.get(owner) ?? (crawlSku ? bySku.get(crawlSku) : undefined);
      if (!variantId) {
        unknownVariant += 1;
        continue;
      }
      updates.push({ id: image.id, variantId });
      assigned += 1;
      touched = true;
    }
    if (touched) productsTouched += 1;
  }

  console.log(`Sản phẩm nhiều biến thể: ${products.filter((p) => p.variants.length > 1).length}`);
  console.log(`Sẽ gán variantId: ${assigned}`);
  console.log(`Giữ ảnh chung (variantId NULL): ${shared}`);
  console.log(`Không tìm thấy biến thể: ${unknownVariant}`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  const BATCH = 300;
  for (let i = 0; i < updates.length; i += BATCH) {
    await prisma.$transaction(
      updates.slice(i, i + BATCH).map((u) =>
        prisma.productImage.update({ where: { id: u.id }, data: { variantId: u.variantId } }),
      ),
    );
    console.log(`  ${Math.min(i + BATCH, updates.length)}/${updates.length}`);
  }
  console.log(`\nXong. ${assigned} ảnh đã gán vào ${productsTouched} sản phẩm.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
