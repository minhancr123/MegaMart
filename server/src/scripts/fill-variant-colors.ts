/**
 * Điền trường colors cho các biến thể màu.
 *
 * Schema Variant.colors kiểu Json lưu mảng [{hex, name, imageUrl}] để UI hiện
 * swatch màu khi khách chọn biến thể. Crawler không điền, nên mọi biến thể
 * đang có colors = null và UI chỉ chọn được bằng SKU.
 *
 * Script đọc phần màu ở cuối tên sản phẩm ("… (Ceramic Pink/Rose Gold)") hoặc
 * trong SKU ("…-BLACK-LEATHE"), đối chiếu bảng màu phổ biến để gán hex, rồi
 * ghi vào colors. Biến thể không tìm được màu thì bỏ qua, không đoán bừa.
 *
 * Chạy (từ server/):
 *   npx ts-node src/scripts/fill-variant-colors.ts          # xem trước
 *   APPLY=1 npx ts-node src/scripts/fill-variant-colors.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

/** Bảng màu phổ biến ở Việt Nam, khoá là chuỗi không dấu viết thường. */
const PALETTE: Record<string, string> = {
  den: "#000000",
  black: "#000000",
  "den xanh": "#0B1D3A",
  trang: "#FFFFFF",
  white: "#FFFFFF",
  xam: "#808080",
  grey: "#808080",
  gray: "#808080",
  "xam dam": "#4A4A4A",
  bạc: "#C0C0C0",
  silver: "#C0C0C0",
  vang: "#FFD700",
  gold: "#FFD700",
  "vang kim": "#D4AF37",
  xanh: "#008000",
  green: "#008000",
  "xanh la": "#00A000",
  "xanh duong": "#1E90FF",
  blue: "#1E90FF",
  "xanh navy": "#1B2A4A",
  navy: "#1B2A4A",
  "xanh bien": "#0077BE",
  "xanh phong": "#4FC3F7",
  do: "#DC143C",
  red: "#DC143C",
  "do au": "#8B0000",
  "do dam": "#8B0000",
  burgundy: "#800020",
  maroon: "#800020",
  mau: "#9370DB",
  purple: "#9370DB",
  tím: "#9370DB",
  tim: "#800080",
  hong: "#FFC0CB",
  pink: "#FFC0CB",
  "hồng phấn": "#FFB6C1",
  "pink rose gold": "#B76E79",
  "rose gold": "#B76E79",
  rosegold: "#B76E79",
  // Màu cụ thể của dòng Dyson, các màu khác nhau phải khác mã.
  "ceramic pink": "#FFB3C7",
  "ceramic patina": "#C5C8B8",
  "amber silk": "#E8B88A",
  cam: "#FF8C00",
  orange: "#FF8C00",
  "cam aprikot": "#F0C088",
  apricot: "#F0C088",
  nâu: "#8B4513",
  brown: "#8B4513",
  "nau su": "#A0522D",
  be: "#F5F5DC",
  beige: "#F5F5DC",
  kem: "#FFF8DC",
  cream: "#FFF8DC",
  caramel: "#C68E17",
  "camo leather": "#6B5B3E",
  leather: "#6B5B3E",
  "deep blue": "#003087",
  midnight: "#191970",
  titanium: "#878681",
  "than anh kim": "#2B2B2B",
  "kim loai": "#C0C0C0",
  inox: "#B0B7BD",
  "xanh reu": "#004B87",
  "xanh than": "#2F4F4F",
  "xanh olive": "#708238",
  "xanh matcha": "#8FBC8F",
};

/**
 * Nhãn chứa từ khoá này không phải tên màu, chỉ là mô tả hoặc phụ kiện.
 * Ví dụ tên tivi "QA55LS03D (kèm giá treo ẩn)" — "kèm giá treo ẩn" không có
 * nghĩa là màu kem, nhưng bảng màu sẽ khớp vì chứa từ "kem"? Không, nhưng các
 * nhãn kiểu "100W, kèm 2 Micro, bạc" lại chứa đúng từ màu ở cuối nên vẫn hợp lệ.
 * Danh sách này chặn các cụm không phải màu đã gặp trong dữ liệu thật.
 */
const NOT_COLOR = [
  "gia treo",
  "hang",
  "tu",
  "khong",
  "qua",
  "kem",
  "trong",
  "hop",
  "hop xach",
  "tay",
  "dieu khien",
  "remote",
  "cap",
  "day",
  "pin",
  "sac",
  "bo",
  "trong hop",
];

/** Bỏ dấu và hạ chữ thường để so khớp khoá bảng màu. */
function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type Candidate = { label: string; source: "name" | "sku" };

/** Lấy nhãn màu từ ngoặc cuối tên, hoặc từ SKU nếu tên không có. */
function colorCandidates(name: string, sku: string): Candidate[] {
  const out: Candidate[] = [];
  const bracket = name.match(/\(([^)]+)\)\s*$/);
  if (bracket) {
    for (const part of bracket[1].split("/")) {
      if (part.trim()) out.push({ label: part.trim(), source: "name" });
    }
  }
  // SKU hay chứa màu: ...-BLACK-LEATHE-A91097
  const tail = sku.split("-").slice(-3, -1);
  for (const part of tail) {
    const t = part.trim();
    if (t && t.length > 2 && !/^\d+$/.test(t) && !/^[A-Z]{2,}\d/.test(t)) {
      out.push({ label: t, source: "sku" });
    }
  }
  return out;
}

