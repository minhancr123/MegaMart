/**
 * Áp kế hoạch sửa gallery chết: gỡ row URL hỏng, thêm row R2 mới.
 *
 * Đọc crawler/out/dead-gallery-plan.json (từ export-dead-gallery.ts) và
 * crawler/out/dead-gallery-r2-map.json (từ mirror_gallery_list.py).
 * Row có sourceUrl mirror thành công -> thêm row R2 mới; row chết hẳn và
 * không tái dùng được -> gỡ. Ảnh R2 sẵn có giữ nguyên.
 *
 * Xong mỗi sản phẩm: đánh lại isPrimary (ảnh đầu theo displayOrder) để
 * không còn gallery mồ côi primary. Sản phẩm nào mất hết ảnh thì hiện
 * khung "Chưa có hình ảnh" ở frontend (có fallback sẵn).
 *
 * Chạy (từ thư mục server/):
 *   npx tsx src/scripts/apply-dead-gallery.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/apply-dead-gallery.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const OUT_DIR = path.resolve(__dirname, "../../../crawler/out");
const PLAN_PATH = path.join(OUT_DIR, "dead-gallery-plan.json");
const MAP_PATH = path.join(OUT_DIR, "dead-gallery-r2-map.json");
const APPLY = process.env.APPLY === "1";

type PlanEntry = {
  productId: string;
  keepIds: string[];
  deleteIds: string[];
  nextOrder: number;
  add: { sourceUrl?: string; r2url?: string; alt: string }[];
};

async function main() {
  if (!fs.existsSync(PLAN_PATH)) {
    console.error("❌ Thiếu dead-gallery-plan.json, chạy export-dead-gallery.ts trước.");
    process.exit(1);
  }
  const plan = JSON.parse(fs.readFileSync(PLAN_PATH, "utf-8")) as Record<string, PlanEntry>;
  const rawMap = fs.existsSync(MAP_PATH)
    ? (JSON.parse(fs.readFileSync(MAP_PATH, "utf-8")) as Record<string, string[]>)
    : {};

  let nDelete = 0;
  let nAdd = 0;
  let nSkip = 0;
  let nEmpty = 0;
  const changes: { slug: string; del: number; add: number; left: number }[] = [];

  for (const [slug, entry] of Object.entries(plan)) {
    const rows = await prisma.productImage.findMany({
      where: { productId: entry.productId },
      select: { id: true, url: true, displayOrder: true, isPrimary: true },
    });
    if (!rows.length && !entry.add.length) continue;
    const keepIds = entry.keepIds.filter((id) => rows.some((r) => r.id === id));
    const deleteIds = entry.deleteIds.filter((id) => rows.some((r) => r.id === id));
    const haveUrls = new Set(rows.map((r) => r.url));

    const addUrls: { url: string; alt: string }[] = [];
    for (const a of entry.add) {
      const url = a.r2url ?? rawMap[a.sourceUrl ?? ""]?.[0];
      // Bỏ qua URL đã có trong gallery (chạy lại script không nhân đôi ảnh).
      if (!url) {
        nSkip++;
        continue;
      }
      if (haveUrls.has(url)) continue;
      addUrls.push({ url, alt: a.alt });
      haveUrls.add(url);
    }

    const left = keepIds.length + addUrls.length + rows.filter((r) => !deleteIds.includes(r.id) && !keepIds.includes(r.id)).length;
    // Sản phẩm sẽ mất hết ảnh thì BỎ QUA, giữ nguyên hiện trạng để xử lý
    // riêng (tìm nguồn khác cào lại). Xóa trắng gallery của iPhone, Galaxy...
    // xong hiện khung trống còn tệ hơn ảnh vỡ có placeholder.
    if (left === 0) {
      nEmpty++;
      continue;
    }
    changes.push({ slug, del: deleteIds.length, add: addUrls.length, left });

    if (!APPLY) continue;
    if (deleteIds.length) {
      await prisma.productImage.deleteMany({ where: { id: { in: deleteIds } } });
      nDelete += deleteIds.length;
    }
    let order = entry.nextOrder;
    for (const a of addUrls) {
      await prisma.productImage.create({
        data: {
          productId: entry.productId,
          url: a.url,
          alt: a.alt,
          displayOrder: order++,
          isPrimary: false,
          variantId: null,
        },
      });
      nAdd++;
    }
    // Bảo đảm có đúng một primary: giữ primary cũ nếu còn, không thì lấy
    // ảnh đầu (ưu tiên row giữ lại theo displayOrder).
    const remaining = await prisma.productImage.findMany({
      where: { productId: entry.productId },
      select: { id: true, displayOrder: true, isPrimary: true },
      orderBy: { displayOrder: "asc" },
    });
    if (remaining.length && !remaining.some((r) => r.isPrimary)) {
      const firstKept = remaining.find((r) => keepIds.includes(r.id)) ?? remaining[0];
      await prisma.productImage.updateMany({
        where: { productId: entry.productId },
        data: { isPrimary: false },
      });
      await prisma.productImage.update({ where: { id: firstKept.id }, data: { isPrimary: true } });
    }
  }

  console.log(`Sản phẩm đụng tới: ${changes.length}`);
  changes.slice(0, 10).forEach((c) =>
    console.log(`  ${c.slug.slice(0, 52).padEnd(52)} gỡ ${c.del} + thêm ${c.add} = còn ${c.left}`),
  );
  if (changes.length > 10) console.log(`  ... và ${changes.length - 10} sản phẩm nữa`);
  console.log(`Nguồn mirror hỏng (bỏ qua): ${nSkip}`);
  console.log(`Sản phẩm mất hết ảnh: ${nEmpty}`);
  if (APPLY) console.log(`\n✅ Đã gỡ ${nDelete} row, thêm ${nAdd} row.`);
  else console.log("\n(Chưa ghi. Chạy lại với APPLY=1 để áp dụng.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
