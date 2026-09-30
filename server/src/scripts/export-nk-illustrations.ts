/**
 * Xuất ảnh minh họa NGUYỄN KIM còn sống để mirror lên R2.
 *
 * Bối cảnh: gần như toàn bộ `descriptionImages` của NK (9.253/9.382 ảnh)
 * trùng với ảnh gallery — cùng một ảnh vừa hiện ở carousel vừa hiện trong
 * bài viết. Số còn lại nằm trên CDN `cdn.nguyenkimmall.com` đang trả 500
 * ("Error downloading original image") hoặc Cloudinary đã chết.
 *
 * Script này phân loại từng ảnh (KHÔNG ghi DB):
 *   - trùng gallery (so tên file)            -> bỏ
 *   - URL lặp lại trong cùng sản phẩm         -> chỉ giữ bản đầu
 *   - Cloudinary                              -> bỏ (chết chắc)
 *   - URL nguồn còn lại                       -> probe (HEAD, fallback GET);
 *     còn sống mới xuất ra file để mirror
 *   - đã nằm trên R2 và không trùng gallery   -> giữ nguyên, không cần mirror
 *
 * Đầu ra: crawler/out/pending-nk-mirror.json  {slug: [[index_goc, url], ...]}
 * Giữ index gốc vì key R2 đặt theo `desc-<index>`.
 *
 * Chạy: npx tsx src/scripts/export-nk-illustrations.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { basename, isR2 } from "./lib/description-images";

const prisma = new PrismaClient();

const DEST = path.resolve(__dirname, "../../../crawler/out/pending-nk-mirror.json");
const PROBE_TIMEOUT_MS = 12000;
const PROBE_CONCURRENCY = 10;

async function probe(url: string): Promise<boolean> {
  // HEAD nói dối: nhiều host trả 200 cho HEAD nhưng GET lại ra trang HTML
  // (chống hotlink) hoặc redirect về trang chủ. Chỉ tin GET có
  // content-type là ảnh. Ảnh minh họa chỉ vài chục KB nên tải hết cũng rẻ.
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) MegaMart/1.0" },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    try {
      await res.body?.cancel();
    } catch {
      /* bỏ qua */
    }
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

async function probeAll(urls: string[]): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const url = urls[i++];
      out.set(url, await probe(url));
    }
  }
  await Promise.all(Array.from({ length: PROBE_CONCURRENCY }, worker));
  return out;
}

async function main() {
  const prods = await prisma.product.findMany({
    where: { variants: { some: { attributes: { path: ["source"], equals: "NGUYEN_KIM" } } } },
    select: { slug: true, descriptionImages: true, images: { select: { url: true } } },
  });

  // Bước 1: phân loại, gom URL cần probe (mỗi URL probe một lần).
  type Cand = { slug: string; idx: number; url: string };
  const candidates: Cand[] = [];
  const seenProbe = new Set<string>();
  let nDupeGallery = 0;
  let nInternalDupe = 0;
  let nCloudinary = 0;
  let nKeepR2 = 0;
  const perSlug = new Map<string, Cand[]>();

  for (const pr of prods) {
    const imgs = pr.descriptionImages ?? [];
    if (!imgs.length) continue;
    const gallery = new Set((pr.images ?? []).map((im) => basename(im.url)));
    const seenUrl = new Set<string>();
    for (const [idx, url] of imgs.entries()) {
      if (!url || !url.startsWith("http")) continue; // placeholder rỗng
      if (seenUrl.has(url)) {
        nInternalDupe++;
        continue;
      }
      seenUrl.add(url);
      if (gallery.has(basename(url))) {
        nDupeGallery++;
        continue;
      }
      if (/res\.cloudinary\.com/.test(url)) {
        nCloudinary++;
        continue;
      }
      if (isR2(url)) {
        nKeepR2++;
        continue;
      }
      const c = { slug: pr.slug, idx, url };
      candidates.push(c);
      if (!perSlug.has(pr.slug)) perSlug.set(pr.slug, []);
      perSlug.get(pr.slug)!.push(c);
      seenProbe.add(url);
    }
  }

  console.log(`SP NK có ảnh mô tả: ${prods.filter((p) => (p.descriptionImages ?? []).length).length}`);
  console.log(`  trùng gallery (bỏ): ${nDupeGallery}`);
  console.log(`  lặp nội bộ (bỏ): ${nInternalDupe}`);
  console.log(`  cloudinary chết (bỏ): ${nCloudinary}`);
  console.log(`  đã R2, giữ nguyên: ${nKeepR2}`);
  console.log(`  cần probe: ${seenProbe.size} URL`);

  // Bước 2: probe.
  const alive = await probeAll([...seenProbe]);
  const nAlive = [...alive.values()].filter(Boolean).length;
  console.log(`  còn sống: ${nAlive}/${alive.size}`);

  // Bước 3: xuất file mirror.
  const out: Record<string, [number, string][]> = {};
  for (const [slug, cands] of perSlug) {
    const ok = cands.filter((c) => alive.get(c.url)).map((c) => [c.idx, c.url] as [number, string]);
    if (ok.length) out[slug] = ok;
  }
  fs.writeFileSync(DEST, JSON.stringify(out, null, 1));
  const total = Object.values(out).reduce((n, v) => n + v.length, 0);
  console.log(`-> ${DEST}: ${Object.keys(out).length} SP, ${total} ảnh`);
  if (total) {
    console.log("Tiếp theo:");
    console.log("  1. mirror_dmcl_desc_to_r2.py --input crawler/out/pending-nk-mirror.json --map-out crawler/out/pending-nk-r2-map.json");
    console.log("  2. PENDING_JSON=... MAP_JSON=... APPLY=1 npx tsx src/scripts/apply-pending-desc-images.ts");
    console.log("  3. APPLY=1 npx tsx src/scripts/cleanup-stale-description-images.ts  (quét dọn nốt)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
