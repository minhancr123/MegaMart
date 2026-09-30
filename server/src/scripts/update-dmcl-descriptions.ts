/**
 * Cập nhật lại mô tả + ảnh minh họa cho sản phẩm Điện máy Chợ Lớn.
 *
 * VÌ SAO
 * ------
 * Crawler cũ lấy mô tả từ `.info_pro-tab` — div bao trọn cả tab "Hình sản
 * phẩm". Nên `Product.descriptionImages` chứa ảnh SẢN PHẨM (tên file
 * `...-main--991.png`, `...-multi-0.png`) hiện lặp với gallery, còn marker
 * `[DESCIMG:n]` thì bị dồn hết lên đầu bài viết.
 *
 * Selector đã được sửa trong crawler/sites/dienmaycholon.py (dùng `.des_pro`).
 * Script này đẩy kết quả mới vào DB:
 *   - `description`        = text mới, có marker đúng vị trí
 *   - `descriptionImages`  = ảnh minh họa (URL R2 sau khi mirror)
 *
 * Ảnh nào mirror lên R2 hỏng sẽ bị loại khỏi cả danh sách lẫn marker, rồi
 * marker còn lại được đánh số lại cho liền mạch — nếu không, chỉ cần một ảnh
 * hỏng là cả bài mô tả lệch ảnh từ đó trở đi.
 *
 * Chạy (từ thư mục server/):
 *   npx tsx src/scripts/update-dmcl-descriptions.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/update-dmcl-descriptions.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const DESC_PATH = path.resolve(
  __dirname,
  "../../../crawler/out/dmcl-descriptions.json",
);
const MAP_PATH = path.resolve(
  __dirname,
  "../../../crawler/out/dmcl-desc-r2-map.json",
);
const APPLY = process.env.APPLY === "1";

type Entry = { description: string; images: string[] };

function loadDesc(): Record<string, Entry> {
  if (!fs.existsSync(DESC_PATH)) {
    console.error(`❌ Không có ${DESC_PATH}`);
    console.error("   Chạy: python crawler/fetch_dmcl_descriptions.py");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(DESC_PATH, "utf-8"));
}

function loadMap(): Record<string, string> {
  if (!fs.existsSync(MAP_PATH)) return {};
  const raw = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8")) as Record<
    string,
    string | string[]
  >;
  // mirror_dmcl_desc_to_r2.py lưu list vì một ảnh nguồn có thể thuộc nhiều
  // sản phẩm (mỗi sản phẩm một key R2 riêng). Chỉ cần một URL bất kỳ — ảnh đó
  // vẫn hiển thị đúng nội dung.
  const out: Record<string, string> = {};
  for (const [src, urls] of Object.entries(raw)) {
    out[src] = Array.isArray(urls) ? urls[0] : urls;
  }
  return out;
}

/**
 * Lọc ảnh còn dùng được rồi đánh số lại marker trong text.
 * `keep` là danh sách index cũ được giữ, theo đúng thứ tự cũ.
 */
function rebuild(description: string, keep: number[]): string {
  const remap = new Map(keep.map((oldIdx, newIdx) => [oldIdx, newIdx]));
  const lines = description.split("\n").map((line) => {
    const replaced = line.replace(/\[DESCIMG:(\d+)\]/g, (_m, raw) => {
      const next = remap.get(Number(raw));
      return next === undefined ? "" : `[DESCIMG:${next}]`;
    });
    // Dòng chỉ còn marker bị loại -> xoá hẳn cho khỏi chỗ trống lạc lõng.
    return replaced.trim() === "" ? "" : replaced;
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function main() {
  const desc = loadDesc();
  const map = loadMap();
  const missingMap = new Set<string>();
  let totalImages = 0;
  let mappedImages = 0;

  const rows = [];
  for (const [slug, entry] of Object.entries(desc)) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, slug: true, descriptionImages: true },
    });
    if (!product) continue;

    const keep: number[] = [];
    const urls: string[] = [];
    entry.images.forEach((src, idx) => {
      const r2 = map[src];
      if (r2) {
        keep.push(idx);
        urls.push(r2);
      } else {
        missingMap.add(src);
      }
    });
    totalImages += entry.images.length;
    mappedImages += urls.length;

    rows.push({
      id: product.id,
      slug,
      before: product.descriptionImages.length,
      after: urls.length,
      description: rebuild(entry.description, keep),
      descriptionImages: urls,
    });
  }

  console.log(`Sản phẩm khớp DB: ${rows.length}/${Object.keys(desc).length}`);
  console.log(`Ảnh: ${mappedImages}/${totalImages} đã có trên R2`);
  if (missingMap.size) {
    console.log(`⚠ ${missingMap.size} ảnh chưa mirror — sẽ bị loại khỏi cả list và marker:`);
    [...missingMap].slice(0, 5).forEach((u) => console.log(`   ${u}`));
  }
  const shrink = rows.filter((r) => r.after < r.before);
  if (shrink.length) {
    console.log(`\n${shrink.length} sản phẩm bị giảm số ảnh mô tả, ví dụ:`);
    shrink.slice(0, 5).forEach((r) => console.log(`   ${r.slug}: ${r.before} → ${r.after}`));
  }
  console.log(`\nMẫu sau khi sửa: ${rows[0]?.slug}`);
  console.log(rows[0]?.description.slice(0, 300));

  if (!APPLY) {
    console.log("\n(Chưa ghi. Chạy lại với APPLY=1 để áp dụng.)");
    return;
  }

  let n = 0;
  for (const r of rows) {
    await prisma.product.update({
      where: { id: r.id },
      data: {
        description: r.description,
        descriptionImages: r.descriptionImages,
      },
    });
    n += 1;
    if (n % 200 === 0) console.log(`  ${n}/${rows.length}`);
  }
  console.log(`\n✅ Đã cập nhật ${n} sản phẩm.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
