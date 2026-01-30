const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setPrimaryImages() {
  try {
    console.log('🔄 Starting to set primary images...');

    // Get all products
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: {
            displayOrder: 'asc'
          }
        }
      }
    });

    console.log(`📦 Found ${products.length} products`);

    let updatedCount = 0;

    for (const product of products) {
      if (product.images.length === 0) {
        console.log(`⚠️  Product "${product.name}" has no images`);
        continue;
      }

      // Check if any image is already primary
      const hasPrimary = product.images.some(img => img.isPrimary);

      if (!hasPrimary) {
        // Set first image as primary
        const firstImage = product.images[0];
        
        await prisma.productImage.update({
          where: { id: firstImage.id },
          data: { isPrimary: true }
        });

        console.log(`✅ Set primary image for product "${product.name}" (${product.images.length} images total)`);
        updatedCount++;
      } else {
        // Ensure only ONE image is primary
        const primaryImages = product.images.filter(img => img.isPrimary);
        
        if (primaryImages.length > 1) {
          console.log(`⚠️  Product "${product.name}" has ${primaryImages.length} primary images, fixing...`);
          
          // Set all to false first
          await prisma.productImage.updateMany({
            where: { productId: product.id },
            data: { isPrimary: false }
          });
          
          // Set first one as primary
          await prisma.productImage.update({
            where: { id: product.images[0].id },
            data: { isPrimary: true }
          });
          
          updatedCount++;
        }
      }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} products`);
    console.log('✨ All products now have a primary image set');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setPrimaryImages();
