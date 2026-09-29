/**
 * Tách ảnh minh họa (nền không trắng) khỏi gallery sản phẩm.
 *
 * Crawler đổ cả ảnh sản phẩm nền trắng lẫn ảnh minh họa trong bài mô tả
 * (bảng thông số, infographic) vào cùng bảng ProductImage, nên khách mở
 * trang chi tiết thấy ảnh bảng thông số ở ngay vị trí đầu gallery.
 *
 * Phân biệt bằng cách đo pixel: ảnh sản phẩm có viền gần như trắng hết
 * (đo thật 81%–97%), ảnh minh họa thì viền nhiều màu (0%–6%). Việc đo do
 * crawler/measure_edge_whiteness.py thực hiện (PIL), script này chỉ đọc/ghi DB.
 *
 * Ảnh minh họa chuyển vào Product.descriptionImages theo đúng thứ tự
 * displayOrder để marker [DESCIMG:n] trong mô tả trỏ đúng ảnh; ảnh sản phẩm ở
 * lại gallery và được đánh lại displayOrder liền mạch.
 *
 * Ảnh KHÔNG bị xóa khỏi hệ thống, chỉ đổi bảng chứa — chạy lại được.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/split-illustration-images.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/split-illustration-images.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const prisma = new PrismaClient();

/** Viền ảnh gần trắng ≥ ngưỡng này thì coi là ảnh sản phẩm. */
const WHITE_EDGE_THRESHOLD = 80;
/** Luôn giữ tối thiểu 1 ảnh trong gallery, không thì trang mất ảnh chính. */
const MIN_WHITE_KEPT = 1;
/** Trên số ảnh này thì bỏ qua, đo quá lâu mà lợi ích nhỏ. */
const MAX_IMAGES_PER_PRODUCT = 60;
const ONLY_SLUGS = process.env.ONLY_SLUGS;

/**
 * `__dirname` khi chạy ts-node trỏ về server/ chứ không phải server/src/scripts
 * (đã thử, đường dẫn tương đối cứng nhảy ra ngoài repo), nên dò gốc repo từ
 * nhiều nơi thay vì hard-code.
 */
function repoRoot(): string {
  const bases = [
    __dirname,
    join(__dirname, ".."),
    process.cwd(),
    join(process.cwd(), ".."),
  ];
  for (const b of bases) {
    if (existsSync(join(b, "crawler/measure_edge_whiteness.py"))) return b;
  }
  throw new Error(
    `Không tìm thấy crawler/measure_edge_whiteness.py (đã thử từ: ${bases.join(", ")})`,
  );
}

