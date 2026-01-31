const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPrices() {
    try {
        // Get all variants with corrupted prices (too large)
        const variants = await prisma.variant.findMany({
            select: { id: true, sku: true, price: true }
        });
        
        console.log(`Found ${variants.length} variants. Checking for corrupted prices...`);
        
        for (const variant of variants) {
            const currentPrice = Number(variant.price);
            let fixedCents = null;
            
            // Check different corruption patterns
            if (currentPrice > 100000000000) { // > 1B cents (10M VND)
                // Pattern: price was multiplied by 10^12
                const fixedVND = Math.round(currentPrice / Math.pow(10, 12));
                fixedCents = fixedVND * 100;
                console.log(`Fixing ${variant.sku} (Pattern 1 - divided by 10^12):`);
            } else if (currentPrice > 10000000000 && currentPrice < 100000000000) { // 100M-1B cents (1M-10M VND)
                // Pattern: price was multiplied by 10^8
                const fixedVND = Math.round(currentPrice / Math.pow(10, 8));
                fixedCents = fixedVND * 100;
                console.log(`Fixing ${variant.sku} (Pattern 2 - divided by 10^8):`);
            } else if (currentPrice === 0) {
                // Skip zero prices - need manual fix
                console.log(`${variant.sku}: ZERO - needs manual fix!`);
                continue;
            } else {
                console.log(`${variant.sku}: OK (${currentPrice / 100} VND)`);
                continue;
            }
            
            console.log(`  Current: ${currentPrice} (${currentPrice / 100} VND)`);
            console.log(`  Fixed cents: ${fixedCents} (${fixedCents / 100} VND)`);
            
            await prisma.variant.update({
                where: { id: variant.id },
                data: { price: BigInt(fixedCents) }
            });
            
            console.log(`  ✓ Updated!`);
        }
        
        console.log('\n✓ Price fix completed!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixPrices();
