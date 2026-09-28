import { PrismaClient } from '@prisma/client';
import { UserRole, PaymentProvider, PaymentStatus, OrderStatus, VoucherType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seeding database...');

  // Xóa dữ liệu cũ
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.flashSaleItem.deleteMany();
  await prisma.stockMovementItem.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Tạo Users
  console.log('👤 Tạo users...');
  const adminPassword = await hash('admin123', 12);
  const userPassword = await hash('user123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@megamart.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      passwordHash: userPassword,
      name: 'Nguyễn Văn A',
      role: UserRole.USER,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      passwordHash: userPassword,
      name: 'Trần Thị B',
      role: UserRole.USER,
    },
  });

  // 2. Tạo Categories
  console.log('📁 Tạo categories...');
  const electronics = await prisma.category.create({
    data: {
      name: 'Điện tử',
      slug: 'dien-tu',
    },
  });

  const smartphones = await prisma.category.create({
    data: {
      name: 'Điện thoại',
      slug: 'dien-thoai',
      parentId: electronics.id,
    },
  });

  const laptops = await prisma.category.create({
    data: {
      name: 'Laptop',
      slug: 'laptop',
      parentId: electronics.id,
    },
  });

  const accessories = await prisma.category.create({
    data: {
      name: 'Phụ kiện',
      slug: 'phu-kien',
      parentId: electronics.id,
    },
  });

  const fashion = await prisma.category.create({
    data: {
      name: 'Thời trang',
      slug: 'thoi-trang',
    },
  });

  // 3. Tạo Products
  console.log('📱 Tạo products...');
  
  // iPhone 15 Pro
  const iphone15Pro = await prisma.product.create({
    data: {
      slug: 'iphone-15-pro',
      name: 'iPhone 15 Pro',
      description: 'iPhone 15 Pro với chip A17 Pro mạnh mẽ, camera 48MP và thiết kế titanium cao cấp.',
      brand: 'Apple',
      categoryId: smartphones.id,
      images: {
        create: [
          {
            url: '/images/iphone-15-pro-1.jpg',
            alt: 'iPhone 15 Pro màu Natural Titanium',
          },
          {
            url: '/images/iphone-15-pro-2.jpg',
            alt: 'iPhone 15 Pro camera system',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'IP15P-128-NT',
            price: BigInt(29990000), // 29,990,000 VND
            stock: 50,
            attributes: {
              storage: '128GB',
              color: 'Natural Titanium',
            },
          },
          {
            sku: 'IP15P-256-NT',
            price: BigInt(34990000), // 34,990,000 VND
            stock: 30,
            attributes: {
              storage: '256GB',
              color: 'Natural Titanium',
            },
          },
          {
            sku: 'IP15P-128-BT',
            price: BigInt(29990000), // 29,990,000 VND
            stock: 40,
            attributes: {
              storage: '128GB',
              color: 'Blue Titanium',
            },
          },
        ],
      },
    },
  });

  // MacBook Air M3
  const macbookAirM3 = await prisma.product.create({
    data: {
      slug: 'macbook-air-m3',
      name: 'MacBook Air M3 13 inch',
      description: 'MacBook Air với chip M3 mới nhất, hiệu năng vượt trội và thời lượng pin lên đến 18 giờ.',
      brand: 'Apple',
      categoryId: laptops.id,
      images: {
        create: [
          {
            url: '/images/macbook-air-m3-1.jpg',
            alt: 'MacBook Air M3 13 inch',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'MBA-M3-8-256-SG',
            price: BigInt(27990000), // 27,990,000 VND
            stock: 25,
            attributes: {
              ram: '8GB',
              storage: '256GB SSD',
              color: 'Space Gray',
            },
          },
          {
            sku: 'MBA-M3-16-512-SG',
            price: BigInt(34990000), // 34,990,000 VND
            stock: 15,
            attributes: {
              ram: '16GB',
              storage: '512GB SSD',
              color: 'Space Gray',
            },
          },
        ],
      },
    },
  });

  // AirPods Pro
  const airpodsPro = await prisma.product.create({
    data: {
      slug: 'airpods-pro-2nd-gen',
      name: 'AirPods Pro (2nd generation)',
      description: 'AirPods Pro thế hệ 2 với chip H2, chống ồn chủ động và âm thanh 3D.',
      brand: 'Apple',
      categoryId: accessories.id,
      images: {
        create: [
          {
            url: '/images/airpods-pro-1.jpg',
            alt: 'AirPods Pro 2nd generation',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'APP-2ND-WHITE',
            price: BigInt(6990000), // 6,990,000 VND
            stock: 100,
            attributes: {
              color: 'White',
              connectivity: 'Bluetooth 5.3',
            },
          },
        ],
      },
    },
  });

  // Samsung Galaxy S24
  const galaxyS24 = await prisma.product.create({
    data: {
      slug: 'samsung-galaxy-s24',
      name: 'Samsung Galaxy S24',
      description: 'Samsung Galaxy S24 với camera AI 50MP và hiệu năng mạnh mẽ từ chip Snapdragon 8 Gen 3.',
      brand: 'Samsung',
      categoryId: smartphones.id,
      images: {
        create: [
          {
            url: '/images/galaxy-s24-1.jpg',
            alt: 'Samsung Galaxy S24',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'GS24-128-BLACK',
            price: BigInt(21990000), // 21,990,000 VND
            stock: 60,
            attributes: {
              storage: '128GB',
              color: 'Phantom Black',
              ram: '8GB',
            },
          },
          {
            sku: 'GS24-256-BLACK',
            price: BigInt(25990000), // 25,990,000 VND
            stock: 40,
            attributes: {
              storage: '256GB',
              color: 'Phantom Black',
              ram: '8GB',
            },
          },
        ],
      },
    },
  });

  // Dell XPS 13
  const dellXPS13 = await prisma.product.create({
    data: {
      slug: 'dell-xps-13',
      name: 'Dell XPS 13',
      description: 'Dell XPS 13 với Intel Core i7 thế hệ 13, màn hình 4K và thiết kế siêu mỏng.',
      brand: 'Dell',
      categoryId: laptops.id,
      images: {
        create: [
          {
            url: '/images/dell-xps-13-1.jpg',
            alt: 'Dell XPS 13',
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'XPS13-I7-16-512',
            price: BigInt(32990000), // 32,990,000 VND
            stock: 20,
            attributes: {
              processor: 'Intel Core i7-1355U',
              ram: '16GB',
              storage: '512GB SSD',
              display: '13.4" 4K',
            },
          },
        ],
      },
    },
  });

  // 4. Tạo Carts
  console.log('🛒 Tạo carts...');
  const cart1 = await prisma.cart.create({
    data: {
      userId: user1.id,
      items: {
        create: [
          {
            variantId: (await prisma.variant.findFirst({ where: { sku: 'IP15P-128-NT' } }))!.id,
            quantity: 1,
          },
          {
            variantId: (await prisma.variant.findFirst({ where: { sku: 'APP-2ND-WHITE' } }))!.id,
            quantity: 2,
          },
        ],
      },
    },
  });

  // 5. Tạo Orders
  console.log('📦 Tạo orders...');
  const order1 = await prisma.order.create({
    data: {
      code: 'ORD-2025-001',
      userId: user1.id,
      status: OrderStatus.PAID,
      total: BigInt(36990000), // 36,990,000 VND
      vatAmount: BigInt(3699000), // 10% VAT
      shippingFee: BigInt(0),
      shippingAddress: {
        name: 'Nguyễn Văn A',
        phone: '0901234567',
        address: '123 Nguyễn Văn Cừ, Quận 5',
        city: 'TP.HCM',
        country: 'Vietnam',
      },
      items: {
        create: [
          {
            variantId: (await prisma.variant.findFirst({ where: { sku: 'IP15P-128-NT' } }))!.id,
            price: BigInt(29990000),
            quantity: 1,
          },
          {
            variantId: (await prisma.variant.findFirst({ where: { sku: 'APP-2ND-WHITE' } }))!.id,
            price: BigInt(6990000),
            quantity: 1,
          },
        ],
      },
      payments: {
        create: {
          provider: PaymentProvider.VNPAY,
          amount: BigInt(36990000),
          status: PaymentStatus.PAID,
          currency: 'VND',
          raw: {
            transactionId: 'VNPAY123456789',
            method: 'ATM',
          },
        },
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      code: 'ORD-2025-002',
      userId: user2.id,
      status: OrderStatus.PENDING,
      total: BigInt(28490000), // 27,990,000 + 500,000 VND
      vatAmount: BigInt(2799000), // 10% VAT
      shippingFee: BigInt(500000), // 500,000 VND shipping
      shippingAddress: {
        name: 'Trần Thị B',
        phone: '0987654321',
        address: '456 Lê Văn Sỹ, Quận 3',
        city: 'TP.HCM',
        country: 'Vietnam',
      },
      items: {
        create: [
          {
            variantId: (await prisma.variant.findFirst({ where: { sku: 'MBA-M3-8-256-SG' } }))!.id,
            price: BigInt(27990000),
            quantity: 1,
          },
        ],
      },
      payments: {
        create: {
          provider: PaymentProvider.MOMO,
          amount: BigInt(28490000),
          status: PaymentStatus.PENDING,
          currency: 'VND',
        },
      },
    },
  });

  // 6. Tạo Hot Vouchers công khai
  console.log('🎟️ Tạo public vouchers...');
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
    await prisma.voucher.upsert({
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
  }

  console.log('✅ Seeding hoàn thành!');
  console.log(`📊 Đã tạo:
    - ${await prisma.user.count()} users
    - ${await prisma.category.count()} categories
    - ${await prisma.product.count()} products
    - ${await prisma.variant.count()} variants
    - ${await prisma.cart.count()} carts
    - ${await prisma.order.count()} orders
    - ${await prisma.payment.count()} payments
    - ${await prisma.voucher.count()} vouchers
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
