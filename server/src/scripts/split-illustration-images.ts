/**
 * Tách ảnh minh họa (bảng thông số, infographic) khỏi gallery sản phẩm.
 *
 * Crawler đổ cả ảnh sản phẩm lẫn ảnh minh họa vào cùng bảng ProductImage, nên
 * khách mở trang chi tiết thấy ảnh bảng thông số ở ngay vị trí đầu gallery.
 *
 * PHÂN BIỆT BẰNG MẬT ĐỘ CHỮ, KHÔNG PHẢI VIỀN TRẮNG. Bảng thông số cũng có nền
 * trắng, nên lần đầu tôi chỉ nhìn viền và sai: ảnh sản phẩm sáng (tủ lạnh màu
 * kem) bị đẩy nhầm sang mô tả, còn bảng thông số vẫn nằm ở gallery. Đo trên
 * 291 ảnh ngẫu nhiên cho thấy 70% ảnh có mật độ chữ ≥15% (chữ/bảng thông số) và
 * 25% <10% (ảnh sản phẩm), 5% nằm vùng kéo không phân định được.
 *
 * Vì vậy chỉ chuyển ảnh khi CHẮC CHẮN là minh họa (mật độ chữ cao). Ảnh mơ hồ
 * thì để trong gallery: thừa một ảnh còn hơn mất ảnh sản phẩm.
 *
 * Ảnh KHÔNG bị xóa khỏi hệ thống, chỉ đổi bảng chứa — chạy lại được.
 *
 * LƯU Ý NK: Nguyễn Kim đã tách đúng gallery vs descriptionImages ngay từ crawler
 * (parse_detail → images vs extract_description_images), nên KHÔNG chạy tách NK.
 * Trước đây script này prepend [...move, ...existingLive] vào descriptionImages
 * làm lệch toàn bộ marker [DESCIMG:n] và đẩy ảnh gallery lên displayOrder 1000.
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

/** Mật độ chữ ≥ ngưỡng này thì chắc chắn là bảng thông số/infographic. */
const INK_THRESHOLD = 20;
/** Trên số ảnh này thì bỏ qua, đo quá lâu mà lợi ích nhỏ. */
const MAX_IMAGES_PER_PRODUCT = 60;
const ONLY_SLUGS = process.env.ONLY_SLUGS;

type Measurement = { edge: number; ink: number } | null;

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

function loadCache(): Record<string, Measurement> {
  try {
    const p = cachePath();
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, Measurement>) {
  writeFileSync(cachePath(), JSON.stringify(cache));
}

function measureAll(urls: string[]): Measurement[] {
  const script = join(repoRoot(), "crawler/measure_edge_whiteness.py");
  const res = spawnSync("python3", [script], {
    input: urls.join("\n"),
    maxBuffer: 64 * 1024 * 1024,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    throw new Error(`Đo ảnh thất bại: ${res.stderr?.slice(0, 400)}`);
  }
  return JSON.parse(res.stdout) as Measurement[];
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
      description: true,
      descriptionImages: true,
      images: { orderBy: { displayOrder: "asc" } },
      variants: { select: { attributes: true } },
    },
  });

  const allow = ONLY_SLUGS ? new Set(ONLY_SLUGS.split(",")) : null;
  const isNguyenKim = (p: (typeof products)[number]) =>
    p.variants.some((v: any) => (v.attributes as any)?.source === "NGUYEN_KIM");
  const candidates = products.filter(
    (p) =>
      p.images.length > 1 &&
      p.images.length <= MAX_IMAGES_PER_PRODUCT &&
      (!allow || allow.has(p.slug)) &&
      !isNguyenKim(p),
  );
  const skippedNK = products.length - candidates.length - products.filter((p) => p.images.length <= 1 || p.images.length > MAX_IMAGES_PER_PRODUCT || (allow && !allow.has(p.slug))).length;
  if (skippedNK > 0) console.log(`Bỏ qua ${skippedNK} SP Nguyễn Kim (đã tách đúng từ crawler).`);
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

  const scoreById = new Map<string, Measurement>();
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
    // Chỉ ảnh mật độ chữ cao mới chắc chắn là bảng thông số/infographic. Ảnh
    // không đo được hoặc mật độ thấp thì coi là ảnh sản phẩm và giữ lại —
    // thừa ảnh trong gallery còn hơn mất ảnh sản phẩm.
    const isIllustration = (im: Img) => (scoreById.get(im.id)?.ink ?? 0) >= INK_THRESHOLD;
    const keep = imgs.filter((i) => !isIllustration(i)).sort((a, b) => a.order - b.order);
    const move = imgs.filter(isIllustration).sort((a, b) => a.order - b.order);
    if (!move.length || !keep.length) continue;
    moved += move.length;
    productsChanged += 1;
    if (preview.length < 6) {
      preview.push(
        `  ${p.slug.slice(0, 46)}: giữ ${keep.length} ảnh SP, chuyển ${move.length} ảnh minh họa`,
      );
    }
    if (!apply) continue;

    // KHÔNG prepend vào descriptionImages — sẽ làm lệch marker [DESCIMG:n].
    // Nếu cần chuyển ảnh minh họa, chỉ demote gallery (displayOrder 1000) và
    // để bước rebuild/restore quyết định có đưa vào descriptionImages không.
    // Giữ descriptionImages nguyên để không trộn gallery vào bài viết.
    // await prisma.product.update(...) — removed
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
