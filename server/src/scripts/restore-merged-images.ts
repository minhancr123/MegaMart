/**
 * Khôi phục ảnh đã xoá nhầm cho sản phẩm bị gộp từ nhiều bản ghi.
 *
 * dedupe-images.ts xoá ảnh trùng nội dung, nhưng ở sản phẩm gộp nhiều màu
 * (Dyson: 3 bản ghi cùng model) crawler lại tải cùng một ảnh cho CÁC bản ghi
 * khác màu. Xoá theo hash vì vậy xoá luôn ảnh của màu khác, khiến màu đó mất
 * gần hết ảnh (Amber silk còn 1/14).
 *
 * Script này đọc lại crawler/out/megamart-products.json + r2-url-map.json: với
 * mỗi bản ghi gốc, gán lại ảnh còn thiếu vào đúng variant tương ứng.
 *
 * Chỉ chạy cho sản phẩm đã gộp (có >1 variant màu). An toàn: không xoá gì,
 * chỉ thêm ảnh còn thiếu.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/restore-merged-images.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/restore-merged-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const ONLY_SLUGS = process.env.ONLY_SLUGS;

function repoRoot(): string {
  const bases = [__dirname, join(__dirname, ".."), process.cwd(), join(process.cwd(), "..")];
  for (const b of bases) {
    try {
      readFileSync(join(b, "crawler/out/megamart-products.json"));
      return b;
    } catch {
      /* thử gốc tiếp theo */
    }
  }
  throw new Error("Không tìm thấy crawler/out/megamart-products.json");
}

/** Chuẩn hoá tên để so khớp giữa tên sản phẩm DB và tên bản ghi crawler. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type Variant = { id: string; sku: string; colors: unknown };

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const root = repoRoot();
  const json = JSON.parse(readFileSync(join(root, "crawler/out/megamart-products.json"), "utf8"));
  const r2map: Record<string, string> = JSON.parse(
    readFileSync(join(root, "crawler/out/r2-url-map.json"), "utf8"),
  );

  // Nhóm bản ghi crawler theo SKU: SKU là khoá không trùng giữa các bản ghi,
  // nên khớp chắc chắn hơn so tên (tên sản phẩm sau khi gộp đã bị đổi).
  const bySku = new Map<string, any[]>();
  for (const p of json.products ?? []) {
    for (const v of p.variants ?? []) {
      if (!v?.sku || !Array.isArray(p.images) || p.images.length === 0) continue;
      const arr = bySku.get(v.sku) ?? [];
      arr.push(p);
      bySku.set(v.sku, arr);
    }
  }

  const allow = ONLY_SLUGS ? new Set(ONLY_SLUGS.split(",")) : null;
  if (!allow) {
    console.log("Cần đặt ONLY_SLUGS=<danh sách slug> để chỉ định sản phẩm cần khôi phục.");
    return;
  }

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      variants: { select: { id: true, sku: true, colors: true } },
      images: { select: { url: true, variantId: true } },
    },
  });

  let added = 0;
  let touched = 0;
  const preview: string[] = [];

  for (const prod of products) {
    const variants: Variant[] = prod.variants;
    if (variants.length < 2) continue; // chỉ sản phẩm gộp nhiều màu
    const have = new Set(prod.images.map((i) => i.url));
    if (have.size < 2) continue;
    // Chỉ xử lý sản phẩm được chỉ định — mặc định KHÔNG đụng gì. Việc này
    // chỉ dành cho sản phẩm đã bị dedupe xoá nhầm ảnh, không phải sửa chung.
    if (!allow || !allow.has(prod.slug)) continue;

    // Mỗi variant -> ảnh R2 của bản ghi crawler chứa đúng SKU đó.
    const want = new Map<string, string[]>();
    for (const variant of variants) {
      const records = bySku.get(variant.sku) ?? [];
      const urls: string[] = [];
      for (const rec of records) {
        for (const i of rec.images ?? []) {
          const u = r2map[i?.url ?? i];
          if (u && !urls.includes(u)) urls.push(u);
        }
      }
      if (urls.length) want.set(variant.id, urls);
    }
    if (!want.size) continue;

    // Thêm ảnh còn thiếu cho từng variant
    let nextOrder = prod.images.length;
    const ops: { variantId: string; url: string }[] = [];
    for (const [variantId, urls] of want) {
      const haveForVariant = new Set(
        prod.images.filter((i) => i.variantId === variantId).map((i) => i.url),
      );
      for (const u of urls) {
        if (haveForVariant.has(u) || have.has(u)) continue;
        ops.push({ variantId, url: u });
      }
    }
    if (!ops.length) continue;

    added += ops.length;
    touched += 1;
    if (preview.length < 8) {
      preview.push(`  ${prod.name.slice(0, 40)}: thêm ${ops.length} ảnh`);
    }
    if (!apply) continue;

    for (const op of ops) {
      await prisma.productImage.create({
        data: {
          productId: prod.id,
          url: op.url,
          variantId: op.variantId,
          displayOrder: nextOrder++,
          isPrimary: false,
        },
      });
    }
  }

  console.log(preview.join("\n"));
  console.log(`\n${apply ? "Đã ghi" : "Sẽ ghi"}: ${touched} sản phẩm, thêm ${added} ảnh.`);
  if (!apply) console.log("Đặt APPLY=1 để ghi vào DB.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
