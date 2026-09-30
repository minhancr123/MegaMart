/**
 * Khôi phục `Product.description` về bản trong backup.
 *
 * CẦN THIẾT vì fix-descimg-index-mismatch.ts đã chạy sai một lần: nó nén
 * chỉ số marker về 0..k-1 trong khi `descriptionImages` giữ nguyên, khiến
 * ảnh hiển thị sai vị trí. Bản nén làm mất thông tin "marker cũ trỏ ảnh nào",
 * nên phải lấy lại text gốc từ backup rồi chạy lại script với logic đúng
 * (chỉ bỏ marker vượt số ảnh, không nén).
 *
 * Backup: crawler/out/backup-product-descriptions.json — chụp TRƯỚC khi
 * cập nhật ảnh mô tả Điện máy Chợ Lớn, nên chỉ khôi phục cột `description`,
 * KHÔNG đụng `descriptionImages` (cột này đã được nâng cấp lên R2).
 *
 * Chạy (từ thư mục server/):
 *   npx tsx src/scripts/restore-description-from-backup.ts          # xem trước
 *   APPLY=1 npx tsx src/scripts/restore-description-from-backup.ts  # ghi thật
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const BACKUP_PATH = path.resolve(
  __dirname,
  "../../../crawler/out/backup-product-descriptions.json",
);
const APPLY = process.env.APPLY === "1";

async function main() {
  if (!fs.existsSync(BACKUP_PATH)) {
    console.error(`❌ Không có ${BACKUP_PATH}`);
    process.exit(1);
  }
  const backup: {
    id: string;
    slug: string;
    description: string | null;
    descriptionImages: string[];
  }[] = JSON.parse(fs.readFileSync(BACKUP_PATH, "utf-8"));

  const byId = new Map(backup.map((b) => [b.id, b]));
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, description: true, descriptionImages: true },
  });

  const changes: { id: string; slug: string; oldDesc: string }[] = [];
  for (const p of products) {
    const b = byId.get(p.id);
    if (!b) continue;
    const oldDesc = b.description ?? "";
    const nowDesc = p.description ?? "";
    // Chỉ quan tâm sản phẩm có marker: đó là nhóm bị nén sai.
    if (!oldDesc.includes("[DESCIMG:") || oldDesc === nowDesc) continue;
    changes.push({ id: p.id, slug: p.slug, oldDesc });
  }

  console.log(`Sản phẩm có marker và description đã đổi: ${changes.length}`);
  changes.slice(0, 8).forEach((c) =>
    console.log(`  ${c.slug.slice(0, 56)} (${c.oldDesc.length} ký tự)`),
  );
  if (changes.length > 8) console.log(`  ... và ${changes.length - 8} sản phẩm nữa`);

  if (!APPLY) {
    console.log("\n(Chưa ghi. Chạy lại với APPLY=1 để khôi phục.)");
    return;
  }
  for (const c of changes) {
    await prisma.product.update({ where: { id: c.id }, data: { description: c.oldDesc } });
  }
  console.log(`\n✅ Đã khôi phục ${changes.length} sản phẩm. Chạy lại fix-descimg-index-mismatch.ts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
