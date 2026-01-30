import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInventory() {
  console.log('🌱 Seeding inventory data...');

  // 1. Tạo Warehouses (Kho hàng)
  console.log('📦 Creating warehouses...');
  const warehouses = await Promise.all([
    prisma.warehouse.upsert({
      where: { code: 'KHO-HCM' },
      update: {},
      create: {
        name: 'Kho Trung Tâm Hồ Chí Minh',
        code: 'KHO-HCM',
        address: '123 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
        phone: '028-3895-1234',
        isActive: true,
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'KHO-HN' },
      update: {},
      create: {
        name: 'Kho Hà Nội',
        code: 'KHO-HN',
        address: '456 Giải Phóng, Hai Bà Trưng, Hà Nội',
        phone: '024-3974-5678',
        isActive: true,
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'KHO-DN' },
      update: {},
      create: {
        name: 'Kho Đà Nẵng',
        code: 'KHO-DN',
        address: '789 Nguyễn Văn Linh, Quận Hải Châu, Đà Nẵng',
        phone: '0236-3652-9012',
        isActive: true,
      },
    }),
    prisma.warehouse.upsert({
      where: { code: 'KHO-CT' },
      update: {},
      create: {
        name: 'Kho Cần Thơ',
        code: 'KHO-CT',
        address: '321 Trần Hưng Đạo, Quận Ninh Kiều, Cần Thơ',
        phone: '0292-3812-3456',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Created ${warehouses.length} warehouses`);

  // 2. Tạo Suppliers (Nhà cung cấp)
  console.log('🏢 Creating suppliers...');
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { code: 'NCC-APPLE' },
      update: {},
      create: {
        name: 'Apple Vietnam Distribution',
        code: 'NCC-APPLE',
        email: 'vietnam@apple.com',
        phone: '028-3825-1234',
        address: 'Saigon Centre, Quận 1, TP. HCM',
        taxCode: '0123456789',
        contactName: 'Nguyễn Văn A',
        notes: 'Nhà phân phối chính thức Apple tại Việt Nam',
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'NCC-SAMSUNG' },
      update: {},
      create: {
        name: 'Samsung Electronics Vietnam',
        code: 'NCC-SAMSUNG',
        email: 'sales@samsung.vn',
        phone: '028-3914-5678',
        address: 'Bitexco Financial Tower, Quận 1, TP. HCM',
        taxCode: '0987654321',
        contactName: 'Trần Thị B',
        notes: 'Nhà phân phối Samsung chính hãng',
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'NCC-XIAOMI' },
      update: {},
      create: {
        name: 'Xiaomi Vietnam Corporation',
        code: 'NCC-XIAOMI',
        email: 'contact@mi.com.vn',
        phone: '028-3825-9012',
        address: 'The One Tower, Quận Bình Thạnh, TP. HCM',
        taxCode: '0111222333',
        contactName: 'Lê Văn C',
        notes: 'Nhà cung cấp sản phẩm Xiaomi',
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'NCC-ANKER' },
      update: {},
      create: {
        name: 'Anker Technology Vietnam',
        code: 'NCC-ANKER',
        email: 'vietnam@anker.com',
        phone: '028-3845-3456',
        address: 'Vietcombank Tower, Quận 1, TP. HCM',
        taxCode: '0444555666',
        contactName: 'Phạm Thị D',
        notes: 'Nhà cung cấp phụ kiện điện tử Anker',
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'NCC-JOYROOM' },
      update: {},
      create: {
        name: 'Joyroom Electronics Vietnam',
        code: 'NCC-JOYROOM',
        email: 'sales@joyroom.vn',
        phone: '028-3862-7890',
        address: 'Vạn Hạnh Mall, Quận 10, TP. HCM',
        taxCode: '0777888999',
        contactName: 'Hoàng Văn E',
        notes: 'Nhà cung cấp phụ kiện công nghệ',
        isActive: true,
      },
    }),
    prisma.supplier.upsert({
      where: { code: 'NCC-BASEUS' },
      update: {},
      create: {
        name: 'Baseus Technology Vietnam',
        code: 'NCC-BASEUS',
        email: 'info@baseus.vn',
        phone: '028-3825-4567',
        address: 'Diamond Plaza, Quận 1, TP. HCM',
        taxCode: '0666777888',
        contactName: 'Võ Thị F',
        notes: 'Phụ kiện điện tử cao cấp',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // 3. Lấy một số variants từ database để tạo inventory
  console.log('📱 Getting product variants...');
  const variants = await prisma.variant.findMany({
    take: 20,
    include: {
      product: true,
    },
  });

  if (variants.length === 0) {
    console.log('⚠️ No variants found. Please seed products first!');
    return;
  }

  console.log(`📦 Found ${variants.length} variants`);

  // 4. Tạo WarehouseInventory (Tồn kho theo kho)
  console.log('📊 Creating warehouse inventories...');
  let inventoryCount = 0;

  for (const warehouse of warehouses) {
    for (const variant of variants) {
      // Random quantity cho mỗi kho
      const baseQuantity = Math.floor(Math.random() * 100) + 20;
      const minQuantity = Math.floor(Math.random() * 10) + 5;
      
      // Tạo location code (vị trí trong kho)
      const aisle = String.fromCharCode(65 + Math.floor(Math.random() * 5)); // A-E
      const rack = Math.floor(Math.random() * 20) + 1;
      const shelf = Math.floor(Math.random() * 10) + 1;
      const location = `${aisle}${rack}-${shelf.toString().padStart(2, '0')}`;

      try {
        await prisma.warehouseInventory.upsert({
          where: {
            warehouseId_variantId: {
              warehouseId: warehouse.id,
              variantId: variant.id,
            },
          },
          update: {
            quantity: baseQuantity,
            minQuantity: minQuantity,
            maxQuantity: 200,
            location: location,
          },
          create: {
            warehouseId: warehouse.id,
            variantId: variant.id,
            quantity: baseQuantity,
            minQuantity: minQuantity,
            maxQuantity: 200,
            location: location,
          },
        });
        inventoryCount++;
      } catch (error) {
        console.error(`Error creating inventory for ${warehouse.code} - ${variant.sku}:`, error);
      }
    }
  }
  console.log(`✅ Created ${inventoryCount} warehouse inventory records`);

  // 5. Tạo một số Stock Movements mẫu (Phiếu nhập kho)
  console.log('📝 Creating sample stock movements...');
  
  // Lấy admin user để làm createdBy
  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  // Nếu không có admin, tạo một admin mới
  if (!adminUser) {
    console.log('⚠️ No admin user found, creating one...');
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@megamart.com',
        passwordHash: '$2b$10$YourHashedPasswordHere', // Placeholder
        name: 'System Admin',
        role: 'ADMIN',
      },
    });
    console.log('✅ Created admin user for stock movements');
  }

  console.log(`📋 Using admin user: ${adminUser.email} (${adminUser.id})`);

  // Tạo 5 phiếu nhập kho
  for (let i = 1; i <= 5; i++) {
    const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const selectedVariants = variants.slice(0, Math.floor(Math.random() * 5) + 3);
    
    try {
      const movement = await prisma.stockMovement.create({
        data: {
          code: `PN-2026-${i.toString().padStart(4, '0')}`,
          type: 'IMPORT',
          warehouseId: warehouse.id,
          supplierId: supplier.id,
          notes: `Nhập hàng từ ${supplier.name}`,
          status: 'COMPLETED',
          totalAmount: BigInt(0), // Sẽ tính sau
          createdBy: adminUser.id,
          completedAt: new Date(),
          items: {
            create: selectedVariants.map((variant) => ({
              variantId: variant.id,
              quantity: Math.floor(Math.random() * 50) + 10,
              unitPrice: BigInt(Math.floor(Math.random() * 10000000) + 1000000),
              notes: `Nhập ${variant.product.name} - ${variant.sku}`,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Tính totalAmount
      const totalAmount = movement.items.reduce(
        (sum, item) => sum + (item.unitPrice ? BigInt(item.quantity) * item.unitPrice : BigInt(0)),
        BigInt(0)
      );

      await prisma.stockMovement.update({
        where: { id: movement.id },
        data: { totalAmount },
      });
      
      console.log(`✅ Created import movement: ${movement.code}`);
    } catch (error) {
      console.error(`❌ Error creating import movement ${i}:`, error);
    }
  }

  // Tạo 3 phiếu xuất kho
  for (let i = 1; i <= 3; i++) {
    const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
    const selectedVariants = variants.slice(0, Math.floor(Math.random() * 4) + 2);
    
    try {
      await prisma.stockMovement.create({
        data: {
          code: `PX-2026-${i.toString().padStart(4, '0')}`,
          type: 'EXPORT',
          warehouseId: warehouse.id,
          notes: `Xuất kho bán hàng`,
          status: 'COMPLETED',
          createdBy: adminUser.id,
          completedAt: new Date(),
          items: {
            create: selectedVariants.map((variant) => ({
              variantId: variant.id,
              quantity: Math.floor(Math.random() * 20) + 5,
              notes: `Xuất ${variant.product.name} - ${variant.sku}`,
            })),
          },
        },
      });
      console.log(`✅ Created export movement: PX-2026-${i.toString().padStart(4, '0')}`);
    } catch (error) {
      console.error(`❌ Error creating export movement ${i}:`, error);
    }
  }

  // Tạo 2 phiếu chuyển kho
  for (let i = 1; i <= 2; i++) {
    const fromWarehouse = warehouses[0];
    const toWarehouse = warehouses[1];
    const selectedVariants = variants.slice(0, 3);
    
    try {
      await prisma.stockMovement.create({
        data: {
          code: `PCK-2026-${i.toString().padStart(4, '0')}`,
          type: 'TRANSFER_OUT',
          warehouseId: fromWarehouse.id,
          toWarehouseId: toWarehouse.id,
          notes: `Chuyển kho từ ${fromWarehouse.name} đến ${toWarehouse.name}`,
          status: 'COMPLETED',
          createdBy: adminUser.id,
          completedAt: new Date(),
          items: {
            create: selectedVariants.map((variant) => ({
              variantId: variant.id,
              quantity: Math.floor(Math.random() * 15) + 5,
              notes: `Chuyển ${variant.product.name} - ${variant.sku}`,
            })),
          },
        },
      });
      console.log(`✅ Created transfer movement: PCK-2026-${i.toString().padStart(4, '0')}`);
    } catch (error) {
      console.error(`❌ Error creating transfer movement ${i}:`, error);
    }
  }

  console.log(`✅ Created stock movements (5 import, 3 export, 2 transfer)`);

  console.log('✨ Inventory seeding completed!');
}

async function main() {
  try {
    await seedInventory();
  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
