/**
 * Bỏ ảnh khỏi biến thể khi tên file chứa tên màu khác.
 *
 * Crawler gom ảnh chung của cả dòng sản phẩm vào mọi bản ghi, nên SKU của
 * màu Amber silk lại có ảnh tên "Ceramic_Pink_Rose_Gold". Gán ảnh đó cho Amber
 * silk là sai — khách bấm màu hổ phách lại thấy ảnh hồng.
 *
 * Script chỉ giữ ảnh khi tên file chứa tên màu của chính biến thể đó; ảnh còn
 * lại đặt variantId = NULL để hiện chung cho mọi màu, an toàn hơn gán sai.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/clean-mismatched-variant-images.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/clean-mismatched-variant-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Bỏ dấu, chữ thường, bỏ đuôi file và ký tự không phải alnum. */
function key(text: string): string {
  return text
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function basename(url: string): string {
  return url.split("?")[0].split("/").pop() ?? "";
}

/** Trả về các từ khoá màu nằm trong tên sản phẩm, dùng để đối chiếu tên file. */
function colorTokens(name: string): string[] {
  const bracket = name.match(/\(([^)]+)\)\s*$/);
  if (!bracket) return [];
  return bracket[1]
    .split("/")
    .map((part) => key(part))
    .filter((part) => part.length > 2);
}

/**
 * Tên màu của TẤT CẢ biến thể trong nhóm.
 *
 * Chỉ khi tên file chứa tên màu của biến thể khác mới kết luận ảnh bị gán
 * nhầm. Ảnh tên kiểu "loa-bluetooth-a_main_858_1020.png" không chứa màu nào
 * là ảnh chung hợp lệ, không được đụng tới.
 */
function allColorTokens(variants: { colors: unknown }[], name: string): Set<string> {
  const all = new Set<string>();
  for (const variant of variants) {
    const colors = Array.isArray(variant.colors) ? (variant.colors as { name?: string }[]) : [];
    for (const c of colors) {
      const token = key(c.name ?? "");
      if (token.length > 2) all.add(token);
    }
  }
  for (const token of colorTokens(name)) all.add(token);
  return all;
}

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const products = await prisma.product.findMany({
    where: { deletedAt: null, variants: { some: {} }, images: { some: {} } },
    select: {
      name: true,
      variants: { select: { id: true, sku: true, colors: true } },
      images: { select: { id: true, url: true, variantId: true } },
    },
  });

  let cleared = 0, kept = 0, noTokens = 0;
  const updates: { id: string }[] = [];

  for (const product of products) {
    if (product.variants.length < 2) continue;

    // Màu của từng biến thể, lấy từ colors đã điền trước đó.
    const variantTokens = new Map<string, string[]>();
    for (const variant of product.variants) {
      const colors = Array.isArray(variant.colors) ? (variant.colors as { name?: string }[]) : [];
      const tokens = colors
        .flatMap((c) => [key(c.name ?? "")])
        .filter((t) => t.length > 2);
      variantTokens.set(variant.id, tokens.length > 0 ? tokens : colorTokens(product.name));
    }

    const allTokens = allColorTokens(product.variants, product.name);

    for (const image of product.images) {
      if (!image.variantId) continue;
      const mine = variantTokens.get(image.variantId) ?? [];
      const file = key(basename(image.url));

      // Ảnh mang đúng tên màu của biến thể này — giữ.
      if (mine.some((token) => file.includes(token))) {
        kept += 1;
        continue;
      }
      // Ảnh không chứa tên màu nào: ảnh chung, để nguyên.
      const carriesSomeColor = [...allTokens].some((token) => file.includes(token));
      if (!carriesSomeColor) {
        noTokens += 1;
        continue;
      }
      // Ảnh chứa tên màu nhưng KHÔNG phải màu của biến thể này — gán nhầm.
      updates.push({ id: image.id });
      cleared += 1;
    }
  }

  console.log(`Giữ nguyên (khớp màu): ${kept}`);
  console.log(`Bỏ gắn biến thể (thành ảnh chung): ${cleared}`);
  console.log(`Không xác định được màu, giữ nguyên: ${noTokens}`);

  if (!apply) {
    if (cleared > 0) {
      console.log("\nDanh sách ảnh sẽ bỏ gắn:");
      for (const product of products) {
        for (const image of product.images) {
          if (!updates.some((u) => u.id === image.id)) continue;
          const v = product.variants.find((x) => x.id === image.variantId);
          console.log(`   ${basename(image.url).slice(0, 52)} (biến thể ${v?.sku})`);
        }
      }
    }
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  const BATCH = 300;
  for (let i = 0; i < updates.length; i += BATCH) {
    await prisma.$transaction(
      updates.slice(i, i + BATCH).map((u) =>
        prisma.productImage.update({ where: { id: u.id }, data: { variantId: null } }),
      ),
    );
  }
  console.log(`\nXong. ${cleared} ảnh chuyển thành ảnh chung.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
