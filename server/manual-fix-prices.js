const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function manualFix() {
    try {
        // Fix iPhone prices - should be 29,990,000 and 34,990,000 VND
        await prisma.variant.update({
            where: { sku: 'IP15P-128-NT' },
            data: { price: BigInt(2999000000) } // 29,990,000 VND in cents
        });
        console.log('✓ Fixed IP15P-128-NT: 29,990,000 VND');
        
        await prisma.variant.update({
            where: { sku: 'IP15P-256-NT' },
            data: { price: BigInt(3499000000) } // 34,990,000 VND in cents
        });
        console.log('✓ Fixed IP15P-256-NT: 34,990,000 VND');
        
        await prisma.variant.update({
            where: { sku: 'IP15P-128-BT' },
            data: { price: BigInt(2999000000) } // 29,990,000 VND in cents
        });
        console.log('✓ Fixed IP15P-128-BT: 29,990,000 VND');
        
        // Fix XPS13 - should be around 32,990,000 VND
        await prisma.variant.update({
            where: { sku: 'XPS13-I7-16-512' },
            data: { price: BigInt(3299000000) } // 32,990,000 VND in cents
        });
        console.log('✓ Fixed XPS13-I7-16-512: 32,990,000 VND');
        
        console.log('\n✓ Manual fix completed!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

manualFix();
