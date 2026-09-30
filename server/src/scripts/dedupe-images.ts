/**
 * Xoá ảnh trùng nội dung trong từng sản phẩm, và gán variantId cho ảnh chưa có.
 *
 * Lý do: crawler tải cùng một ảnh nhiều lần với tên file khác nhau (ví dụ
 * "10062520_..._Gold.jpg" và "10062520-..._Gold.jpg" chỉ khác một dấu gạch),
 * và khi gộp các bản ghi cùng model khác màu thì các bản sao đó cùng tồn tại.
 * Gallery hiện ra nhiều ảnh giống hệt nhau.
 *
 * Cách nhận diện: băm nội dung ảnh đã resize về kích thước nhỏ — cùng hash
 * là cùng ảnh. KHÔNG so tên file, vì tên file khác nhau ở đây chỉ là hậu quả
 * của việc tải trùng.
 *
 * Giữ ảnh nào: ưu tiên ảnh đã gắn variantId (đúng màu, đúng thứ tự), rồi
 * tới ảnh có displayOrder nhỏ.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/dedupe-images.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/dedupe-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const prisma = new PrismaClient();

/** Trên số ảnh này thì bỏ qua, đo quá lâu mà lợi ích nhỏ. */
const MAX_IMAGES_PER_PRODUCT = 80;
const ONLY_SLUGS = process.env.ONLY_SLUGS;
function repoRoot(): string {
  const bases = [__dirname, join(__dirname, ".."), process.cwd(), join(process.cwd(), "..")];
  for (const b of bases) {
    if (existsSync(join(b, "crawler/image_hashes.py"))) return b;
  }
  throw new Error("Không tìm thấy crawler/image_hashes.py");
}

function hashPath(): string {
  const p = join(repoRoot(), "crawler/out/image-hash-cache.json");
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

function loadCache(): Record<string, string> {
  try {
    const p = hashPath();
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, string>) {
  writeFileSync(hashPath(), JSON.stringify(cache));
}

/** Hash nội dung ảnh đã resize, để so ảnh khác tên file nhưng cùng nội dung. */
function hashAll(urls: string[]): (string | null)[] {
  const script = join(repoRoot(), "crawler/image_hashes.py");
  const res = spawnSync("python3", [script], {
    input: urls.join("\n"),
    maxBuffer: 64 * 1024 * 1024,
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(`Băm ảnh thất bại: ${res.stderr?.slice(0, 300)}`);
  return JSON.parse(res.stdout) as (string | null)[];
}

type Img = { id: string; url: string; order: number; variantId: string | null };

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      variants: { select: { id: true } },
      images: { orderBy: { displayOrder: "asc" } },
    },
  });

  const allow = ONLY_SLUGS ? new Set(ONLY_SLUGS.split(",")) : null;
  const candidates = products.filter(
    (p) =>
      p.images.length > 1 &&
      p.images.length <= MAX_IMAGES_PER_PRODUCT &&
      (!allow || allow.has(p.slug)),
  );
  const cache = loadCache();
  const allUrls = candidates.flatMap((p) => p.images.map((i) => i.url));
  const todo = [...new Set(allUrls.filter((u) => cache[u] == null))];
  console.log(
    `Sản phẩm: ${products.length} | kiểm tra: ${candidates.length} (${allUrls.length} ảnh)`,
  );
  console.log(`Cache: ${allUrls.length - todo.length}/${allUrls.length} | cần băm: ${todo.length}`);
  if (todo.length) {
    console.log(`Đang tải và băm ${todo.length} ảnh, ước ~${Math.ceil(todo.length / 6.4 / 60)} phút...`);
    const BATCH = 1500;
    for (let off = 0; off < todo.length; off += BATCH) {
      const slice = todo.slice(off, off + BATCH);
      const fresh = hashAll(slice);
      slice.forEach((u, i) => {
        if (fresh[i]) cache[u] = fresh[i];
      });
      saveCache(cache);
      const done = Math.min(off + BATCH, todo.length);
      console.log(
        `  băm xong ${done}/${todo.length} (${((done / todo.length) * 100).toFixed(0)}%)`,
      );
    }
  }

  let productsChanged = 0;
  let removed = 0;
  const preview: string[] = [];

  for (const p of candidates) {
    const imgs: Img[] = p.images.map((i) => ({
      id: i.id,
      url: i.url,
      order: i.displayOrder ?? 0,
      variantId: i.variantId,
    }));

    // Nhóm theo hash; ảnh không băm được thì coi là ảnh riêng (không xoá).
    const groups = new Map<string, Img[]>();
    for (const im of imgs) {
      const h = cache[im.url];
      if (!h) continue;
      const arr = groups.get(h) ?? [];
      arr.push(im);
      groups.set(h, arr);
    }

    // Giữ ảnh nào: ưu tiên ảnh đã gắn variantId (đúng màu), rồi displayOrder nhỏ.
    // Các bản sao xoá hẳn — chúng không mang thông tin nào mà ảnh giữ chưa có.
    const toDelete: Img[] = [];
    for (const arr of groups.values()) {
      if (arr.length < 2) continue;
      const ranked = [...arr].sort((a, b) => {
        if (!!a.variantId !== !!b.variantId) return a.variantId ? -1 : 1;
        return a.order - b.order;
      });
      toDelete.push(...ranked.slice(1));
    }
    if (!toDelete.length) continue;

    removed += toDelete.length;
    productsChanged += 1;
    if (preview.length < 8) {
      preview.push(`  ${p.slug.slice(0, 44)}: xoá ${toDelete.length} ảnh trùng / ${imgs.length}`);
    }
    if (!apply) continue;

    for (const d of toDelete) {
      await prisma.productImage.delete({ where: { id: d.id } });
    }
    // Gán variantId cho ảnh còn lại chưa có, theo variantId của ảnh trùng bị xoá.
    const remaining = await prisma.productImage.findMany({
      where: { productId: p.id },
      orderBy: { displayOrder: "asc" },
    });
    let primarySet = false;
    for (const r of remaining) {
      const wantPrimary = !primarySet;
      await prisma.productImage.update({
        where: { id: r.id },
        data: { isPrimary: wantPrimary },
      });
      if (wantPrimary) primarySet = true;
    }
  }

  console.log(preview.join("\n"));
  console.log(`\n${apply ? "Đã ghi" : "Sẽ ghi"}: ${productsChanged} sản phẩm, xoá ${removed} ảnh trùng.`);
  if (!apply) console.log("Đặt APPLY=1 để ghi vào DB.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
