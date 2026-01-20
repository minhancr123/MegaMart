const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSoldCount() {
  try {
    console.log('🔄 Đang tính toán số lượng đã bán cho từng sản phẩm...');

    // Lấy tất cả sản phẩm
    const products = await prisma.product.findMany({
      include: {
        variants: {
          include: {
            orderItems: {
              include: {
                order: true
              }
            }
          }
        }
      }
    });

    console.log(`📦 Tìm thấy ${products.length} sản phẩm`);

    for (const product of products) {
      // Tính tổng số lượng đã bán từ tất cả variants của sản phẩm
      // Chỉ tính các đơn hàng có status là PAID
      let totalSold = 0;

      for (const variant of product.variants) {
        const soldQuantity = variant.orderItems
          .filter(item => item.order.status === 'PAID')
          .reduce((sum, item) => sum + item.quantity, 0);
        
        totalSold += soldQuantity;
      }

      // Cập nhật soldCount cho sản phẩm
      await prisma.product.update({
        where: { id: product.id },
        data: { soldCount: totalSold }
      });

      console.log(`✅ ${product.name}: Đã bán ${totalSold} sản phẩm`);
    }

    console.log('🎉 Hoàn thành cập nhật soldCount!');
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSoldCount();
