/**
 * Quét ảnh gallery chết (Cloudinary 401, CDN nguồn 500) và lập kế hoạch sửa.
 *
 * Mỗi ProductImage còn trỏ URL ngoài R2 mà URL đó đã chết sẽ khiến gallery
 * hiện khung vỡ. Script này KHÔNG ghi DB, chỉ xuất 3 file:
 *
 * - crawler/out/dead-gallery-backup.json : toàn bộ row chết (để rollback)
 * - crawler/out/dead-gallery-mirror.json : {r2key: sourceUrl} cho ảnh nguồn
 *   còn sống nhưng chưa có trên R2 (key theo quy ước gallery sẵn có
 *   `products/<slug>/<ten-file>.webp`)
 * - crawler/out/dead-gallery-plan.json   : {slug: {productId, keepIds,
 *   deleteIds, add: [{sourceUrl|r2url, alt}]}} để apply-dead-gallery.ts
 *   thực thi sau khi mirror xong
 *
 * Nguyên tắc:
 * - Ảnh R2 còn sống giữ nguyên (kể cả khi trùng tên gallery: dedupe theo
 *   basename, giữ bản đầu).
 * - Ảnh nguồn còn sống -> mirror lên R2 rồi mới thay (không hotlink).
 * - Ảnh nguồn chết hẳn -> tìm cùng nội dung đã có trên R2 (trùng basename,
 *   thường là sản phẩm trùng model) để tái dùng; không có thì gỡ row.
 * - Row mới không gán variantId (ảnh dùng chung), isPrimary dồn về ảnh đầu.
 *
 * Chạy: npx tsx src/scripts/export-dead-gallery.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { basename, isR2 } from "./lib/description-images";

const prisma = new PrismaClient();

const OUT_DIR = path.resolve(__dirname, "../../../crawler/out");
const CRAWLER_JSON = path.join(OUT_DIR, "megamart-products.json");
const PROBE_TIMEOUT_MS = 12000;
const PROBE_CONCURRENCY = 10;

/** host chết chắc, khỏi probe. */
const DEAD_HOST = /(res\.cloudinary\.com|i\.ytimg\.com)/;

