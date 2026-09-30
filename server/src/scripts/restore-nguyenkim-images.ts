/**
 * Khôi phục tách bạch gallery vs ảnh mô tả cho sản phẩm Nguyễn Kim.
 *
 * Nguyên nhân lộn xộn:
 * - crawler tách đúng (images vs descriptionImages + marker [DESCIMG:n]), nhưng
 *   các script DB trước đây trộn: update-image-urls-to-r2.ts gán gallery R2 vào
 *   descriptionImages, split-illustration-images.ts prepend gallery vào desc.
 * - Kết quả: DB NK có descriptionImages chứa ảnh gallery (detailed/...) lặp với
 *   ProductImage, thiếu ảnh minh họa Thuyvy, và marker bị lệch.
 *
 * Script này dựng lại DB từ file gốc crawler/out/megamart-products.json (truth)
 * + map R2 hiện tại (crawler/out/r2-url-map.json). Giữ nguyên vị trí marker
 * bằng cách để "" giữ chỗ cho ảnh chết, hoặc đánh số lại description nếu cần.
 *
 * Chạy:
 *   npx tsx src/scripts/restore-nguyenkim-images.ts            # dry-run
 *   APPLY=1 npx tsx src/scripts/restore-nguyenkim-images.ts    # ghi thật
 *   ONLY_SLUGS=slug1,slug2 APPLY=1 npx tsx src/scripts/restore-nguyenkim-images.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

const prisma = new PrismaClient();

const JSON_PATH = resolve(__dirname, "../../../crawler/out/megamart-products.json");
const MAP_PATH = resolve(__dirname, "../../../crawler/out/r2-url-map.json");
const ONLY_SLUGS = process.env.ONLY_SLUGS ? new Set(process.env.ONLY_SLUGS.split(",").map((s) => s.trim()).filter(Boolean)) : null;
const APPLY = process.env.APPLY === "1";

const isDead = (u: string) => !u || u.includes("res.cloudinary.com") || u.includes("cloudinary");
const asSourceUrl = (entry: unknown): string => {
  if (typeof entry === "string") return entry;
  const o = entry as any;
  return String(o?.sourceUrl ?? o?.url ?? o?.src ?? "");
};

function buildTruth() {
  const payload = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  const r2map: Record<string, string> = existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, "utf-8")) : {};
  const bySlug = new Map<string, { gallery: string[]; descPositional: string[]; description: string | null }>();

  for (const p of payload.products ?? []) {
    if (p.source !== "NGUYEN_KIM" || !p.slug) continue;
    if (ONLY_SLUGS && !ONLY_SLUGS.has(p.slug)) continue;

    // Gallery: ưu tiên sourceUrl (CDN gốc) -> R2 nếu có
    const gallery: string[] = [];
    for (const img of p.images ?? []) {
      const src = asSourceUrl(img).trim();
      if (!src || isDead(src)) {
        // fallback thử url nếu sourceUrl dead
        const fallback = typeof img === "string" ? img : String((img as any)?.url ?? "");
        if (!fallback || isDead(fallback)) continue;
        const mapped = r2map[fallback] ?? fallback;
        if (!isDead(mapped)) gallery.push(mapped);
        continue;
      }
      const mapped = r2map[src] ?? src;
      if (!isDead(mapped)) gallery.push(mapped);
    }

    // DescriptionImages: positional, "" giữ chỗ cho URL chết (giữ marker không lệch)
    const rawDesc: unknown[] = p.descriptionImages ?? [];
    const descPositional: string[] = rawDesc.map((entry) => {
      const src = asSourceUrl(entry).trim();
      // Ưu tiên sourceUrl gốc
      if (src && !isDead(src)) {
        return r2map[src] ?? src;
      }
      // sourceUrl dead hoặc rỗng -> thử url
      const fallback = typeof entry === "string" ? "" : String((entry as any)?.url ?? "").trim();
      if (!fallback || isDead(fallback)) return "";
      return r2map[fallback] ?? fallback;
    });

    bySlug.set(p.slug, { gallery, descPositional, description: p.description ?? null });
  }
  return { bySlug, r2map };
}

function rebuildMarkers(description: string, keep: number[]): string {
  const remap = new Map(keep.map((oldIdx, newIdx) => [oldIdx, newIdx]));
  const lines = description.split("\n").map((line) => {
    const replaced = line.replace(/\[DESCIMG:(\d+)\]/g, (_m, raw) => {
      const nxt = remap.get(Number(raw));
      return nxt === undefined ? "" : `[DESCIMG:${nxt}]`;
    });
    return replaced.trim() === "" ? "" : replaced;
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function main() {
  console.log(APPLY ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");
  if (ONLY_SLUGS) console.log(`Chỉ xử lý: ${[...ONLY_SLUGS].join(", ")}`);

  const { bySlug } = buildTruth();
  console.log(`Truth NK (JSON): ${bySlug.size} sản phẩm` + (ONLY_SLUGS ? " (đã lọc)" : ""));

  const dbProducts = await prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(ONLY_SLUGS ? { slug: { in: [...ONLY_SLUGS] } } : {}),
      variants: { some: { attributes: { path: ["source"], equals: "NGUYEN_KIM" } } },
    },
    select: {
      id: true,
      slug: true,
      description: true,
      descriptionImages: true,
      images: { select: { id: true, url: true, displayOrder: true, isPrimary: true }, orderBy: { displayOrder: "asc" } },
    },
  });
  console.log(`DB NK: ${dbProducts.length} sản phẩm`);

  let needDesc = 0, needGallery = 0, overlap = 0, staleDesc = 0;
  const descOps: { id: string; slug: string; want: string[]; have: string[]; rebuildDesc: string | null }[] = [];
  const galleryOps: { id: string; slug: string; want: string[]; have: string[] }[] = [];

  for (const db of dbProducts) {
    const truth = bySlug.get(db.slug);
    if (!truth) continue;

    const haveDesc = db.descriptionImages ?? [];
    const haveGallery = db.images.map((i) => i.url);
    const wantDesc = truth.descPositional;
    const wantGallery = truth.gallery;

    // Kiểm tra nhiễm: desc chứa gallery URL hoặc cloudinary hoặc rỗng sai vị trí
    const haveSet = new Set(haveGallery);
    const hasOverlap = haveDesc.some((u) => haveSet.has(u));
    const hasStale = haveDesc.some(isDead);
    if (hasOverlap) overlap++;
    if (hasStale) staleDesc++;

    // So sánh desc: phải khớp positional (bao gồm "" placeholders)
    const descSame = haveDesc.length === wantDesc.length && haveDesc.every((u, i) => u === wantDesc[i]);
    // Nếu wantDesc toàn "" (không còn ảnh sống) thì bỏ qua — không ghi rác
    const wantHasLive = wantDesc.some((u) => u && !isDead(u));
    if (!descSame && wantHasLive) {
      const currentHasNoStale = !hasStale && haveDesc.length > 0;
      const overlapWithWant = haveDesc.filter((u) => u && !isDead(u) && wantDesc.includes(u)).length;
      if (currentHasNoStale && overlapWithWant > 0) {
        // Giữ nguyên do admin sửa tay có giao với truth
      } else {
        // Không đụng description text khi đang dùng positional "" placeholders.
        // Frontend bỏ qua "" tự nhiên, giữ nguyên text gốc để không lệch marker.
        descOps.push({ id: db.id, slug: db.slug, want: wantDesc, have: haveDesc, rebuildDesc: null });
        needDesc++;
      }
    }

    // So sánh gallery: DB phải chứa đúng wantGallery (không chứa desc URL, không demoted)
    // Nếu JSON truth rỗng (230 SP NK images: []) thì KHÔNG đụng gallery — tránh xoá sạch.
    if (wantGallery.length === 0) {
      // skip
    } else {
      const gallerySame = haveGallery.length === wantGallery.length && haveGallery.every((u, i) => u === wantGallery[i]);
      const hasDemoted = db.images.some((i) => (i.displayOrder ?? 0) >= 1000);
      if (!gallerySame || hasDemoted) {
        galleryOps.push({ id: db.id, slug: db.slug, want: wantGallery, have: haveGallery });
        needGallery++;
      }
    }
  }

  console.log(`\nThống kê nhiễm:`);
  console.log(`  Desc chứa gallery (overlap): ${overlap}`);
  console.log(`  Desc còn cloudinary: ${staleDesc}`);
  console.log(`\nSẽ sửa:`);
  console.log(`  Desc (positional): ${needDesc} SP`);
  console.log(`  Gallery (ProductImage): ${needGallery} SP`);
  for (const o of descOps.slice(0, 8)) {
    console.log(`  [desc] ${o.slug.slice(0, 55).padEnd(55)} ${o.have.length} -> ${o.want.length} (${o.want.filter(Boolean).length} live)`);
  }
  if (descOps.length > 8) console.log(`  ... và ${descOps.length - 8} SP desc nữa`);
  for (const o of galleryOps.slice(0, 8)) {
    console.log(`  [gallery] ${o.slug.slice(0, 52).padEnd(52)} ${o.have.length} -> ${o.want.length}`);
  }
  if (galleryOps.length > 8) console.log(`  ... và ${galleryOps.length - 8} SP gallery nữa`);

  if (!APPLY) {
    console.log("\nChưa ghi. Chạy lại với APPLY=1 để áp dụng.");
    console.log("Gợi ý sau khi APPLY: kiểm tra gallery/mô tả trên trang chi tiết 2 SP mẫu.");
    return;
  }

  // Ghi desc: chỉ đổi descriptionImages, KHÔNG đụng description text khi dùng positional placeholders.
  const dbById = new Map(dbProducts.map((p) => [p.id, p]));
  for (const op of descOps) {
    const cur = dbById.get(op.id);
    const update: any = { descriptionImages: op.want };
    // rebuildDesc hiện luôn null cho NK (giữ positional), chỉ ghi khi future dùng.
    if (op.rebuildDesc !== null && op.rebuildDesc !== cur?.description) {
      update.description = op.rebuildDesc;
    }
    await prisma.product.update({ where: { id: op.id }, data: update });
  }
  console.log(`\nĐã ghi ${descOps.length} desc.`);

  // Ghi gallery: update in-place theo displayOrder, giữ variantId nếu có.
  for (const op of galleryOps) {
    const curProd = dbById.get(op.id);
    const existing = curProd?.images ?? [];
    // Map existing by order; preserve variantId
    const byOrder = new Map(existing.map((im) => [im.displayOrder, im]));
    // Xoá ảnh thừa
    if (existing.length > op.want.length) {
      const toDelete = existing.slice(op.want.length).map((im) => im.id);
      if (toDelete.length) await prisma.productImage.deleteMany({ where: { id: { in: toDelete } } });
    }
    for (let idx = 0; idx < op.want.length; idx++) {
      const url = op.want[idx];
      const ex = existing[idx] ?? byOrder.get(idx);
      if (ex) {
        if (ex.url !== url || ex.displayOrder !== idx || (idx === 0) !== !!ex.isPrimary) {
          await prisma.productImage.update({ where: { id: ex.id }, data: { url, displayOrder: idx, isPrimary: idx === 0 } });
        }
      } else {
        await prisma.productImage.create({ data: { productId: op.id, url, alt: op.slug, isPrimary: idx === 0, displayOrder: idx } });
      }
    }
    // Nếu có ảnh demoted ngoài range (displayOrder >=1000), xoá chúng (đã tách khỏi gallery)
    const demoted = existing.filter((im) => (im.displayOrder ?? 0) >= 1000);
    if (demoted.length) {
      await prisma.productImage.deleteMany({ where: { id: { in: demoted.map((d) => d.id) } } });
    }
  }
  console.log(`Đã ghi ${galleryOps.length} gallery.`);

  // Verify nhanh
  const verify = await prisma.$queryRawUnsafe<{ slug: string; n: number; overlap: number }[]>(`
    SELECT p.slug, cardinality(p."descriptionImages")::int as n,
           (SELECT count(*)::int FROM unnest(p."descriptionImages") d WHERE d = ANY(array_agg(i.url))) as overlap
    FROM "Product" p JOIN "ProductImage" i ON i."productId"=p.id
    JOIN "Variant" v ON v."productId"=p.id
    WHERE v.attributes->>'source'='NGUYEN_KIM' AND p."deletedAt" IS NULL
      ${ONLY_SLUGS ? `AND p.slug IN (${[...ONLY_SLUGS].map((s) => `'${s.replace(/'/g, "''")}'`).join(",")})` : ""}
    GROUP BY p.id
    HAVING (SELECT count(*)::int FROM unnest(p."descriptionImages") d WHERE d = ANY(array_agg(i.url))) > 0
    LIMIT 5
  `);
  if (verify.length) {
    console.log(`\n⚠️  Còn ${verify.length} SP overlap sau khi sửa (mẫu):`, verify.map((r) => r.slug));
  } else {
    console.log("\n✅ Verify: không còn overlap gallery/desc.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
