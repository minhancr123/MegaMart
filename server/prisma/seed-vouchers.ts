import { PrismaClient, VoucherType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎟️ Đang tạo/cập nhật public vouchers...');
  const publicVouchers = [
    {
      code: 'MEGANEW',
      title: 'Giảm 50.000đ cho đơn hàng đầu tiên',
      description: 'Khách mới',
      type: VoucherType.FIXED,
      value: 50000,
      minOrderValue: 300000,
      usageLimit: 10000,
      usagePerUser: 1,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      active: true,
    },
    {
      code: 'FREESHIP',
      title: 'Miễn phí vận chuyển toàn quốc',
      description: 'Vận chuyển',
      type: VoucherType.FREESHIP,
      value: 30000,
      minOrderValue: 500000,
      usageLimit: 10000,
      usagePerUser: 5,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      active: true,
    },
    {
      code: 'TECHMEGA',
      title: 'Giảm 200.000đ mua Tivi & Tủ lạnh',
      description: 'Điện máy',
      type: VoucherType.FIXED,
      value: 200000,
      minOrderValue: 5000000,
      usageLimit: 5000,
      usagePerUser: 2,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      active: true,
    },
    {
      code: 'VIPMEMBER',
      title: 'Giảm 10% tối đa 500.000đ cho hội viên',
      description: 'Hội viên',
      type: VoucherType.PERCENT,
      value: 10,
      maxDiscount: 500000,
      minOrderValue: 1000000,
      usageLimit: 5000,
      usagePerUser: 3,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.000Z'),
      active: true,
    },
  ];

  for (const v of publicVouchers) {
    const res = await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        title: v.title,
        description: v.description,
        type: v.type,
        value: v.value,
        maxDiscount: v.maxDiscount ?? null,
        minOrderValue: v.minOrderValue,
        usageLimit: v.usageLimit,
        usagePerUser: v.usagePerUser,
        startDate: v.startDate,
        endDate: v.endDate,
        active: v.active,
      },
      create: v,
    });
    console.log(` -> Đã tạo/cập nhật voucher: ${res.code} (${res.title})`);
  }

  const allVouchers = await prisma.voucher.findMany({
    where: { active: true, assignedUserId: null },
    select: { code: true, type: true, value: true, minOrderValue: true, active: true },
  });
  console.log('🎉 Danh sách public vouchers trong DB:', allVouchers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
