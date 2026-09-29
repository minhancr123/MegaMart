/**
 * Gộp các bản ghi cùng model nhưng khác cấu hình thành một product
 * nhiều variant (chọn cấu hình -> ra giá).
 *
 * Ví dụ: "HP PAVILION X360 14-EK2013TU CORE 7..." và "...14-EK2017TU CORE 5..."
 * là 4 Product riêng, mỗi cái 1 Variant. Đúng ra là 1 Product với 4 Variant
 * (Core 7 / Core 5 / i5...) để khách bấm chọn cấu hình ngay trên trang chi tiết.
 *
 * CHỈ chạy trên danh sách pilot (1A): HP Pavilion X360, MacBook Neo.
 * Không quét toàn danh mục để tránh gộp nhầm model khác nhau.
 *
 * An toàn dữ liệu (giống merge-color-variants.ts):
 * - KHÔNG xóa/tái tạo Variant: chỉ update productId nên OrderItem, CartItem,
 *   WarehouseInventory giữ nguyên.
 * - Review/WishlistItem/CompareItem/UserRecommendation được chuyển productId
 *   trước khi xóa bản ghi thừa (chúng onDelete: Cascade).
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/merge-spec-variants.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/merge-spec-variants.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PilotGroup = {
  key: string;
  /** Tên hiển thị gọn cho product chính sau khi gộp. Slug giữ nguyên. */
  displayName: string;
  match: RegExp;
};

const PILOT_GROUPS: PilotGroup[] = [
  {
    key: "hp-pavilion-x360-14",
    displayName: "Laptop HP Pavilion X360 14",
    match: /hp pavilion x360\s*14/,
  },
  {
    key: "macbook-neo-13",
    displayName: "Apple MacBook Neo 13 inch",
    match: /mac ?book neo 13/,
  },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** "CORE 7-150U" / "i5-1335U" / "A18 Pro" từ tên sản phẩm. */
function parseCpu(name: string): string {
  const m = name.match(/(core\s*[357](?:-\s*\d{3,4}[a-z]*)?|i[357]\s*-\s*\d{4}[a-z]*|(?:apple\s*)?a18\s*pro)/i);
  if (!m) return "";
  const cpu = m[1].replace(/\s+/g, " ").trim();
  return /^a18/i.test(cpu) ? "Apple A18 Pro" : cpu;
}

/** "16GB" — chỉ số 1-2 chữ số để không nuốt "512GB" của ổ cứng. */
function parseRam(name: string): string {
  const m = name.match(/(\d{1,2})\s*g\s*(d4|b)?(?![a-z])/i);
  if (!m) return "";
  // Loại "51 2GSSD" kiểu lỗi chính tả: dính số ổ cứng thì bỏ.
  const after = name.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 4);
  if (/ssd/i.test(after)) return "";
  return `${m[1]}GB`;
}

/** "512GB" — chấp nhận cả lỗi chính tả "51 2GSSD" (bỏ khoảng trắng rồi đọc). */
function parseStorage(name: string): string {
  const flat = name.replace(/\s+/g, "").toUpperCase();
  const m = flat.match(/(\d{3,4})G(SDD|SSD|B)?/);
  return m ? `${m[1]}GB` : "";
}

/**
 * Màu nằm ở đoạn cuối sau dấu "/" cuối (".../512GB/Vàng Citrus(MHFE4SA/A)").
 * Đoạn không có chữ số và ngắn thì coi là màu. Tên nguồn hay viết hoa toàn bộ
 * ("BẠC", "VÀNG") thì chuẩn hóa về Title case cho hợp với nút chọn màu.
 *
 * Danh sách loại trừ: từ đuôi là OS/tính năng (DOS, Touch...), không phải màu.
 */
const NON_COLOR_TAIL = /cpu|gpu|ssd|hdd|inch|fhd|ips|pen|ghz|dos|touch|new|wifi|bluetooth|win\d*|w11|fhd|qhd|oled|ips/i;
function parseColor(name: string): string {
  const noParen = name.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const seg = (noParen.split("/").pop() ?? "").trim();
  if (!seg || seg.length > 24 || /\d/.test(seg)) return "";
  if (NON_COLOR_TAIL.test(seg)) return "";
  return seg.length > 1 && seg === seg.toUpperCase()
    ? seg.charAt(0) + seg.slice(1).toLowerCase()
    : seg;
}

