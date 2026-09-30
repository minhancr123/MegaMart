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
 * Gom ảnh R2 theo slug sản phẩm, đồng thời loại ảnh review vì ảnh mô tả xen
 * trong bài viết tới từ ảnh của người đánh giá chứ không phải ảnh sản phẩm.
 *
 * URL R2 có dạng https://host/products/<slug>/<ten-anh>.webp nên slug nằm
 * ngay sau /products/.
 *
 * LƯU Ý: /companies/_1/Thuyvy/... là thư mục ảnh minh họa tính năng của Nguyễn Kim,
 * KHÔNG phải ảnh review — đừng lọc nhầm.
 */
function buildSlugIndex(map: UrlMap): Map<string, string[]> {
  const byslug = new Map<string, string[]>();
  for (const r2url of Object.values(map)) {
    const match = r2url.match(/\/products\/([^/]+)\//);
    if (!match) continue;
    if (/review|rating|danh-gia/i.test(r2url)) continue;
    const list = byslug.get(match[1]) ?? [];
    list.push(r2url);
    byslug.set(match[1], list);
  }
  return byslug;
}

/** Chỉ ảnh gallery (không chứa /desc-) mới dùng để đổi ProductImage. */
function isGalleryR2(url: string): boolean {
  return !/\/desc-\d+\.webp(\?|$)/.test(url);
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
    const galleryR2 = r2list ? r2list.filter(isGalleryR2) : undefined;

    if (galleryR2 && product.images.length > 0) {
      // Ảnh thừa trong R2 (crawler lấy nhiều góc hơn DB đang giữ) thì bỏ qua.
      const pairs = product.images.map((image, index) => ({
        image,
        r2url: galleryR2[index],
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

    // KHÔNG tự gán gallery R2 vào descriptionImages. Việc đổi desc sang R2
    // phải làm bằng map đúng nguồn (desc-*.webp) trong rebuild/backfill hoặc
    // restore script, nếu không sẽ trộn gallery vào bài mô tả và làm lệch marker.
    const staleDesc = product.descriptionImages.filter(isStale);
    if (staleDesc.length > 0) {
      descMiss += staleDesc.length;
    }
  }

  console.log(`Ảnh chính:  sẽ đổi ${imgHit}, không tìm thấy bản R2 ${imgMiss}`);
  console.log(`Ảnh mô tả hỏng (cần restore riêng): ${descMiss} — chạy restore-nguyenkim-images.ts / rebuild-description-images.ts`);

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

  console.log(`\nXong. ${imgHit} ảnh gallery đã đổi sang R2. ${descMiss} ảnh mô tả hỏng giữ nguyên để script restore xử lý.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