/**
 * Thứ tự ưu tiên nhãn màu.
 *
 * Sau khi gộp các bản ghi cùng dòng, product chính giữ tên của mình nên mọi
 * biến thể đều thừa hưởng cùng một ngoặc màu, dù mỗi màu khác nhau. Với sản
 * phẩm nhiều biến thể phải đọc màu từ nguồn gốc theo SKU, nếu không thì tất cả
 * biến thể ra cùng một màu.
 */
function orderedCandidates(
  name: string,
  sku: string,
  variantCount: number,
  slug: string,
): Candidate[] {
  // Tên gốc trong dataset crawl còn phần màu riêng cho từng bản ghi.
  const original = originalNameFor(slug, sku);
  if (variantCount > 1 && original) {
    const out: Candidate[] = [];
    const bracket = original.match(/\(([^)]+)\)\s*$/);
    if (bracket) {
      for (const part of bracket[1].split("/")) {
        if (part.trim()) out.push({ label: part.trim(), source: "name" });
      }
    }
    if (out.length) return out;
  }

  const fromName: Candidate[] = [];
  const fromSku: Candidate[] = [];
  for (const c of colorCandidates(name, sku)) {
    (c.source === "name" ? fromName : fromSku).push(c);
  }
  return variantCount > 1 ? [...fromSku, ...fromName] : [...fromName, ...fromSku];
}

/** Cache slug -> tên gốc trong dataset crawl, lấy theo SKU. */
let originalNames: Map<string, string> | null = null;

function loadOriginalNames(): Map<string, string> {
  if (originalNames) return originalNames;
  originalNames = new Map();
  const file = path.resolve(
    __dirname,
    "../../../crawler/out/megamart-products.json",
  );
  if (!fs.existsSync(file)) return originalNames;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf-8"));
    for (const product of data.products ?? []) {
      for (const variant of product.variants ?? []) {
        if (variant?.sku) originalNames.set(variant.sku, product.name);
      }
    }
  } catch {
    // Dataset hỏng thì bỏ qua, tên trong DB vẫn dùng được.
  }
  return originalNames;
}

function originalNameFor(slug: string, sku: string): string | null {
  void slug;
  return loadOriginalNames().get(sku) ?? null;
}

/**
 * Tìm hex cho một nhãn màu.
 *
 * Chỉ khớp nguyên cụm hoặc từ đơn lẻ nằm trong bảng màu. Trước đây có thử
 * "từ bất kỳ trong nhãn", nên SKU HD16CEPKROSEGDCASE ra "Rose Gold" vì chứa
 * chuỗi ROSE trong mã hàng — sai, mã hàng không phải tên màu. Nhãn dài hơn 3
 * từ được coi là mô tả chứ không phải màu.
 */
function lookup(label: string): string | null {
  const key = norm(label);
  if (!key) return null;
  if (NOT_COLOR.some((bad) => key.includes(bad))) return null;
  if (PALETTE[key]) return PALETTE[key];

  const words = key.split(" ");
  if (words.length > 3) return null;
  for (const word of words) {
    if (NOT_COLOR.includes(word)) return null;
  }
  for (const word of [...words].reverse()) {
    if (PALETTE[word]) return PALETTE[word];
  }
  return null;
}

async function main() {
  const apply = process.env.APPLY === "1";
  console.log(apply ? "CHẾ ĐỘ GHI THẬT" : "dry-run (chưa ghi)");

  // Chỉ xét các variant thuộc nhóm đã gom (product có > 1 variant cùng base name).
  const variants = await prisma.variant.findMany({
    where: { product: { deletedAt: null } },
    select: {
      id: true,
      sku: true,
      colors: true,
      product: { select: { name: true, slug: true, _count: { select: { variants: true } } } },
    },
  });

  let filled = 0;
  const unmatched: string[] = [];
  const updates: { id: string; colors: Record<string, string | null>[] }[] = [];

  for (const variant of variants) {
    if (Array.isArray(variant.colors) && variant.colors.length > 0) continue;

    let hex: string | null = null;
    let label = "";
    const candidates = orderedCandidates(
      variant.product.name,
      variant.sku,
      variant.product._count.variants,
      variant.product.slug,
    );
    for (const candidate of candidates) {
      const found = lookup(candidate.label);
      if (found) {
        hex = found;
        label = candidate.label;
        break;
      }
    }

    if (!hex) {
      unmatched.push(`${variant.sku} — ${variant.product.name.slice(-40)}`);
      continue;
    }

    filled += 1;
    updates.push({
      id: variant.id,
      colors: [{ hex, name: label, imageUrl: null }],
    });
  }

  console.log(`Tổng variant: ${variants.length}`);
  console.log(`Sẽ điền màu: ${filled}`);
  console.log(`Không tìm được màu: ${unmatched.length}`);
  for (const u of unmatched.slice(0, 8)) console.log(`   ${u}`);

  if (!apply) {
    console.log("\nĐặt APPLY=1 để ghi vào DB.");
    return;
  }

  for (const update of updates) {
    await prisma.variant.update({ where: { id: update.id }, data: { colors: update.colors } });
  }
  console.log(`\nXong. Đã điền màu cho ${updates.length} biến thể.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
