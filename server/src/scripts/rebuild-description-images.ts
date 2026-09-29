/**
 * Dựng lại mảng Product.descriptionImages GIỮ NGUYÊN VỊ TRÍ marker [DESCIMG:n].
 *
 * Bối cảnh: script backfill-description-images.ts trước đó dùng .filter() xóa
 * URL hỏng khỏi mảng, làm mảng co lại và mọi marker phía sau bị lệch (đoạn văn
 * Bàn phím gắn nhầm ảnh Cổng kết nối...). Script này sửa bằng cách dựng mảng
 * đúng độ dài/gốc từ crawler JSON: R2-map hit -> URL R2, CDN sàn còn sống ->
 * giữ, còn lại giữ chuỗi rỗng "" để giữ index (frontend bỏ qua "" và bù bằng
 * ảnh gallery, còn hơn gắn nhầm ảnh).
 *
 * Không bao giờ ghi đè mảng đang sạch (không rỗng/chết) để không mất ảnh do
 * Admin cập nhật tay.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/rebuild-description-images.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/rebuild-description-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const JSON_PATH = join(__dirname, "../../../crawler/out/megamart-products.json");
const MAP_PATH = join(__dirname, "../../../crawler/out/r2-url-map.json");

const asUrl = (u: unknown): string =>
  typeof u === "string" ? u : String((u as any)?.url ?? (u as any)?.src ?? "");

const isDead = (u: string): boolean => !u || u.includes("cloudinary");

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const json = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const products: any[] = json.products ?? [];
  const r2map: Record<string, string> = JSON.parse(readFileSync(MAP_PATH, "utf8"));

  // slug -> mảng đúng vị trí ("" giữ chỗ cho URL chết).
  const positionalBySlug = new Map<string, string[]>();
  for (const p of products) {
    const src: unknown[] = p.descriptionImages ?? [];
    if (!Array.isArray(src) || src.length === 0 || !p.slug) continue;
    positionalBySlug.set(
      p.slug,
      src.map((u) => {
        const url = asUrl(u).trim();
        if (!url) return "";
        if (r2map[url]) return r2map[url];
        if (isDead(url)) return "";
        return url;
      }),
    );
  }
  console.log(`JSON: ${positionalBySlug.size} sản phẩm có danh sách gốc`);

  const dbProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, description: true, descriptionImages: true },
  });

  let rebuild = 0, skippedClean = 0, noSource = 0;
  const ops: { id: string; slug: string; from: number; to: number }[] = [];

  for (const db of dbProducts) {
    const want = positionalBySlug.get(db.slug);
    const current = db.descriptionImages ?? [];
    if (!want) {
      noSource += 1;
      continue;
    }
    const same = current.length === want.length && current.every((u, i) => u === want[i]);
    if (same) {
      skippedClean += 1;
      continue;
    }
    // Mảng toàn "" (URL gốc chết hết) thì ghi cũng vô nghĩa — frontend đã bù
    // bằng ảnh gallery cho mọi marker, ghi mảng rỗng-hole chỉ thêm rác DB.
    if (!want.some((u) => !isDead(u))) {
      skippedClean += 1;
      continue;
    }
    const hasStale = current.some(isDead);
    // Chỉ động vào mảng rỗng hoặc đang bẩn; mảng sạch (kể cả do Admin sửa)
    // thì giữ nguyên tuyệt đối. Ngoại lệ: mảng sạch nhưng KHÔNG giao nhau với
    // URL gốc (toàn ảnh filler do script cũ gán theo vị trí) thì dựng lại cho
    // đúng ảnh minh họa thật của từng đoạn.
    if (current.length > 0 && !hasStale) {
      const liveTruth = want.filter((u) => !isDead(u));
      const overlap = current.filter((u) => want.includes(u)).length;
      if (overlap > 0 || liveTruth.length === 0) {
        skippedClean += 1;
        continue;
      }
    }
    ops.push({ id: db.id, slug: db.slug, from: current.length, to: want.length });
    rebuild += 1;
  }

  console.log(`Sẽ dựng lại: ${rebuild} SP | giữ nguyên (sạch/không nguồn): ${skippedClean + noSource} SP`);
  for (const o of ops.slice(0, 10)) console.log(`  ${o.slug.slice(0, 60)} [${o.from} -> ${o.to}]`);
  if (ops.length > 10) console.log(`  ... và ${ops.length - 10} SP nữa`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }
  for (const o of ops) {
    const want = positionalBySlug.get(o.slug)!;
    await prisma.product.update({ where: { id: o.id }, data: { descriptionImages: want } });
  }
  console.log(`\nXong. Đã dựng lại ${ops.length} sản phẩm.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
