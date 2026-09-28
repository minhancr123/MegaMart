/**
 * Đổi URL ảnh trong DB từ Cloudinary (đã disable) sang Cloudflare R2.
 *
 * Cloudinary trả 401 nên ảnh trong bảng ProductImage và cột
 * Product.descriptionImages đều hỏng. Script mirror_to_r2.py đã tải lại ảnh
 * từ CDN nguồn và đẩy lên R2, xuất map {url_nguon: url_r2}.
 *
 * Map khoá theo URL nguồn còn DB lưu URL Cloudinary, mà tên file Cloudinary là
 * chuỗi ngẫu nhiên (vd kqejppr8sfufnqildtve.jpg) nên không đối chiếu trực
 * tiếp được. Thay vào đó dựng map theo slug sản phẩm — mỗi slug khớp đúng một
 * nhóm ảnh trong R2.
 *
 * Chạy (từ thư mục server/):
 *   npx ts-node src/scripts/update-image-urls-to-r2.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/update-image-urls-to-r2.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const MAP_PATH = path.resolve(
  __dirname,
  "../../../crawler/out/r2-url-map.json",
);

type UrlMap = Record<string, string>;

function loadMap(): UrlMap {
  if (!fs.existsSync(MAP_PATH)) {
    console.error(`❌ Không tìm thấy ${MAP_PATH}`);
    console.error("   Chạy crawler/mirror_to_r2.py trước để tạo map.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
}

/**
 * Gom ảnh R2 theo slug sản phẩm.
 *
 * URL R2 có dạng https://host/products/<slug>/<ten-anh>.webp, nên slug nằm
 * ngay sau /products/. Giữ nguyên thứ tự trong map để ghép với thứ tự ảnh
 * trong DB (displayOrder).
 */
function buildSlugIndex(map: UrlMap): Map<string, string[]> {
  const byslug = new Map<string, string[]>();
  for (const r2url of Object.values(map)) {
    const match = r2url.match(/\/products\/([^/]+)\//);
    if (!match) continue;
    const list = byslug.get(match[1]) ?? [];
    list.push(r2url);
    byslug.set(match[1], list);
  }
  return byslug;
}

const isStale = (url: string) => url.includes("res.cloudinary.com");

async function main() {
  const apply = process.env.APPLY === "1";
  const byslug = buildSlugIndex(loadMap());
  console.log(`Map: ${byslug.size} slug sản phẩm trong R2`);
  console.log(apply ? "CHẾ ĐỘ GHI THẬT vào DB" : "dry-run (chưa ghi)");

  // Ảnh chính nằm ở ProductImage, ghép theo slug + thứ tự hiển thị.
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      images: { orderBy: { displayOrder: "asc" } },
      descriptionImages: true,
    },
  });
  console.log(`Sản phẩm trong DB: ${products.length}`);

  let imgHit = 0, imgMiss = 0, descHit = 0, descMiss = 0;
  const imgOps: { update: { where: { id: string }; data: { url: string } } }[] = [];
  const prodOps: {
    update: { where: { id: string }; data: { descriptionImages: string[] } };
  }[] = [];

  for (const product of products) {
    const r2list = byslug.get(product.slug);

    if (r2list && product.images.length > 0) {
      // Ảnh thừa trong R2 (crawler lấy nhiều góc hơn DB đang giữ) thì bỏ qua.
      const pairs = product.images.map((image, index) => ({
        image,
        r2url: r2list[index],
      }));
      for (const pair of pairs) {
        if (!isStale(pair.image.url)) continue;
        if (!pair.r2url) {
          imgMiss += 1;
          continue;
        }
        imgHit += 1;
        imgOps.push({
          update: { where: { id: pair.image.id }, data: { url: pair.r2url } },
        });
      }
    } else if (product.images.some((image) => isStale(image.url))) {
      imgMiss += product.images.filter((i) => isStale(i.url)).length;
    }

    const desc = product.descriptionImages.filter(isStale);
    if (desc.length > 0) {
      if (r2list) {
        descHit += desc.length;
        prodOps.push({
          update: {
            where: { id: product.id },
            data: { descriptionImages: product.descriptionImages.map((url) =>
              isStale(url) ? r2list[0] : url,
            ) },
          },
        });
      } else {
        descMiss += desc.length;
      }
    }
  }

  console.log(`Ảnh chính:  sẽ đổi ${imgHit}, không tìm thấy bản R2 ${imgMiss}`);
  console.log(`Ảnh mô tả: sẽ đổi ${descHit}, không tìm thấy bản R2 ${descMiss}`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  // Ghi theo lô: transaction quá dài sẽ giữ khoá bảng trên DB cloud.
  const BATCH = 200;
  for (let i = 0; i < imgOps.length; i += BATCH) {
    await prisma.$transaction(
      imgOps.slice(i, i + BATCH).map((op) => prisma.productImage.update(op.update)),
    );
    console.log(`  ảnh: ${Math.min(i + BATCH, imgOps.length)}/${imgOps.length}`);
  }
  for (let i = 0; i < prodOps.length; i += BATCH) {
    await prisma.$transaction(
      prodOps.slice(i, i + BATCH).map((op) => prisma.product.update(op.update)),
    );
    console.log(`  sản phẩm: ${Math.min(i + BATCH, prodOps.length)}/${prodOps.length}`);
  }

  console.log(`\nXong. ${imgHit} ảnh + ${descHit} ảnh mô tả đã đổi sang R2.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