/** Cấu hình rút từ tên + SKU (SKU dự phòng khi 2 variant cùng tên). */
function parseConfig(name: string, sku: string): { cpu: string; ram: string; storage: string; color: string } {
  const cfg = { cpu: parseCpu(name), ram: parseRam(name), storage: parseStorage(name), color: parseColor(name) };
  // Hai variant cùng product (vd DMCL "...(8GB+256GB)" 2 SKU 8GB256GB/8GB512GB):
  // tên cho cùng một đáp án nên phải đọc thêm từ SKU.
  const skuUp = sku.toUpperCase();
  if (!cfg.storage) {
    const m = skuUp.match(/(\d{3,4})\s*GB/);
    if (m) cfg.storage = `${m[1]}GB`;
  }
  if (!cfg.ram) {
    const m = skuUp.match(/[^0-9](\d{1,2})\s*GB/);
    if (m) cfg.ram = `${m[1]}GB`;
  }
  return cfg;
}

/** Điền cấu hình + màu còn thiếu cho một variant (không ghi đè cái đã có). */
function assignVariantConfig(
  variant: { attributes: unknown; colors: unknown },
  cfg: { cpu: string; ram: string; storage: string; color: string },
): { attributes: any; colors: any } {
  const attrs = { ...((variant.attributes as any) ?? {}) };
  if (cfg.cpu && !attrs.cpu) attrs.cpu = cfg.cpu;
  if (cfg.ram && !attrs.ram) attrs.ram = cfg.ram;
  if (cfg.storage && !attrs.storage) attrs.storage = cfg.storage;
  const colors = Array.isArray(variant.colors) && variant.colors.length > 0
    ? variant.colors
    : cfg.color
      ? [{ name: cfg.color }]
      : variant.colors;
  return { attributes: attrs, colors };
}

/** Hai variant cùng đáp án tên thì ưu tiên SKU để phân biệt (trường hợp DMCL). */
function refineWithSku(
  items: { sku: string; cfg: { cpu: string; ram: string; storage: string; color: string } }[],
) {
  const key = (c: { cpu: string; ram: string; storage: string; color: string }) =>
    [c.cpu, c.ram, c.storage, c.color].join("|");
  const counts = new Map<string, number>();
  for (const it of items) counts.set(key(it.cfg), (counts.get(key(it.cfg)) ?? 0) + 1);
  for (const it of items) {
    if ((counts.get(key(it.cfg)) ?? 0) < 2) continue;
    const skuUp = it.sku.toUpperCase();
    const sm = skuUp.match(/(\d{3,4})\s*GB/);
    if (sm && `${sm[1]}GB` !== it.cfg.storage) it.cfg.storage = `${sm[1]}GB`;
    const rm = skuUp.match(/[^0-9](\d{1,2})\s*GB/);
    if (rm && `${rm[1]}GB` !== it.cfg.ram) it.cfg.ram = `${rm[1]}GB`;
  }
}

