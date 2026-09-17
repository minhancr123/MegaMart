/**
 * Nạp dữ liệu sản phẩm đã cào (crawler/out/megamart-products.json) vào database.
 *
 *   npx tsx prisma/import-crawled.ts                        # nạp file mặc định
 *   npx tsx prisma/import-crawled.ts --file ./data.json     # nạp file khác
 *   npx tsx prisma/import-crawled.ts --dry-run              # chỉ kiểm tra, không ghi DB
 *   npx tsx prisma/import-crawled.ts --replace-images       # xoá ảnh cũ rồi ghi lại
 *
 * Script chỉ upsert (theo Category.slug / Product.slug / Variant.sku) nên chạy
 * lại nhiều lần vẫn an toàn, không đụng tới dữ liệu seed sẵn có.
 *
 * Chống trùng đa nguồn (option C): cùng 1 máy thật cào từ 2 nguồn khác nhau
 * (tên đảo thứ tự, SKU khác, giá khác) sẽ có slug khác nhau. Trước khi tạo
 * Product mới, script tách mã model khỏi tên (token alnum ≥6 ký tự vừa có
 * chữ vừa có số, vd HWS700D) và tìm SP sẵn có cùng mã + cùng brand:
 *   - khớp → gộp variants/ảnh vào SP sẵn có (giá các nguồn hiện thành range),
 *     KHÔNG ghi đè mô tả/descImages/soldCount đã có (giữ nội dung AI enrich).
 *   - không khớp → tạo mới như cũ.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

type CrawledImage = {
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  displayOrder?: number;
};

type CrawledVariant = {
  sku: string;
  price: number;
  salePrice?: number | null;
  discountPercent?: number | null;
  stock?: number;
  attributes?: Record<string, unknown> | null;
};

type CrawledProduct = {
  slug: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  descriptionImages?: Array<string | { url: string }>;
  categorySlug: string;
  soldCount?: number;
  source: string;
  sourceUrl: string;
  images: CrawledImage[];
  variants: CrawledVariant[];
};

type Payload = {
  meta: Record<string, unknown>;
  categories: { slug: string; name: string; parentSlug: string | null }[];
  products: CrawledProduct[];
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

const NOISE_CODES = new Set([
  '4KULTRA',
  'FULLHD',
  'SMARTTV',
  'ULTRAHD',
  'GOOGLETV',
  'MINILED',
  'ECOINVERTER',
  'DIGITALINVERTER',
  'PROINVERTER',
  'DUALINVERTER',
  'AIINVERTER',
]);

/**
 * Tách mã model khỏi tên SP: token alnum vừa có chữ vừa có số, dài ≥5 ký tự
 * (vd HWS700D, SJX215VDG, MP280S, 55QNED80BSA).
 * Loại bỏ nhiễu như 4KULTRA, 55INCH, 100KG, 2024.
 */
export function extractModelCodes(name: string): string[] {
  const clean = (name || '').toUpperCase();
  const codes = new Set<string>();

  // 1. Split theo khoảng trắng + gạch nối/gạch dưới (vd K-55S30 → K, 55S30)
  const tokens = clean.split(/[\s\-_]+/);
  for (const tok of tokens) {
    const stripped = tok.replace(/[^A-Z0-9]/g, '');
    if (
      stripped.length >= 5 &&
      /[A-Z]/.test(stripped) &&
      /[0-9]/.test(stripped)
    ) {
      if (
        !NOISE_CODES.has(stripped) &&
        !/^\d+(KG|L|W|HP|INCH|V|M|MM|CM|GB|TB|MAH|HZ)$/.test(stripped)
      ) {
        codes.add(stripped);
      }
    }
  }

  // 2. Thử ghép chữ + số trong từ bọc gạch nối (vd HW-S700D → HWS700D, SJ-X215V-DG → SJX215VDG)
  for (const w of clean.split(/\s+/)) {
    const stripped = w.replace(/[^A-Z0-9]/g, '');
    if (
      stripped.length >= 6 &&
      /[A-Z]/.test(stripped) &&
      /[0-9]/.test(stripped)
    ) {
      if (
        !NOISE_CODES.has(stripped) &&
        !/^\d+(KG|L|W|HP|INCH|V|M|MM|CM|GB|TB|MAH|HZ)$/.test(stripped)
      ) {
        codes.add(stripped);
      }
    }
  }

  return [...codes];
}

const normBrand = (b?: string | null) =>
  (b || '').trim().toLowerCase();

const DRY_RUN = hasFlag('dry-run');
const REPLACE_IMAGES = hasFlag('replace-images');
const FILE = resolve(
  arg('file') ?? resolve(__dirname, '../../crawler/out/megamart-products.json'),
);

