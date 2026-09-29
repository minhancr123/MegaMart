/**
 * Dọn + bù mảng Product.descriptionImages theo đúng URL gốc trong crawler.
 *
 * Thực trạng (đo thật):
 * - crawler/out/megamart-products.json có 3.079 sản phẩm với 16.181 URL ảnh
 *   mô tả, nhưng 15.797 URL (97,6%) trỏ về tài khoản Cloudinary cũ đã bị
 *   disable — file gốc không còn tải lại được (không có trong r2-url-map).
 * - Chỉ 110 sản phẩm còn URL sống (CDN sàn + 96 URL đã mirror sang R2).
 * - DB hiện có 854/5.694 sản phẩm có ảnh mô tả, kèm 106 chuỗi rỗng và vài URL
 *   cloudinary chết sót lại.
 *
 * Script này KHÔNG bịa ảnh: chỉ ghi đúng URL gốc còn sống, map 1:1 theo vị trí
 * marker [DESCIMG:n]. Phần còn lại frontend tự bù bằng ảnh gallery
 * (resolveDescriptionImage trong ProductTabs.tsx).
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/backfill-description-images.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/backfill-description-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const JSON_PATH = join(__dirname, "../../../crawler/out/megamart-products.json");
const MAP_PATH = join(__dirname, "../../../crawler/out/r2-url-map.json");

const asUrl = (u: unknown): string =>
  typeof u === "string" ? u : String((u as any)?.url ?? (u as any)?.src ?? "");

const isDead = (u: string): boolean =>
  !u || u.includes("cloudinary");

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const json = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const products: any[] = json.products ?? [];
  const r2map: Record<string, string> = JSON.parse(readFileSync(MAP_PATH, "utf8"));

  // slug -> danh sách URL mô tả còn sống, map 1:1 theo vị trí.
  const liveBySlug = new Map<string, string[]>();
  for (const p of products) {
    const src: unknown[] = p.descriptionImages ?? [];
    if (!Array.isArray(src) || src.length === 0 || !p.slug) continue;
    const resolved = src
      .map((u) => {
        const url = asUrl(u).trim();
        if (!url) return null;
        if (r2map[url]) return r2map[url];
        if (isDead(url)) return null;
        return url; // link CDN sàn còn sống, giữ nguyên
      })
      .filter((u): u is string => !!u);
    if (resolved.length > 0) liveBySlug.set(p.slug, resolved);
  }
  console.log(`JSON: ${liveBySlug.size} sản phẩm còn URL mô tả sống`);

  const dbProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, descriptionImages: true },
  });

  let setExact = 0, cleaned = 0;
  const ops: { id: string; next: string[]; why: string }[] = [];

  for (const db of dbProducts) {
    const live = liveBySlug.get(db.slug);
    const current = db.descriptionImages ?? [];
    const hasStale = current.some((u) => isDead(u));

    if (live && live.length > 0) {
      // Ghi đúng mảng gốc (chỉ khi đang rỗng hoặc đang bẩn).
      const same =
        current.length === live.length && current.every((u, i) => u === live[i]);
      if (!same && (current.length === 0 || hasStale)) {
        ops.push({ id: db.id, next: live, why: `ghi ${live.length} URL gốc` });
        setExact += 1;
      }
    } else if (hasStale) {
      // Không còn URL sống: dọn rác (rỗng/chết) thay vì giữ ảnh hỏng.
      const next = current.filter((u) => !isDead(u));
      ops.push({ id: db.id, next, why: `dọn ${current.length - next.length} URL hỏng` });
      cleaned += 1;
    }
  }

  console.log(`Sẽ ghi mảng gốc: ${setExact} SP | sẽ dọn rác: ${cleaned} SP`);
  for (const o of ops.slice(0, 10)) console.log(`  ${o.why} (id ${o.id.slice(0, 8)}...)`);
  if (ops.length > 10) console.log(`  ... và ${ops.length - 10} SP nữa`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }
  for (const o of ops) {
    await prisma.product.update({ where: { id: o.id }, data: { descriptionImages: o.next } });
  }
  console.log(`\nXong. Đã cập nhật ${ops.length} sản phẩm.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
