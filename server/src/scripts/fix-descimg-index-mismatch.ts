/**
 * Sửa chỉ số marker `[DESCIMG:n]` khi không khớp số ảnh mô tả.
 *
 * Marker vượt quá `len(descriptionImages)` sẽ khiến frontend không lấy được
 * ảnh và hiện ô trống hoặc ảnh vỡ giữa bài mô tả. Nguyên nhân: ảnh mô tả bị
 * loại (ảnh sản phẩm lẫn nhầm, URL nguồn chết) nhưng marker cũ vẫn còn.
 *
 * Script này CHỈ sửa text bài mô tả — bỏ marker trỏ tới ảnh không tồn tại
 * rồi đánh số lại phần còn lại cho liền mạch. Không đụng tới danh sách ảnh.
 *
 * Chạy (từ thư mục server/):
 *   npx tsx src/scripts/fix-descimg-index-mismatch.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/fix-descimg-index-mismatch.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.env.APPLY === "1";

/**
 * Bỏ marker trỏ tới ảnh không tồn tại, GIỮ NGUYÊN chỉ số của các marker còn
 * lại.
 *
 * KHÔNG renumber. Script này chỉ sửa cột `description`, danh sách
 * `descriptionImages` giữ nguyên nên chỉ số cũ vẫn là vị trí đúng. Nếu nén
 * marker về 0..k-1 thì marker 1 sẽ chỉ tới `descriptionImages[1]` — lệch với
 * ảnh nó vốn mô tả, và ảnh ở cuối không bao giờ hiển thị.
 *
 * Chỉ nên renumber khi sửa CẢ HAI cột cùng lúc (xem `rebuild` trong
 * cleanup-stale-description-images.ts).
 */
function fixMarkers(description: string, nImages: number): string {
  const lines = description.split("\n").map((line) => {
    const replaced = line.replace(/\[DESCIMG:(\d+)\]/g, (_m, raw) =>
      Number(raw) < nImages ? `[DESCIMG:${raw}]` : "",
    );
    return replaced.trim() === "" ? "" : replaced;
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, description: true, descriptionImages: true },
  });

  const changes: {
    id: string;
    slug: string;
    nImages: number;
    description: string;
    marker: string;
  }[] = [];
  for (const p of products) {
    const desc = p.description ?? "";
    if (!desc.includes("[DESCIMG:")) continue;
    const nImages = p.descriptionImages?.length ?? 0;
    const indices = [...desc.matchAll(/\[DESCIMG:(\d+)\]/g)].map((m) => Number(m[1]));
    const max = Math.max(...indices);
    if (max < nImages) continue; // đã khớp, không đụng

    const fixed = fixMarkers(desc, nImages);
    const after = [...fixed.matchAll(/\[DESCIMG:(\d+)\]/g)].map((m) => Number(m[1]));
    if (after.some((i) => i >= nImages) || fixed === desc) continue;

    changes.push({
      id: p.id,
      slug: p.slug,
      nImages,
      description: fixed,
      marker: nImages === 0 ? "mất hết ảnh" : `${max + 1} → ${nImages}`,
    });
  }

  console.log(`Sản phẩm cần sửa marker: ${changes.length}`);
  changes.slice(0, 15).forEach((c) =>
    console.log(`  ${c.slug.slice(0, 52).padEnd(52)} ảnh=${c.nImages}  marker ${c.marker}`),
  );
  if (changes.length > 15) console.log(`  ... và ${changes.length - 15} sản phẩm nữa`);

  if (!APPLY) {
    console.log("\n(Chưa ghi. Chạy lại với APPLY=1 để áp dụng.)");
    return;
  }
  for (const c of changes) {
    await prisma.product.update({ where: { id: c.id }, data: { description: c.description } });
  }
  console.log(`\n✅ Đã sửa ${changes.length} sản phẩm.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
