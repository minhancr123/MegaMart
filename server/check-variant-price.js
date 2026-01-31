const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPrices() {
    try {
        const variants = await prisma.variant.findMany({ 
            where: { productId: 'cmgjec6dt000sl0uvhpsor350' },
            select: { id: true, sku: true, price: true }
        });
        
        console.log('Variants in DB:');
        variants.forEach(v => {
            console.log({
                sku: v.sku,
                priceRaw: v.price.toString(),
                priceNumber: Number(v.price),
                priceVND: Number(v.price) / 100
            });
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPrices();
