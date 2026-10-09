/**
 * Dò các Product rời rạc (do crawler xé lẻ theo màu/cấu hình) rồi gộp thành
 * 1 Product nhiều Variant.
 *
 * Thuật toán dò cụm (HIGH confidence only):
 *  - Scope bắt buộc: cùng brand (chuẩn hóa) + cùng categoryId.
 *  - Bóc token biến thể khỏi tên: màu sắc (Việt/Anh), RAM/dung lượng
 *    (GB/TB), màn hình (inch), cụm trong ngoặc. Số model/generation giữ
 *    nguyên trong base để "iPhone 15" không lẫn "iPhone 16".
 *  - baseFamilyKey = brand | categoryId | base. Tên khác nhau CHỈ ở token
 *    đã bóc mới gom (không fuzzy mờ).
 *  - Keeper = nhiều ảnh nhất, rồi soldCount cao nhất.
 *
 * Gộp an toàn (giống ProductsService.mergeProducts):
 *  - Giữ nguyên Variant.id (OrderItem/CartItem không gãy).
 *  - Ảnh donor gán variantId để gallery đổi theo màu.
 *  - Wishlist/Compare/Recommend xóa trùng user trước (khỏi vỡ unique).
 *  - Review + soldCount + descriptionImages dồn về keeper.
 *  - Ghi ProductRedirect rồi mới xóa donor (link cũ redirect, không 404).
 *
 * Chạy (từ server/):
 *   npx tsx src/scripts/cluster-and-merge-products.ts            # dry-run
 *   CLUSTER_KEY="oppo" npx tsx src/scripts/cluster-and-merge-products.ts  # lọc cụm
 *   APPLY=1 npx tsx src/scripts/cluster-and-merge-products.ts   # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { matchImageVariant } from "../utils/image-variant-matcher";

const prisma = new PrismaClient();

/* ---------------- chuẩn hóa ---------------- */

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function stripAccents(s: string): string {
  // NFD không phân rã được đ/Đ (gạch ngang nét) -> thay tay trước.
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/* ---------------- chuẩn hóa ---------------- */

/** Màu sắc (không dấu) để bóc token. Dài trước để "xanh lam khoi" ăn trước "xanh". */
const COLORS = [
  "xanh lam khoi",
  "xanh sa mac",
  "xanh ngoc",
  "xanh duong",
  "xanh la",
  "deep blue",
  "midnight",
  "starlight",
  "desert",
  "titanium",
  "ceramic",
  "den",
  "trang",
  "do",
  "xanh",
  "vang",
  "tim",
  "hong",
  "xam",
  "bac",
  "nau",
  "cam",
  "be",
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "pink",
  "grey",
  "gray",
  "silver",
  "gold",
  "brown",
  "orange",
  "beige",
];

/** Bóc token biến thể. Quy tắc an toàn (review P0-1/P0-2):
 * - Cụm ngoặc CHỈ bị xóa khi toàn bộ nội dung đã bóc thành token
 *   (màu/dung lượng). Còn sót chữ/số khác (Gen 8, 4G/5G, mã model) -> giữ
 *   nguyên trong base để không gộp nhầm khác thế hệ.
 * - GB/TB phải đứng độc lập, không dính liền model kiểu "SA-2375GB". */
function extractTokens(name: string): { base: string; tokens: string[] } {
  const tokens: string[] = [];
  let work = ` ${stripAccents(norm(name))} `;
  const push = (t: string) => {
    const v = t.replace(/\s+/g, "");
    if (v && !tokens.includes(v)) tokens.push(v);
  };
  const GB = String.raw`(?<![-\w])\d{2,4}\s*(?:gb|tb)\b`;

  // Mọi cụm ngoặc: bóc token bên trong, giữ lại nếu còn sót định danh.
  work = work.replace(/\(([^)]*)\)/g, (_m, inside: string) => {
    const inner = ` ${inside.trim()} `;
    const before = tokens.length;
    for (const c of COLORS) {
      if (inner.includes(` ${c} `) || inner.includes(` ${c}/`) || inner.includes(`/${c} `)) {
        push(c);
      }
    }
    for (const m of inner.match(new RegExp(GB, "g")) ?? []) push(m);
    const rest = inner
      .replace(new RegExp(GB, "g"), " ")
      .replace(/[\s\/\-,.]+/g, " ");
    // Xóa tiếp các màu đã bóc khỏi phần còn lại để kiểm tra.
    let leftover = ` ${rest} `;
    for (const c of COLORS) {
      leftover = leftover.split(` ${c} `).join(" ");
    }
    if (tokens.length === before || /[a-z0-9]/.test(leftover)) {
      // Không bóc được gì hoặc còn sót định danh (Gen, 4G, mã máy...): giữ.
      return ` ${inside.trim()} `;
    }
    return " ";
  });

  // Spec inline: "4GB/128GB" (giữ phần sau), "RAM 8GB", "256GB", "43 inch".
  for (const m of work.match(/\d{1,2}\s*gb\s*\/\s*\d{2,4}\s*(?:gb|tb)/g) ?? []) {
    push(m);
  }
  work = work.replace(/\d{1,2}\s*gb\s*\/\s*(\d{2,4}\s*(?:gb|tb))/g, (_s, rest: string) => {
    push(rest);
    return " ";
  });
  for (const m of work.match(new RegExp(`\\b${GB}`, "g")) ?? []) push(m);
  work = work.replace(new RegExp(`\\b${GB}`, "g"), " ");
  for (const m of work.match(/\b\d{2}(?:\.\d)?\s*(?:inch|")\b/g) ?? []) push(m);
  work = work.replace(/\b\d{2}(?:\.\d)?\s*(?:inch|")\b/g, " ");

  // Màu inline còn lại ("A6T 4GB/128GB Xanh").
  for (const c of COLORS) {
    const re = new RegExp(`(^|\\s|/)${c.replace(/ /g, "\\s+")}(?=\\s|/|$)`, "g");
    if (re.test(work)) {
      push(c);
      work = work.replace(re, " ");
    }
  }

  const base = work.replace(/[\s/\-_,.()]+/g, " ").trim().replace(/\s+/g, " ");
  return { base, tokens };
}

type Row = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  categoryId: string | null;
  soldCount: number;
  imageCount: number;
  variantCount: number;
};

type Cluster = {
  key: string;
  base: string;
  brand: string;
  categoryId: string | null;
  keeper: Row;
  donors: Row[];
  kind: "SPEC_COLOR" | "DUPLICATE";
};

async function main() {
  const apply = process.env.APPLY === "1";
  const keyFilter = norm(process.env.CLUSTER_KEY || "");
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chỉ đọc, không ghi DB)");

  const all = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      categoryId: true,
      soldCount: true,
      createdAt: true,
      _count: { select: { images: true, variants: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Quét ${all.length} product active`);

  // Pass 1: trùng tên chuẩn hóa 100% (cào trùng URL), kể cả khi không có
  // token màu/spec (P1-9: "Máy giặt Toshiba 9kg" bị cào lặp 2 lần).
  const exactGroups = new Map<string, Row[]>();
  for (const p of all) {
    const brand = norm(p.brand);
    const key = `${brand}|${p.categoryId ?? "-"}|${norm(p.name)}`;
    const arr = exactGroups.get(key) ?? [];
    arr.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand ?? "",
      categoryId: p.categoryId,
      soldCount: Number(p.soldCount ?? 0),
      imageCount: p._count.images,
      variantCount: p._count.variants,
    });
    exactGroups.set(key, arr);
  }
  const usedIds = new Set<string>();
  let clusters: Cluster[] = [];
  for (const [key, rows] of exactGroups) {
    if (rows.length < 2) continue;
    if (keyFilter && !key.includes(keyFilter)) continue;
    const sorted = [...rows].sort(
      (a, b) => b.imageCount - a.imageCount || b.soldCount - a.soldCount,
    );
    for (const r of rows) usedIds.add(r.id);
    clusters.push({
      key: `dup:${key}`,
      base: norm(sorted[0].name),
      brand: norm(sorted[0].brand),
      categoryId: sorted[0].categoryId,
      keeper: sorted[0],
      donors: sorted.slice(1),
      kind: "DUPLICATE",
    });
  }

  // Pass 2: gom theo brand | category | base, khác nhau CHỈ ở token màu/spec.
  const groups = new Map<string, { base: string; brand: string; categoryId: string | null; rows: Row[] }>();
  for (const p of all) {
    if (usedIds.has(p.id)) continue; // đã vào cụm DUPLICATE
    const { base, tokens } = extractTokens(p.name);
    if (tokens.length === 0) continue; // không bóc được token -> bỏ qua
    if (!base) continue;
    const brand = norm(p.brand);
    const key = `${brand}|${p.categoryId ?? "-"}|${base}`;
    const g = groups.get(key) ?? { base, brand, categoryId: p.categoryId, rows: [] };
    g.rows.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand ?? "",
      categoryId: p.categoryId,
      soldCount: Number(p.soldCount ?? 0),
      imageCount: p._count.images,
      variantCount: p._count.variants,
    });
    groups.set(key, g);
  }

  // (Pass 1 DUPLICATE đã thêm ở trên.)
  for (const [key, g] of groups) {
    if (g.rows.length < 2) continue;
    if (keyFilter && !key.includes(keyFilter)) continue;
    const sorted = [...g.rows].sort(
      (a, b) => b.imageCount - a.imageCount || b.soldCount - a.soldCount,
    );
    // Trùng tên chuẩn hóa 100% mà khác id -> DUPLICATE (cào trùng URL).
    const names = new Set(sorted.map((r) => norm(r.name)));
    clusters.push({
      key,
      base: g.base,
      brand: g.brand,
      categoryId: g.categoryId,
      keeper: sorted[0],
      donors: sorted.slice(1),
      kind: names.size === 1 ? "DUPLICATE" : "SPEC_COLOR",
    });
  }
  clusters.sort((a, b) => b.donors.length - a.donors.length);

  const totalDonors = clusters.reduce((s, c) => s + c.donors.length, 0);
  console.log(`Cụm HIGH: ${clusters.length} (gộp ${totalDonors} bản ghi rời rạc)`);
  for (const c of clusters.slice(0, 15)) {
    console.log(`  [${c.kind} x${c.donors.length + 1}] ${c.base.slice(0, 60)} | keeper: ${c.keeper.name.slice(0, 50)}`);
  }

  // Xuất kế hoạch để duyệt tay trước khi APPLY.
  const outDir = path.resolve(__dirname, "../../..", "crawler", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "merge-plan.json");
  fs.writeFileSync(outPath, JSON.stringify(clusters, null, 2), "utf-8");
  console.log(`Đã ghi kế hoạch: ${outPath}`);

  if (!apply) {
    console.log("Dry-run xong, chưa ghi DB. Duyệt merge-plan.json rồi chạy APPLY=1.");
    return;
  }

  // APPLY: gộp từng cụm trong transaction riêng (lỗi cụm nào không lan cụm khác).
  let ok = 0;
  let fail = 0;
  for (const c of clusters) {
    try {
      await mergeCluster(c.keeper.id, c.donors.map((d) => d.id));
      ok += 1;
      console.log(`  OK [x${c.donors.length + 1}] ${c.base.slice(0, 55)}`);
    } catch (e) {
      fail += 1;
      console.error(`  FAIL ${c.base.slice(0, 55)}: ${(e as Error).message}`);
    }
  }
  console.log(`\nXong. Gộp ${ok} cụm, lỗi ${fail} cụm.`);
}

async function mergeCluster(keeperId: string, donorIds: string[]) {
  const donors = [...new Set(donorIds.filter((d) => d && d !== keeperId))];
  const donorRows = await prisma.product.findMany({
    where: { id: { in: donors }, deletedAt: null },
    include: {
      variants: { select: { id: true } },
      images: { orderBy: { displayOrder: "asc" }, select: { id: true, variantId: true, isPrimary: true } },
    },
  });
  if (donorRows.length !== donors.length) throw new Error("thiếu donor (đã xóa/trùng?)");

  await prisma.$transaction(
    async (tx) => {
      const agg: any = await (tx as any).productImage.aggregate({
        where: { productId: keeperId },
        _max: { displayOrder: true },
      });
      let nextOrder = (agg?._max?.displayOrder ?? -1) + 1;
      // P1-7: keeper chưa có ảnh thì giữ primary cho ảnh donor đầu tiên.
      let primaryAssigned = (agg?._max?.displayOrder ?? -1) >= 0;
      let soldAdd = 0;
      const descSet = new Set<string>();
      let bestDesc: string | null = null;

      // Ảnh NULL của keeper là ảnh của biến thể gốc: gán về đúng variant
      // (khớp chắc chắn theo SKU trong URL thì gán, còn lại giữ NULL).
      // Nếu không, ảnh màu của keeper bị coi là ảnh chung và hiện ké sang
      // mọi biến thể sau khi gộp.
      // Chốt an toàn: chỉ gán khi keeper có đúng 1 variant và mỗi donor có
      // đúng 1 variant kèm ít nhất 1 ảnh — khi đó mọi variant sau gộp đều
      // có ảnh, không ai bị trắng gallery. Còn lại giữ NULL như cũ.
      const keeperVariants: { id: string; sku: string }[] = await tx.variant.findMany({
        where: { productId: keeperId },
        select: { id: true, sku: true },
      });
      const donorsSafe = donorRows.every(
        (d: any) => d.variants?.length === 1 && d.images?.length > 0,
      );
      if (keeperVariants.length === 1 && donorsSafe) {
        const keeperNulls: { id: string; url: string }[] = await (tx as any).productImage.findMany({
          where: { productId: keeperId, variantId: null },
          select: { id: true, url: true },
        });
        for (const img of keeperNulls) {
          const vid = matchImageVariant(img.url, keeperVariants);
          if (vid) {
            await (tx as any).productImage.update({
              where: { id: img.id },
              data: { variantId: vid },
            });
          }
        }
      }

      for (const donor of donorRows) {
        // P1-8: thao tác theo productId trong tx (không snapshot id ngoài tx).
        const freshVariants: any[] = await tx.variant.findMany({
          where: { productId: donor.id },
          select: { id: true },
        });
        const variantIds = freshVariants.map((v: any) => v.id);
        if (variantIds.length > 0) {
          await tx.variant.updateMany({
            where: { productId: donor.id },
            data: { productId: keeperId },
          });
        }
        const freshImages: any[] = await (tx as any).productImage.findMany({
          where: { productId: donor.id },
          orderBy: { displayOrder: "asc" },
        });
        for (const img of freshImages) {
          const keepPrimary = Boolean(img.isPrimary) && !primaryAssigned;
          if (keepPrimary) primaryAssigned = true;
          await (tx as any).productImage.update({
            where: { id: img.id },
            data: {
              productId: keeperId,
              variantId: img.variantId ?? variantIds[0] ?? null,
              displayOrder: nextOrder++,
              isPrimary: keepPrimary,
            },
          });
        }
        for (const model of ["wishlistItem", "compareItem"] as const) {
          const delegate = (tx as any)[model];
          const keepers: any[] = await delegate.findMany({
            where: { productId: keeperId },
            select: { userId: true },
          });
          const dupIds = keepers.map((r: any) => r.userId);
          if (dupIds.length > 0) {
            await delegate.deleteMany({ where: { productId: donor.id, userId: { in: dupIds } } });
          }
          await delegate.updateMany({ where: { productId: donor.id }, data: { productId: keeperId } });
        }
        // P1-10 userRecommendation: trùng user thì giữ score cao hơn.
        {
          const delegate = (tx as any).userRecommendation;
          const donorRecs: any[] = await delegate.findMany({ where: { productId: donor.id } });
          for (const rec of donorRecs) {
            const keep = await delegate.findFirst({
              where: { productId: keeperId, userId: rec.userId },
            });
            if (!keep) {
              await delegate.update({ where: { id: rec.id }, data: { productId: keeperId } });
            } else if (Number(rec.score ?? 0) > Number((keep as any).score ?? 0)) {
              await delegate.update({ where: { id: (keep as any).id }, data: { score: rec.score, reason: rec.reason ?? (keep as any).reason } });
              await delegate.delete({ where: { id: rec.id } });
            } else {
              await delegate.delete({ where: { id: rec.id } });
            }
          }
        }
        await tx.review.updateMany({ where: { productId: donor.id }, data: { productId: keeperId } });
        soldAdd += Number((donor as any).soldCount ?? 0);
        for (const u of (donor as any).descriptionImages ?? []) if (u) descSet.add(String(u));
        const d = String((donor as any).description ?? "");
        if (d.length > (bestDesc?.length ?? 0)) bestDesc = d;
        // P0-4: redirect cũ đang trỏ vào donor phải trỏ sang keeper (khỏi
        // con trỏ rác), rồi upsert redirect donor -> keeper.
        await (tx as any).productRedirect.updateMany({
          where: { targetProductId: donor.id },
          data: { targetProductId: keeperId },
        });
        await (tx as any).productRedirect.upsert({
          where: { sourceId: donor.id },
          update: { sourceSlug: (donor as any).slug ?? null, targetProductId: keeperId },
          create: {
            sourceSlug: (donor as any).slug ?? null,
            sourceId: donor.id,
            targetProductId: keeperId,
          },
        });
        await tx.product.delete({ where: { id: donor.id } });
      }

      if (soldAdd > 0) {
        await tx.product.update({ where: { id: keeperId }, data: { soldCount: { increment: soldAdd } } });
      }
      // P1-6: keeper mô tả rỗng/ngắn thì lấy mô tả dài nhất của donor.
      const cur = await tx.product.findUnique({
        where: { id: keeperId },
        select: { description: true, descriptionImages: true },
      });
      const curDesc = String((cur as any)?.description ?? "");
      const patch: any = {};
      if (bestDesc && bestDesc.length > curDesc.length) patch.description = bestDesc;
      if (descSet.size > 0) {
        patch.descriptionImages = [...new Set([...((cur as any)?.descriptionImages ?? []), ...descSet])];
      }
      if (Object.keys(patch).length > 0) {
        await tx.product.update({ where: { id: keeperId }, data: patch });
      }
    },
    { maxWait: 10000, timeout: 30000 },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
