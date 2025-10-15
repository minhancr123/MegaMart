"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extension_1 = require("@prisma/client/extension");
const prisma = new extension_1.PrismaClient();
async function main() {
    console.log('📊 Kiểm tra dữ liệu trong database...\n');
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            _count: {
                select: {
                    orders: true,
                    carts: true,
                },
            },
        },
    });
    console.log('👥 Users:');
    users.forEach((user) => {
        console.log(`  - ${user.name} (${user.email}) - ${user.role} - Orders: ${user._count.orders}, Carts: ${user._count.carts}`);
    });
    const categories = await prisma.category.findMany({
        include: {
            _count: {
                select: {
                    products: true,
                },
            },
        },
    });
    console.log('\n📁 Categories:');
    categories.forEach((cat) => {
        console.log(`  - ${cat.name} (${cat.slug}) - Products: ${cat._count.products}`);
    });
    const products = await prisma.product.findMany({
        include: {
            category: true,
            variants: true,
            images: true,
            _count: {
                select: {
                    variants: true,
                },
            },
        },
    });
    console.log('\n📱 Products:');
    products.forEach((product) => {
        console.log(`  - ${product.name} (${product.brand}) - Category: ${product.category?.name} - Variants: ${product._count.variants}`);
        product.variants.forEach((variant) => {
            const price = Number(variant.price) / 100000000;
            console.log(`    * ${variant.sku}: ${price.toLocaleString('vi-VN')}₫ - Stock: ${variant.stock}`);
        });
    });
    const orders = await prisma.order.findMany({
        include: {
            user: true,
            items: {
                include: {
                    variant: {
                        include: {
                            product: true,
                        },
                    },
                },
            },
            payments: true,
        },
    });
    console.log('\n📦 Orders:');
    orders.forEach((order) => {
        const total = Number(order.total) / 100000000;
        console.log(`  - ${order.code} - ${order.user?.name} - ${order.status} - ${total.toLocaleString('vi-VN')}₫`);
        order.items.forEach((item) => {
            console.log(`    * ${item.variant.product.name} x${item.quantity}`);
        });
    });
    console.log('\n✅ Kiểm tra hoàn thành!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=check-data.js.map