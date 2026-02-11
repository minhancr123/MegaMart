
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.flashSaleItem.findMany({
        include: { variant: true }
    });

    for (const item of items) {
        const salePriceCount = item.salePrice.toString().length;
        const variantPriceCount = item.variant.price.toString().length;

        // If salePrice is significantly shorter than variantPrice (e.g. 8 digits vs 10 digits), it's likely unscaled
        if (variantPriceCount - salePriceCount >= 2) {
            const newSalePrice = item.salePrice * BigInt(100);
            console.log(`Scaling up item ${item.id}: ${item.salePrice.toString()} -> ${newSalePrice.toString()}`);
            await prisma.flashSaleItem.update({
                where: { id: item.id },
                data: { salePrice: newSalePrice }
            });
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