type PlanItem = {
  productId: string;
  name: string;
  variants: { id: string; sku: string; price: bigint; attributes: any; colors: any }[];
  imageCount: number;
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
      brand: true,
      variants: { select: { id: true, sku: true, price: true, attributes: true, colors: true } },
      _count: { select: { images: true } },
    },
  });

  for (const group of PILOT_GROUPS) {
    const members: PlanItem[] = all
      .filter((p) => group.match.test(norm(p.name)))
      .map((p) => ({
        productId: p.id,
        name: p.name,
        variants: p.variants,
        imageCount: p._count.images,
      }));

    console.log(`\n== ${group.key}: ${members.length} bản ghi ==`);
    if (members.length < 2) {
      console.log("   (đã gộp rồi hoặc không đủ bản ghi, bỏ qua)");
      continue;
    }

    // Bản ghi nhiều ảnh nhất làm chính.
    const sorted = [...members].sort((a, b) => b.imageCount - a.imageCount);
    const keeper = sorted[0];
    const others = sorted.slice(1);

    // Kế hoạch nhãn cho từng variant sau gộp.
    const plannedLabels: string[] = [];
    for (const m of members) {
      const items = m.variants.map((v) => ({ sku: v.sku, cfg: parseConfig(m.name, v.sku) }));
      refineWithSku(items);
      for (const it of items) {
        plannedLabels.push(
          [it.cfg.cpu, it.cfg.ram, it.cfg.storage, it.cfg.color].filter(Boolean).join(" / ") ||
            m.variants.find((v) => v.sku === it.sku)!.sku,
        );
      }
      // Ghi lại để lúc apply dùng chung một đáp án.
      (m as any).planned = items;
    }
    console.log(`   giữ: "${keeper.name.slice(0, 70)}" (${keeper.imageCount} ảnh)`);
    for (const o of others) console.log(`   gộp: "${o.name.slice(0, 70)}"`);
    console.log(`   nhãn variant sau gộp: ${plannedLabels.join(" | ").slice(0, 220)}`);

    if (!apply) continue;

    for (const other of others) {
      // 1. Chuyển ảnh sang product chính, nối tiếp displayOrder.
      const images = await prisma.productImage.findMany({
        where: { productId: other.productId },
        orderBy: { displayOrder: "asc" },
      });
      const base = await prisma.productImage.findFirst({
        where: { productId: keeper.productId },
        orderBy: { displayOrder: "desc" },
      });
      let nextOrder = (base?.displayOrder ?? -1) + 1;
      for (const image of images) {
        await prisma.productImage.update({
          where: { id: image.id },
          data: { productId: keeper.productId, displayOrder: nextOrder, isPrimary: false },
        });
        nextOrder += 1;
      }

      // 2. Chuyển variant sang product chính + điền nhãn cấu hình còn thiếu.
      // Ảnh donor vốn là ảnh chung (variantId null) nên giữ shared: gallery
      // mỗi cấu hình hiện cùng bộ ảnh chung, không gán variantId bừa.
      const variants = await prisma.variant.findMany({ where: { productId: other.productId } });
      const planned: { sku: string; cfg: { cpu: string; ram: string; storage: string; color: string } }[] =
        (other as any).planned ?? other.variants.map((v: any) => ({ sku: v.sku, cfg: parseConfig(other.name, v.sku) }));
      for (const variant of variants) {
        const cfg = planned.find((p) => p.sku === variant.sku)?.cfg ?? parseConfig(other.name, variant.sku);
        const { attributes, colors } = assignVariantConfig(variant, cfg);
        try {
          await prisma.variant.update({
            where: { id: variant.id },
            data: { productId: keeper.productId, attributes, colors: colors ?? undefined },
          });
        } catch {
          // SKU trùng product chính: giữ nguyên, sẽ xóa cùng product thừa.
        }
      }

      // 3. Chuyển các liên kết bám productId trước khi xóa.
      for (const model of ["review", "wishlistItem", "compareItem", "userRecommendation"] as const) {
        await ((prisma as any)[model] as any).updateMany({
          where: { productId: other.productId },
          data: { productId: keeper.productId },
        });
      }

      // 4. Trộn ảnh mô tả.
      const donor = await prisma.product.findUnique({
        where: { id: other.productId },
        select: { descriptionImages: true },
      });
      if (donor && donor.descriptionImages.length > 0) {
        const keeperProduct = await prisma.product.findUnique({
          where: { id: keeper.productId },
          select: { descriptionImages: true },
        });
        await prisma.product.update({
          where: { id: keeper.productId },
          data: {
            descriptionImages: [...new Set([...(keeperProduct?.descriptionImages ?? []), ...donor.descriptionImages])],
          },
        });
      }

      await prisma.product.delete({ where: { id: other.productId } });
      console.log(`   đã gộp + xóa "${other.name.slice(0, 50)}"`);
    }

    // 5. Điền nhãn cho chính các variant của product giữ lại (chúng cũng chỉ
    // có SKU trần như các bản ghi khác) rồi đặt tên hiển thị gọn (giữ slug).
    const keeperVariants = await prisma.variant.findMany({ where: { productId: keeper.productId } });
    const keeperItems = keeperVariants.map((v) => ({ sku: v.sku, cfg: parseConfig(keeper.name, v.sku) }));
    refineWithSku(keeperItems);
    for (const variant of keeperVariants) {
      const cfg = keeperItems.find((p) => p.sku === variant.sku)?.cfg;
      if (!cfg) continue;
      const { attributes, colors } = assignVariantConfig(variant, cfg);
      await prisma.variant.update({
        where: { id: variant.id },
        data: { attributes, colors: colors ?? undefined },
      });
    }
    await prisma.product.update({
      where: { id: keeper.productId },
      data: { name: group.displayName },
    });
    console.log(`   đổi tên chính thành "${group.displayName}"`);
  }

  console.log(apply ? "\nXong." : "\nĐặt APPLY=1 để ghi vào DB.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
