/**
 * Dọn ảnh mô tả còn sót — chạy sau khi mirror và apply ảnh pending.
 *
 * Giữ lại ảnh nào thỏa cả ba: đã nằm trên R2, không phải ảnh sản phẩm (xem
 * `isProductImage`), và URL chưa xuất hiện trước đó. Bỏ phần còn lại — URL
 * nguồn chưa mirror (CDN chết), ảnh sản phẩm lẫn nhầm vào bài viết, URL lặp.
 * Sau đó đánh số lại `[DESCIMG:n]` cho khớp với danh sách ảnh còn lại; ảnh nào
 * bị bỏ thì marker của nó cũng biến mất.
 *
 * Sản phẩm mất hết ảnh thì mất hết marker. Để marker trỏ tới ảnh không tồn
 * tại chỉ tạo ô trống hoặc ảnh vỡ trong bài mô tả. Phần text bài mô tả giữ
 * nguyên.
 *
 * Chạy (từ thư mục server/):
 *   npx tsx src/scripts/cleanup-stale-description-images.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/cleanup-stale-description-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { basename, isProductImage, isR2 } from "./lib/description-images";

const prisma = new PrismaClient();

const APPLY = process.env.APPLY === "1";

/** Đánh số lại marker theo `keep` (danh sách index cũ được giữ). */
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
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      description: true,
      descriptionImages: true,
      images: { select: { url: true } },
    },
  });

  const changes: {
    id: string;
    slug: string;
    description: string | null;
    descriptionImages: string[];
    before: number;
    after: number;
    beforeMarkers: number;
    afterMarkers: number;
    sample?: string;
  }[] = [];
  for (const p of products) {
    const images = p.descriptionImages ?? [];
    if (!images.length) continue;
    const gallery = new Set(p.images.map((i) => basename(i.url)));

    // Giữ ảnh nào đã lên R2 và không phải ảnh sản phẩm. URL giống hệt nhau
    // chỉ giữ bản đầu (193 SP NK có cùng URL lặp 2-3 lần trong mô tả).
    const keep: number[] = [];
    const kept: string[] = [];
    const seenUrl = new Set<string>();
    const dropped: string[] = [];
    images.forEach((u, idx) => {
      if (seenUrl.has(u)) {
        dropped.push(u);
        return;
      }
      seenUrl.add(u);
      if (isProductImage(u, gallery) || !isR2(u)) {
        dropped.push(u);
        return;
      }
      keep.push(idx);
      kept.push(u);
    });

    const beforeMarkers = (p.description ?? "").match(/\[DESCIMG:\d+\]/g)?.length ?? 0;
    // Giữ null thay vì đổi thành chuỗi rỗng — description là cột nullable và
    // có chỗ so sánh `= null`.
    const after = p.description === null ? null : rebuild(p.description, keep);
    const afterMarkers = (after ?? "").match(/\[DESCIMG:\d+\]/g)?.length ?? 0;
    // So sánh KẾT QUẢ chứ không dựa vào việc có URL lỗ hay không: ảnh đã lên
    // R2 hết nhưng vẫn có thể còn marker mồ côi cần dọn.
    const same = after === p.description && kept.length === images.length;
    if (same) continue;

    changes.push({
      id: p.id,
      slug: p.slug,
      description: after,
      descriptionImages: kept,
      before: images.length,
      after: kept.length,
      beforeMarkers,
      afterMarkers,
      sample: dropped[0]?.split("/").pop(),
    });
  }

  console.log(`Sản phẩm cần dọn: ${changes.length}`);
  changes.forEach((c) =>
    console.log(
      `  ${c.slug.slice(0, 52).padEnd(52)} ảnh ${c.before}→${c.after}` +
        `  marker ${c.beforeMarkers}→${c.afterMarkers}  (bỏ: ${c.sample})`,
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
  console.log(`\n✅ Đã dọn ${changes.length} sản phẩm.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
