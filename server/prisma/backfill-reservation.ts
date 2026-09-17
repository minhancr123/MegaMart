/**
 * Backfill 1 lần cho mô hình On Hand / Reserved / Available.
 *
 * Đơn cũ ở trạng thái PENDING/CONFIRMED/PROCESSING/PAID đã bị trừ thẳng
 * Variant.stock lúc tạo đơn. Chuyển sang mô hình mới:
 *   stock += tổng SL đang giữ (hoàn On Hand đã trừ sớm)
 *   reservedQuantity = tổng SL đang giữ
 *
 * Chạy 1 lần duy nhất, NGAY TRƯỚC khi deploy code mới:
 *   npx tsx prisma/backfill-reservation.ts
 */
import { PrismaClient } from '@prisma/client';

const OPEN_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PAID'] as const;

async function main() {
  const prisma = new PrismaClient();
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: [...OPEN_STATUSES] as any } },
      include: { items: true },
    });
    console.log(`Open orders: ${orders.length}`);

    const held = new Map<string, number>();
    for (const o of orders) {
      for (const it of o.items as any[]) {
        held.set(it.variantId, (held.get(it.variantId) ?? 0) + it.quantity);
      }
    }
    console.log(`Variants to fix: ${held.size}`);

    let n = 0;
    for (const [variantId, qty] of held) {
      await prisma.variant.update({
        where: { id: variantId },
        data: { stock: { increment: qty }, reservedQuantity: qty },
      });
      n++;
    }
    console.log(`Done. Updated ${n} variants.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
