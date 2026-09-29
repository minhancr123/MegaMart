/**
 * Gộp các bản ghi sản phẩm cùng dòng nhưng khác màu thành một product
 * nhiều variant.
 *
 * Crawler import mỗi màu thành một hàng riêng: "Máy sấy tóc Dyson HD16
 * (Ceramic Pink)" và "… (Amber silk)" là hai Product tách biệt, mỗi cái một
 * Variant với SKU và giá riêng. Đúng ra chỉ nên là một Product với ba Variant,
 * vì khách chọn màu rồi thêm vào giỏ chứ không phải mua ba sản phẩm riêng.
 *
 * Script gom theo phần tên trước dấu ngoặc cuối, giữ bản ghi có nhiều ảnh
 * nhất làm product chính, chuyển SKU còn lại thành Variant, rồi xoá bản ghi
 * thừa. Ảnh của các màu khác được giữ trong ProductImage để gallery hiện đủ.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/merge-color-variants.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/merge-color-variants.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Bỏ phần màu trong ngoặc ở cuối tên: "Tivi X (Màu Đen)" -> "Tivi X". */
function baseName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

type Group = {
  base: string;
  products: { id: string; name: string; imageCount: number }[];
};

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const all = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { images: true } },
      variants: { select: { id: true, sku: true, stock: true, reservedQuantity: true } },
    },
  });

  const groups = new Map<string, Group>();
  for (const product of all) {
    // Chỉ gom khi tên thực sự khác nhau ở phần hậu tố, tức là có dấu ngoặc.
    if (product.name === baseName(product.name)) continue;
    const base = baseName(product.name);
    const entry = groups.get(base) ?? { base, products: [] };
    entry.products.push({
      id: product.id,
      name: product.name,
      imageCount: product._count.images,
    });
    groups.set(base, entry);
  }

  const multi = [...groups.values()].filter((g) => g.products.length > 1);
  console.log(`Nhóm có nhiều bản ghi: ${multi.length}`);
  const totalRows = multi.reduce((sum, g) => sum + g.products.length, 0);
  console.log(`Tổng bản ghi liên quan: ${totalRows} (sẽ còn ${multi.length} product)`);

  if (!apply) {
    for (const g of multi.slice(0, 8)) {
      console.log(`  [${g.products.length}] ${g.base.slice(0, 56)}`);
    }
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  let merged = 0, variantsMoved = 0, imagesMoved = 0, refsMoved = 0;
  const idsToDelete: string[] = [];

  for (const g of multi) {
    // Bản ghi nhiều ảnh nhất làm product chính; ảnh đã gắn vào nó.
    const sorted = [...g.products].sort((a, b) => b.imageCount - a.imageCount);
    const keeper = sorted[0];
    const others = sorted.slice(1);

    for (const other of others) {
      // Chuyển ảnh sang product chính, giữ thứ tự hiển thị.
      const images = await prisma.productImage.findMany({
        where: { productId: other.id },
        orderBy: { displayOrder: "asc" },
      });
      const base = await prisma.productImage.findFirst({
        where: { productId: keeper.id },
        orderBy: { displayOrder: "desc" },
      });
      let nextOrder = (base?.displayOrder ?? -1) + 1;
      for (const image of images) {
        await prisma.productImage.update({
          where: { id: image.id },
          data: { productId: keeper.id, displayOrder: nextOrder, isPrimary: false },
        });
        nextOrder += 1;
        imagesMoved += 1;
      }

      // Biến thể màu: chuyển SKU sang product chính. Nếu SKU trùng thì bỏ qua
      // để không vi phạm ràng buộc unique.
      const variants = await prisma.variant.findMany({ where: { productId: other.id } });
      for (const variant of variants) {
        try {
          await prisma.variant.update({
            where: { id: variant.id },
            data: { productId: keeper.id },
          });
          variantsMoved += 1;
        } catch {
          // SKU đã tồn tại ở product chính: giữ nguyên bản cũ, sẽ xoá cùng product.
        }
      }

      // Review/Wishlist/Compare/Recommendation trỏ thẳng productId nên phải
      // chuyển sang product chính, nếu không dữ liệu người dùng sẽ mồ côi khi
      // xoá. Đã có dữ liệu thật trong bảng này.
      for (const model of ["review", "wishlistItem", "compareItem", "userRecommendation"] as const) {
        const delegate = (prisma as any)[model];
        const moved = await delegate.updateMany({
          where: { productId: other.id },
          data: { productId: keeper.id },
        });
        if (moved.count > 0) refsMoved += moved.count;
      }

      idsToDelete.push(other.id);
    }

    // Trộn ảnh mô tả của các bản ghi bị xoá vào product chính.
    const dupes = await prisma.product.findMany({
      where: { id: { in: idsToDelete }, slug: { startsWith: g.base.slice(0, 10) } },
      select: { descriptionImages: true },
    });
    for (const d of dupes) {
      if (!d.descriptionImages.length) continue;
      const keeperProduct = await prisma.product.findUnique({
        where: { id: keeper.id },
        select: { descriptionImages: true },
      });
      const mergedList = [...new Set([...(keeperProduct?.descriptionImages ?? []), ...d.descriptionImages])];
      await prisma.product.update({
        where: { id: keeper.id },
        data: { descriptionImages: mergedList },
      });
    }

    merged += 1;
    console.log(`  gộp "${g.base.slice(0, 50)}" -> giữ ${keeper.imageCount} ảnh, bỏ ${others.length} bản ghi`);
  }

  // Xoá các bản ghi thừa. onDelete: Cascade dọn luôn variant/ảnh còn sót.
  for (const id of idsToDelete) {
    await prisma.product.delete({ where: { id } });
  }

  console.log(`\nXong. Gộp ${merged} nhóm, chuyển ${variantsMoved} variant, ${imagesMoved} ảnh, ${refsMoved} review/wishlist, xoá ${idsToDelete.length} bản ghi.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