async function main() {
  console.log(`📦 Đọc dữ liệu: ${FILE}`);
  const payload: Payload = JSON.parse(readFileSync(FILE, 'utf-8'));
  console.log(
    `   ${payload.products.length} sản phẩm • ${payload.categories.length} danh mục • nguồn: ${(payload.meta.sources as string[])?.join(', ')}`,
  );
  if (DRY_RUN) console.log('   (chế độ --dry-run: không ghi vào database)\n');

  // 1. Danh mục (cha đã được sắp trước con trong file)
  const categoryIds = new Map<string, string>();
  const reparented: string[] = [];
  for (const cat of payload.categories) {
    const parentId = cat.parentSlug ? categoryIds.get(cat.parentSlug) : undefined;

    // Cảnh báo khi slug đã tồn tại nhưng đang nằm dưới danh mục cha khác:
    // import sẽ chuyển nó sang cây danh mục mới (sản phẩm cũ vẫn giữ nguyên).
    const current = await prisma.category.findUnique({
      where: { slug: cat.slug },
      select: { id: true, parentId: true, parent: { select: { slug: true } } },
    });
    if (current && (current.parentId ?? null) !== (parentId ?? null)) {
      reparented.push(
        `${cat.slug}: ${current.parent?.slug ?? '(gốc)'} -> ${cat.parentSlug ?? '(gốc)'}`,
      );
    }

    if (DRY_RUN) {
      categoryIds.set(cat.slug, current?.id ?? `dry-${cat.slug}`);
      continue;
    }
    const saved = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, parentId: parentId ?? null, active: true },
      create: { slug: cat.slug, name: cat.name, parentId: parentId ?? null },
    });
    categoryIds.set(cat.slug, saved.id);
  }
  console.log(`📁 Danh mục: ${categoryIds.size}`);
  if (reparented.length) {
    console.log(`↪️  ${reparented.length} danh mục sẵn có được chuyển sang cây mới:`);
    reparented.forEach((r) => console.log(`   - ${r}`));
  }

  // 2. Sản phẩm + ảnh + variant
  let created = 0;
  let updated = 0;
  let merged = 0;
  let variantCount = 0;
  let imageCount = 0;
  const skipped: string[] = [];
  const mergedLog: string[] = [];
  const ambiguousLog: string[] = [];

  // Preload 1 lần để match mã model (rẻ hơn query từng SP; ~vài nghìn dòng).
  // Dry-run cũng cần đọc để báo kế hoạch gộp (chỉ đọc, không ghi).
  const allProducts = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      description: true,
      descriptionImages: true,
      variants: { select: { id: true } },
    },
  });
  const byCode = new Map<string, typeof allProducts>();
  for (const prod of allProducts) {
    for (const code of extractModelCodes(prod.name)) {
      const arr = byCode.get(code) ?? [];
      arr.push(prod);
      byCode.set(code, arr);
    }
  }

  /** Tìm SP sẵn có cùng mã model + cùng brand (trừ chính slug đang xét). */
  function findMergeTarget(
    p: CrawledProduct,
  ): (typeof allProducts)[number] | null {
    const seen = new Set<string>();
    const cands: typeof allProducts = [];
    for (const code of extractModelCodes(p.name)) {
      for (const prod of byCode.get(code) ?? []) {
        if (prod.slug === p.slug || seen.has(prod.id)) continue;
        seen.add(prod.id);
        // Brand khác nhau rõ ràng → không phải cùng máy (tránh gộp oan).
        const bNew = normBrand(p.brand);
        const bOld = normBrand(prod.brand);
        if (bNew && bOld && bNew !== bOld) continue;
        cands.push(prod);
      }
    }
    if (cands.length === 0) return null;
    if (cands.length === 1) return cands[0];
    // Nhiều ứng viên (data cũ đã trùng): ưu tiên SP có mô tả, rồi nhiều variant nhất.
    const ranked = [...cands].sort(
      (a, b) =>
        Number(!!b.description) - Number(!!a.description) ||
        b.variants.length - a.variants.length,
    );
    ambiguousLog.push(
      `${p.slug} [${extractModelCodes(p.name).join(',')}] khớp ${cands.length} SP → chọn ${ranked[0].slug}`,
    );
    return ranked[0];
  }

  for (const p of payload.products) {
    const categoryId = categoryIds.get(p.categorySlug);
    if (!categoryId) {
      skipped.push(`${p.slug} (không có danh mục ${p.categorySlug})`);
      continue;
    }
    if (!p.variants?.length || !p.variants[0].price) {
      skipped.push(`${p.slug} (thiếu giá)`);
      continue;
    }
    const slugMatch = await prisma.product.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    });
    // Merge đa nguồn chỉ khi slug chưa tồn tại.
    const mergeTarget = !slugMatch ? findMergeTarget(p) : null;

    if (DRY_RUN) {
      if (mergeTarget) {
        merged++;
        mergedLog.push(`${p.slug} [${p.source}] → gộp vào ${mergeTarget.slug}`);
      } else if (slugMatch) {
        updated++;
      } else {
        created++;
      }
      variantCount += p.variants.length;
      imageCount += p.images.length;
      continue;
    }

    const hasDescImages = Array.isArray((p as any).descriptionImages);
    const descImages = ((p.descriptionImages ?? []) as Array<string | { url: string }>)
      .map((d) => (typeof d === "string" ? d : d?.url))
      .filter((u): u is string => !!u);
    let product: { id: string };
    if (mergeTarget) {
      // GỘP vào SP sẵn có: giữ tên/danh mục/mô tả/soldCount (có thể đã AI-enrich),
      // chỉ mở lại + thêm variants/ảnh mới. Không bao giờ tạo Product mới ở đây.
      product = await prisma.product.update({
        where: { id: mergeTarget.id },
        data: {
          ...(mergeTarget.description ? {} : { description: p.description ?? null }),
          ...(hasDescImages && !(mergeTarget.descriptionImages?.length)
            ? { descriptionImages: descImages }
            : {}),
          deletedAt: null,
        },
        select: { id: true },
      });
      merged++;
      mergedLog.push(`${p.slug} [${p.source}] → gộp vào ${mergeTarget.slug}`);
    } else {
      product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          description: p.description ?? null,
          // Chỉ ghi đè khi JSON có key (tránh xoá ảnh mô tả của lô đã enrich
          // khi import lại file cũ).
          ...(hasDescImages ? { descriptionImages: descImages } : {}),
          brand: p.brand ?? null,
          categoryId,
          soldCount: p.soldCount ?? 0,
          deletedAt: null,
        },
        create: {
          slug: p.slug,
          name: p.name,
          description: p.description ?? null,
          descriptionImages: descImages,
          brand: p.brand ?? null,
          categoryId,
          soldCount: p.soldCount ?? 0,
        },
      });
      if (slugMatch) {
        updated++;
      } else {
        created++;
      }
    }

    // Ảnh: mặc định chỉ thêm ảnh chưa có, --replace-images thì ghi đè toàn bộ
    if (REPLACE_IMAGES) {
      await prisma.productImage.deleteMany({ where: { productId: product.id } });
    }
    const currentUrls = new Set(
      (
        await prisma.productImage.findMany({
          where: { productId: product.id },
          select: { url: true },
        })
      ).map((i) => i.url),
    );
    const newImages = p.images.filter((img) => !currentUrls.has(img.url));
    if (newImages.length) {
      await prisma.productImage.createMany({
        data: newImages.map((img, idx) => ({
          productId: product.id,
          url: img.url,
          alt: img.alt ?? p.name,
          isPrimary: currentUrls.size === 0 && idx === 0,
          displayOrder: img.displayOrder ?? currentUrls.size + idx,
        })),
      });
      imageCount += newImages.length;
    }

    // Variant
    for (const v of p.variants) {
      await prisma.variant.upsert({
        where: { sku: v.sku },
        update: {
          productId: product.id,
          price: BigInt(v.price),
          salePrice: v.salePrice ? BigInt(v.salePrice) : null,
          discountPercent: v.discountPercent ?? null,
          stock: v.stock ?? 0,
          attributes: (v.attributes ?? {}) as any,
        },
        create: {
          productId: product.id,
          sku: v.sku,
          price: BigInt(v.price),
          salePrice: v.salePrice ? BigInt(v.salePrice) : null,
          discountPercent: v.discountPercent ?? null,
          stock: v.stock ?? 0,
          attributes: (v.attributes ?? {}) as any,
        },
      });
      variantCount++;
    }
  }

  console.log(`🆕 Sản phẩm mới:   ${created}`);
  console.log(`♻️  Sản phẩm cập nhật: ${updated}`);
  console.log(`🔀 Gộp đa nguồn:    ${merged} (variants/ảnh mới chui vào SP sẵn có)`);
  console.log(`🎯 Variant:        ${variantCount}`);
  console.log(`🖼️  Ảnh thêm mới:   ${imageCount}`);
  if (mergedLog.length) {
    console.log(`🔀 Chi tiết gộp (${mergedLog.length}):`);
    mergedLog.slice(0, 15).forEach((s) => console.log(`   - ${s}`));
    if (mergedLog.length > 15) console.log(`   ... và ${mergedLog.length - 15} dòng khác`);
  }
  if (ambiguousLog.length) {
    console.log(`⚠️  Khớp nhiều SP, đã chọn 1 (${ambiguousLog.length} — kiểm tra tay nếu nghi):`);
    ambiguousLog.slice(0, 10).forEach((s) => console.log(`   - ${s}`));
  }
  if (skipped.length) {
    console.log(`⚠️  Bỏ qua ${skipped.length}:`);
    skipped.slice(0, 10).forEach((s) => console.log(`   - ${s}`));
    if (skipped.length > 10) console.log(`   ... và ${skipped.length - 10} sản phẩm khác`);
  }
  console.log(DRY_RUN ? '\n✅ Dry-run xong (chưa ghi DB).' : '\n✅ Nạp dữ liệu xong.');
}

if (process.argv[1]?.includes('import-crawled')) {
  main()
    .catch((e) => {
      console.error('❌ Import thất bại:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
