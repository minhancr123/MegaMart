const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColors() {
    try {
        const products = await prisma.product.findMany({
            include: {
                variants: {
                    select: {
                        id: true,
                        sku: true,
                        colors: true
                    }
                }
            },
            take: 5
        });
        
        console.log('Products with variants:');
        products.forEach(product => {
            console.log(`\n${product.name}:`);
            product.variants.forEach(variant => {
                console.log(`  - ${variant.sku}:`);
                console.log(`    Colors:`, variant.colors);
            });
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkColors();
