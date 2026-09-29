/**
 * Sửa ảnh mô tả bị trùng lặp.
 *
 * Đợt đổi URL sang R2 gán mọi ảnh mô tả của một sản phẩm về cùng một ảnh,
 * nên bài viết hiện 3 ảnh giống nhau. Script này gán lại từng ảnh một URL
 * R2 khác nhau, lấy theo thứ tự displayOrder của ảnh sản phẩm.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/fix-duplicate-description-images.ts         # xem trước
 *   APPLY=1 npx ts-node src/scripts/fix-duplicate-description-images.ts # ghi
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const MAP_PATH = path.resolve(
  __dirname,
  "../../../crawler/out/r2-url-map.json",
);

function buildSlugIndex(): Map<string, string[]> {
  const map: Record<string, string> = JSON.parse(
    fs.readFileSync(MAP_PATH, "utf-8"),
  );
  const byslug = new Map<string, string[]>();
  for (const r2url of Object.values(map)) {
    const match = r2url.match(/\/products\/([^/]+)\//);
    if (!match) continue;
    // Ảnh review của khách, không phải ảnh sản phẩm.
    if (/thuyvy|review|rating|danh-gia/i.test(r2url)) continue;
    byslug.set(match[1], [...(byslug.get(match[1]) ?? []), r2url]);
  }
  return byslug;
}

async function main() {
  const apply = process.env.APPLY === "1";
  const byslug = buildSlugIndex();
  console.log(`Map: ${byslug.size} slug sản phẩm`);
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  // Chỉ lấy sản phẩm đang bị trùng để giữ truy vấn nhẹ.
  const dupes = await prisma.$queryRaw<{ id: string; slug: string; n: number }[]>`
    SELECT id, slug, cardinality("descriptionImages")::int AS n
    FROM "Product" t
    WHERE cardinality(t."descriptionImages") >= 2
      AND (SELECT count(DISTINCT x) FROM unnest(t."descriptionImages") x) = 1
  `;
  console.log(`Sản phẩm bị trùng: ${dupes.length}`);

  let fixed = 0;
  const noAssets: string[] = [];

  for (const row of dupes) {
    const unique = [...new Set(byslug.get(row.slug) ?? [])];
    if (unique.length < 2) {
      noAssets.push(row.slug);
      continue;
    }
    // Giữ nguyên số lượng ảnh mô tả như trước, mỗi ảnh một URL riêng.
    const next = unique.slice(0, row.n);
    if (new Set(next).size < 2) {
      noAssets.push(row.slug);
      continue;
    }
    if (apply) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Product" SET "descriptionImages" = $1::text[] WHERE id = $2`,
        [next, row.id],
      );
    }
    fixed += 1;
  }

  console.log(`${apply ? "Đã sửa" : "Sẽ sửa"}: ${fixed}`);
  console.log(`Không đủ ảnh R2 để đa dạng: ${noAssets.length}`);

  if (apply) {
    const after = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "Product" t
      WHERE cardinality(t."descriptionImages") >= 2
        AND (SELECT count(DISTINCT x) FROM unnest(t."descriptionImages") x) = 1
    `;
    console.log(`Còn trùng sau khi sửa: ${after[0].n}`);
  } else {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