function cachePath(): string {
  const p = join(repoRoot(), "crawler/out/edge-whiteness-cache.json");
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

function loadCache(): Record<string, number> {
  try {
    const p = cachePath();
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, number>) {
  writeFileSync(cachePath(), JSON.stringify(cache));
}

function measureAll(urls: string[]): (number | null)[] {
  const script = join(repoRoot(), "crawler/measure_edge_whiteness.py");
  const res = spawnSync("python3", [script], {
    input: urls.join("\n"),
    maxBuffer: 64 * 1024 * 1024,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(`Đo ảnh thất bại: ${res.stderr?.slice(0, 400)}`);
  }
  return JSON.parse(res.stdout) as (number | null)[];
}

type Img = { id: string; url: string; order: number };

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      descriptionImages: true,
      images: { orderBy: { displayOrder: "asc" } },
    },
  });

  const allow = ONLY_SLUGS ? new Set(ONLY_SLUGS.split(",")) : null;
  const candidates = products.filter(
    (p) => p.images.length > 1 && p.images.length <= MAX_IMAGES_PER_PRODUCT && (!allow || allow.has(p.slug)),
  );
  const totalImgs = candidates.reduce((s, p) => s + p.images.length, 0);
  const cache = loadCache();
  const allUrls = candidates.flatMap((p) => p.images.map((i) => i.url));
  const todo = [...new Set(allUrls.filter((u) => cache[u] == null))];
  console.log(
    `Sản phẩm: ${products.length} | kiểm tra: ${candidates.length} (${totalImgs} ảnh)`,
  );
  console.log(`Cache: ${allUrls.length - todo.length}/${allUrls.length} ảnh | cần đo: ${todo.length}`);
  if (todo.length > 0) {
    console.log(
      `Đang tải và đo pixel ${todo.length} ảnh, ước ~${Math.ceil(todo.length / 6.4 / 60)} phút...`,
    );
    // Chia lô: mỗi lô ghi cache ngay để hỏng giữa chừng (mất mạng, đóng terminal)
    // không phải đo lại từ đầu.
    const BATCH = 1500;
    for (let off = 0; off < todo.length; off += BATCH) {
      const slice = todo.slice(off, off + BATCH);
      const fresh = measureAll(slice);
      slice.forEach((u, i) => {
        if (fresh[i] != null) cache[u] = fresh[i];
      });
      saveCache(cache);
      const done = Math.min(off + BATCH, todo.length);
      const pct = ((done / todo.length) * 100).toFixed(0);
      const leftMin = Math.ceil((todo.length - done) / 6.4 / 60);
      console.log(`  đo xong ${done}/${todo.length} (${pct}%) — còn ~${leftMin} phút`);
    }
  }

  const scoreById = new Map<string, number | null>();
  for (const p of candidates) {
    for (const img of p.images) scoreById.set(img.id, cache[img.url] ?? null);
  }
  const unmeasured = [...scoreById.values()].filter((s) => s == null).length;
  console.log(`Ảnh không đo được (404/timeout): ${unmeasured} — coi như ảnh sản phẩm`);

  let productsChanged = 0;
  let moved = 0;
  const preview: string[] = [];

  for (const p of candidates) {
    const imgs: Img[] = p.images.map((i) => ({
      id: i.id,
      url: i.url,
      order: i.displayOrder ?? 0,
    }));
    // Ảnh không đo được -> coi là ảnh sản phẩm (an toàn, không bỏ nhầm).
    const white = imgs.filter((i) => (scoreById.get(i.id) ?? 100) >= WHITE_EDGE_THRESHOLD);
    const nonWhite = imgs.filter(
      (i) => (scoreById.get(i.id) ?? 100) < WHITE_EDGE_THRESHOLD,
    );
    if (!white.length || !nonWhite.length) continue;
    if (white.length < MIN_WHITE_KEPT) continue;

    const keep = [...white].sort((a, b) => a.order - b.order);
    const move = [...nonWhite].sort((a, b) => a.order - b.order);
    moved += move.length;
    productsChanged += 1;
    if (preview.length < 6) {
      preview.push(
        `  ${p.slug.slice(0, 46)}: giữ ${keep.length} ảnh SP, chuyển ${move.length} ảnh minh họa`,
      );
    }
    if (!apply) continue;

    // Ảnh minh họa lên đầu mảng mô tả theo thứ tự marker; ảnh cũ còn sống giữ lại sau.
    const moveUrls = new Set(move.map((i) => i.url));
    const existingLive = (p.descriptionImages ?? []).filter((u) => u && !moveUrls.has(u));
    await prisma.product.update({
      where: { id: p.id },
      data: { descriptionImages: [...move.map((i) => i.url), ...existingLive] },
    });
    // Ảnh sản phẩm đánh lại thứ tự liền mạch, ảnh đầu làm chính.
    for (let idx = 0; idx < keep.length; idx++) {
      await prisma.productImage.update({
        where: { id: keep[idx].id },
        data: { displayOrder: idx, isPrimary: idx === 0 },
      });
    }
    // Ảnh minh họa đẩy sau (displayOrder lớn) và bỏ cờ ảnh chính.
    for (let idx = 0; idx < move.length; idx++) {
      await prisma.productImage.update({
        where: { id: move[idx].id },
        data: { displayOrder: 1000 + move[idx].order, isPrimary: false },
      });
    }
  }

  console.log(preview.join("\n"));
  console.log(
    `\n${apply ? "Đã ghi" : "Sẽ ghi"}: ${productsChanged} sản phẩm, ${moved} ảnh minh họa chuyển sang mô tả.`,
  );
  if (!apply) console.log("Đặt APPLY=1 để ghi vào DB.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