async function probe(url: string): Promise<boolean> {
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

/** Tên file bỏ hết đuôi, dùng làm key R2 cho ảnh gallery mirror mới. */
function galleryKey(slug: string, sourceUrl: string, used: Set<string>): string {
  let stem = (sourceUrl.split("/").pop() ?? "").split("?")[0].replace(/(\.\w+)+$/, "");
  // URL rỗng/malformed (vd crawler ghi "https://cdn.com/") cho stem rỗng:
  // đặt theo hash để không ra key `products/<slug>/.webp` vô nghĩa.
  if (!stem) {
    let h = 0;
    for (const c of sourceUrl) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    stem = `img-${h.toString(36)}`;
  }
  stem = stem.slice(0, 120);
  let key = `products/${slug}/${stem}.webp`;
  // Hai URL khác nhau có thể cắt cùng stem khi tên file quá dài: thêm hậu
  // tố để khỏi ghi đè nhau trong dict mirror (mất ảnh thầm lặng).
  for (let i = 2; used.has(key); i++) {
    key = `products/${slug}/${stem}-${i}.webp`;
  }
  used.add(key);
  return key;
}

async function main() {
  const crawler: { products: any[] } = JSON.parse(fs.readFileSync(CRAWLER_JSON, "utf-8"));
  const originalsBySlug = new Map<string, string[]>();
  for (const p of crawler.products) {
    if (!p?.slug || !Array.isArray(p.images)) continue;
    const urls = p.images
      .map((e: any) => (typeof e === "string" ? e : e?.url))
      .filter((u: any) => typeof u === "string" && u.startsWith("http"));
    if (urls.length) originalsBySlug.set(p.slug, urls);
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      images: { select: { id: true, url: true, displayOrder: true, isPrimary: true, variantId: true } },
    },
  });

  // Index basename -> URL R2 để tái dùng ảnh cùng nội dung ở sản phẩm khác.
  const r2ByBase = new Map<string, string>();
  for (const p of products) {
    for (const im of p.images) {
      if (isR2(im.url) && !r2ByBase.has(basename(im.url))) r2ByBase.set(basename(im.url), im.url);
    }
  }

  // Gom URL cần probe: originals của SP có ảnh chết (mỗi URL một lần).
  const toProbe = new Set<string>();
  type DeadProduct = {
    id: string;
    slug: string;
    name: string;
    images: { id: string; url: string; displayOrder: number; isPrimary: boolean; variantId: string | null }[];
  };
  const affected: DeadProduct[] = [];
  for (const p of products) {
    const dead = p.images.filter((im) => !isR2(im.url));
    if (!dead.length) continue;
    affected.push(p);
    for (const u of originalsBySlug.get(p.slug) ?? []) {
      if (!DEAD_HOST.test(u)) toProbe.add(u);
    }
  }
  console.log(`SP có ảnh gallery ngoài R2: ${affected.length}`);
  console.log(`URL nguồn cần probe: ${toProbe.size}`);

  const alive = await probeAll([...toProbe]);
  const nAlive = [...alive.values()].filter(Boolean).length;
  console.log(`URL nguồn còn sống: ${nAlive}/${alive.size}`);

  const backup: any[] = [];
  const mirror: Record<string, string> = {};
  const usedKeys = new Set<string>();
  const plan: Record<string, any> = {};
  let nReuse = 0;
  let nDrop = 0;

  for (const p of products) {
    const dead = p.images.filter((im) => !isR2(im.url));
    if (!dead.length) continue;
    backup.push({ slug: p.slug, rows: dead });

    // Hàng R2 giữ lại, dedupe theo basename.
    const seen = new Set<string>();
    const keepIds: string[] = [];
    let maxOrder = -1;
    for (const im of p.images) {
      maxOrder = Math.max(maxOrder, im.displayOrder ?? 0);
      if (!isR2(im.url)) continue;
      const b = basename(im.url);
      if (seen.has(b)) continue;
      seen.add(b);
      keepIds.push(im.id);
    }

    const add: { sourceUrl?: string; r2url?: string; alt: string }[] = [];
    const seenAdd = new Set<string>();
    const pushAdd = (entry: { sourceUrl?: string; r2url?: string }) => {
      const key = entry.r2url ?? entry.sourceUrl ?? "";
      if (!key || seenAdd.has(key)) return;
      seenAdd.add(key);
      add.push({ ...entry, alt: p.name });
    };

    // Ưu tiên originals cùng sản phẩm còn sống.
    const originals = (originalsBySlug.get(p.slug) ?? []).filter((u) => alive.get(u));
    for (const u of originals) {
      if (seen.has(basename(u))) continue;
      seen.add(basename(u));
      pushAdd({ sourceUrl: u });
      mirror[galleryKey(p.slug, u, usedKeys)] = u;
    }
    // Rớt lại: tái dùng ảnh R2 cùng basename ở sản phẩm khác.
    for (const im of dead) {
      const b = basename(im.url);
      if (seen.has(b)) continue;
      const reuse = r2ByBase.get(b);
      if (reuse) {
        seen.add(b);
        pushAdd({ r2url: reuse });
        nReuse++;
      } else {
        nDrop++;
      }
    }

    plan[p.slug] = {
      productId: p.id,
      keepIds,
      deleteIds: dead.map((d) => d.id),
      nextOrder: maxOrder + 1,
      add,
    };
  }

  fs.writeFileSync(path.join(OUT_DIR, "dead-gallery-backup.json"), JSON.stringify(backup));
  fs.writeFileSync(path.join(OUT_DIR, "dead-gallery-mirror.json"), JSON.stringify(mirror, null, 1));
  fs.writeFileSync(path.join(OUT_DIR, "dead-gallery-plan.json"), JSON.stringify(plan, null, 1));
  console.log(`Mirror mới: ${Object.keys(mirror).length} ảnh | tái dùng R2 sẵn có: ${nReuse} | gỡ hẳn: ${nDrop}`);
  console.log("Tiếp theo:");
  console.log("  1. mirror_gallery_list.py --input crawler/out/dead-gallery-mirror.json --map-out crawler/out/dead-gallery-r2-map.json");
  console.log("  2. APPLY=1 npx tsx src/scripts/apply-dead-gallery.ts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
