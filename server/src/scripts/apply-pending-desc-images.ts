/**
 * Áp ảnh mô tả đã mirror lên R2 cho nhóm sản phẩm còn sót.
 *
 * Dùng sau: export-pending-desc-images.ts -> mirror_dmcl_desc_to_r2.py ->
 * script này.
 *
 * Khác update-dmcl-descriptions.ts: ở đây GIỮ NGUYÊN text bài mô tả đã có
 * trong DB (kèm marker), chỉ thay URL ảnh nguồn bằng URL R2. Ảnh không
 * mirror được (CDN nguồn trả 500/404) thì bỏ khỏi danh sách và bỏ marker
 * tương ứng, rồi đánh số lại phần còn lại.
 *
 * Ảnh sản phẩm (đã có trong `ProductImage`) cũng bị loại ở bước export, nên
 * ở đây chỉ còn ảnh minh họa.
 *
 * Chạy (từ thư mục server/):
 *   npx tsx src/scripts/apply-pending-desc-images.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/apply-pending-desc-images.ts  # ghi thật
 *
 * Đổi nhóm file qua env (mặc định là nhóm DMCL còn sót):
 *   PENDING_JSON=crawler/out/pending-nk-mirror.json \
 *   MAP_JSON=crawler/out/pending-nk-r2-map.json \
 *   APPLY=1 npx tsx src/scripts/apply-pending-desc-images.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const PENDING_PATH = path.resolve(
  __dirname,
  "../../../",
  process.env.PENDING_JSON ?? "crawler/out/pending-desc-mirror.json",
);
const MAP_PATH = path.resolve(
  __dirname,
  "../../../",
  process.env.MAP_JSON ?? "crawler/out/pending-desc-r2-map.json",
);
const APPLY = process.env.APPLY === "1";

/** Đánh số lại marker theo `keep` (index cũ được giữ). */
function rebuild(description: string, keep: number[]): string {
  const remap = new Map(keep.map((oldIdx, newIdx) => [oldIdx, newIdx]));
  const lines = description.split("\n").map((line) => {
    const replaced = line.replace(/\[DESCIMG:(\d+)\]/g, (_m, raw) => {
      const next = remap.get(Number(raw));
      return next === undefined ? "" : `[DESCIMG:${next}]`;
    });
    return replaced.trim() === "" ? "" : replaced;
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function main() {
  if (!fs.existsSync(PENDING_PATH) || !fs.existsSync(MAP_PATH)) {
    console.error("❌ Thiếu pending-desc-mirror.json hoặc pending-desc-r2-map.json");
    console.error("   Chạy export-pending-desc-images.ts rồi mirror_dmcl_desc_to_r2.py trước.");
    process.exit(1);
  }
  const pending = JSON.parse(fs.readFileSync(PENDING_PATH, "utf-8")) as Record<
    string,
    [number, string][]
  >;
  const rawMap = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8")) as Record<
    string,
    string | string[]
  >;
  // Một ảnh nguồn có thể thuộc nhiều sản phẩm (mỗi SP một key R2 riêng
  // `products/<slug>/desc-<n>.webp`). Chọn URL khớp đúng slug đang xử lý,
  // kẻo SP này trỏ sang thư mục R2 của SP khác.
  const mapFor = (slug: string, src: string): string | undefined => {
    const urls = rawMap[src];
    if (!urls) return undefined;
    if (!Array.isArray(urls)) return urls;
    return urls.find((u) => u.includes(`/products/${slug}/`)) ?? urls[0];
  };

  let mirrored = 0;
  let lost = 0;
  const changes: {
    id: string;
    slug: string;
    description: string | null;
    descriptionImages: string[];
    before: number;
    after: number;
    beforeMarkers: number;
    afterMarkers: number;
  }[] = [];
  for (const [slug, entries] of Object.entries(pending)) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, slug: true, description: true, descriptionImages: true },
    });
    if (!product) continue;

    const images = product.descriptionImages ?? [];
    // Thay URL nguồn bằng URL R2 ngay tại vị trí cũ của nó. Chỉ chạm vào
    // ảnh nào còn đúng URL nguồn ghi trong file pending; ảnh đã đổi (do
    // script dọn chạy sau, đánh số lại) thì file pending đã cũ -> bỏ qua
    // toàn bộ sản phẩm, kẻo ghép chỉ số cũ với mảng mới gây trùng ảnh.
    const srcIdx = new Map<string, number>();
    for (const [idx, src] of entries) {
      if (!srcIdx.has(src)) srcIdx.set(src, idx);
    }
    const resolved = new Map<number, string>();
    let touched = false;
    images.forEach((u, idx) => {
      if (!srcIdx.has(u)) {
        resolved.set(idx, u); // ảnh R2 có sẵn hoặc URL lạ: giữ nguyên
        return;
      }
      touched = true;
      const r2 = mapFor(slug, u);
      if (r2) {
        resolved.set(idx, r2);
        mirrored += 1;
      } else {
        lost += 1; // nguồn chết, không mirror được -> bỏ ảnh + marker
      }
    });
    if (!touched) continue;

    // Giữ đúng thứ tự cũ để marker đánh số lại khớp vị trí trong bài.
    const keep = [...resolved.keys()].sort((a, b) => a - b);
    const urls = keep.map((i) => resolved.get(i)!);

    const beforeMarkers = (product.description ?? "").match(/\[DESCIMG:\d+\]/g)?.length ?? 0;
    const description = product.description === null ? null : rebuild(product.description, keep);
    const afterMarkers = (description ?? "").match(/\[DESCIMG:\d+\]/g)?.length ?? 0;
    if (afterMarkers === beforeMarkers && urls.length === images.length && urls.every((u, i) => u === images[i])) continue;

    changes.push({
      id: product.id,
      slug,
      description,
      descriptionImages: urls,
      before: images.length,
      after: urls.length,
      beforeMarkers,
      afterMarkers,
    });
  }

  console.log(`Sản phẩm cần cập nhật: ${changes.length}`);
  console.log(`Ảnh đã mirror: ${mirrored} | ảnh mất (nguồn lỗi): ${lost}`);
  changes.slice(0, 10).forEach((c) =>
    console.log(
      `  ${c.slug.slice(0, 50).padEnd(50)} ảnh ${c.before}→${c.after}  marker ${c.beforeMarkers}→${c.afterMarkers}`,
    ),
  );

  if (!APPLY) {
    console.log("\n(Chưa ghi. Chạy lại với APPLY=1 để áp dụng.)");
    return;
  }
  for (const c of changes) {
    await prisma.product.update({
      where: { id: c.id },
      data: { description: c.description, descriptionImages: c.descriptionImages },
    });
  }
  console.log(`\n✅ Đã cập nhật ${changes.length} sản phẩm.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
