/**
 * Gán ảnh NULL của product về đúng variant sau khi gộp.
 *
 * Bối cảnh: cluster-and-merge-products.ts chuyển ảnh donor về keeper theo
 * variant của donor, nhưng ảnh gốc của keeper giữ variantId = NULL nên bị
 * coi là ảnh chung (hiện ké sang mọi màu, ví dụ M185 xám hiện ké sang đỏ).
 *
 * Chỉ gán khi chắc chắn (token-boundary matching theo SKU trong URL), và
 * CHỈ khi mô phỏng cho thấy không variant nào đang có ảnh để xem lại bị
 * trắng gallery (quyết định sản phẩm: thà "Chưa có hình ảnh" còn hơn hiện
 * nhầm màu khác, nhưng tuyệt đối không làm hỏng gallery đang hiện tốt).
 * Không đạt -> bỏ qua cả product, giữ nguyên để xử lý tay.
 *
 * Chạy (từ server/):
 *   npx tsx src/scripts/backfill-keeper-variant-images.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/backfill-keeper-variant-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { matchImageVariant } from "../utils/image-variant-matcher";

const prisma = new PrismaClient();

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const products = await prisma.product.findMany({
    where: { deletedAt: null, variants: { some: {} }, images: { some: {} } },
    select: {
      id: true,
      name: true,
      variants: { select: { id: true, sku: true } },
      images: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, url: true, variantId: true },
      },
    },
  });

  const updates: { imageId: string; variantId: string }[] = [];
  let touchedProducts = 0;
  let skippedProducts = 0;
  let nullKept = 0;

  for (const p of products) {
    if (p.variants.length < 2) continue;
    const nulls = p.images.filter((i) => !i.variantId);
    if (nulls.length === 0) continue;

    // Tính toán trước toàn bộ phép gán cho product này.
    const planned = new Map<string, string>();
    for (const img of nulls) {
      const variantId = matchImageVariant(img.url, p.variants);
      if (variantId) planned.set(img.id, variantId);
      else nullKept += 1;
    }
    if (planned.size === 0) continue;

    // Mô phỏng: variant nào đang thấy ảnh (riêng + chung) thì sau khi gán
    // vẫn phải thấy ít nhất 1 ảnh. Vi phạm -> bỏ qua cả product.
    const assignedBefore = new Map<string, number>();
    for (const v of p.variants) assignedBefore.set(v.id, 0);
    for (const img of p.images) {
      if (img.variantId) {
        assignedBefore.set(img.variantId, (assignedBefore.get(img.variantId) ?? 0) + 1);
      }
    }
    const plannedTo = new Map<string, number>();
    for (const vid of planned.values()) {
      plannedTo.set(vid, (plannedTo.get(vid) ?? 0) + 1);
    }
    const sharedAfter = nulls.length - planned.size;
    let safe = true;
    for (const v of p.variants) {
      const visibleBefore = (assignedBefore.get(v.id) ?? 0) + nulls.length;
      const visibleAfter =
        (assignedBefore.get(v.id) ?? 0) + (plannedTo.get(v.id) ?? 0) + sharedAfter;
      if (visibleBefore > 0 && visibleAfter === 0) {
        safe = false;
        break;
      }
    }
    if (!safe) {
      skippedProducts += 1;
      if (!apply && skippedProducts <= 10) {
        console.log(`  SKIP (sợ trắng gallery): ${p.name.slice(0, 60)}`);
      }
      continue;
    }

    for (const [imageId, variantId] of planned) {
      updates.push({ imageId, variantId });
    }
    touchedProducts += 1;
    if (!apply && touchedProducts <= 10) {
      console.log(`  [${planned.size}/${nulls.length} NULL] ${p.name.slice(0, 60)}`);
    }
  }

  console.log(`\nProduct sẽ gán: ${touchedProducts}`);
  console.log(`Product bỏ qua (sợ trắng gallery): ${skippedProducts}`);
  console.log(`Ảnh gán về variant: ${updates.length}`);
  console.log(`Ảnh giữ NULL (không khớp chắc chắn): ${nullKept}`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  const BATCH = 300;
  for (let i = 0; i < updates.length; i += BATCH) {
    await prisma.$transaction(
      updates.slice(i, i + BATCH).map((u) =>
        prisma.productImage.update({
          where: { id: u.imageId },
          data: { variantId: u.variantId },
        }),
      ),
    );
  }
  console.log(`\nXong. Gán ${updates.length} ảnh cho ${touchedProducts} product.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
