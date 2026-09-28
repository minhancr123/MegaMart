import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prismaClient/prisma.service";
import * as fs from "fs/promises";
import * as path from "path";

@Injectable()
export class ImageSyncService {
  private readonly logger = new Logger(ImageSyncService.name);
  private readonly imagesBasePath = path.join(
    process.cwd(),
    "..",
    "client",
    "public",
    "images",
    "products",
  );

  constructor(private prisma: PrismaService) {}

  /**
   * Scan folder public/images/products và tự động map với products
   * Naming convention:
   * - {sku}.jpg/png/webp -> Ảnh chính của variant
   * - {sku}-1.jpg, {sku}-2.jpg -> Ảnh phụ của product
   * - {productId}.jpg -> Ảnh chính của product (nếu không có SKU)
   */
  async syncProductImages() {
    this.logger.log("🔄 Starting product images synchronization...");

    try {
      // Check if images folder exists
      try {
        await fs.access(this.imagesBasePath);
      } catch {
        this.logger.warn(`Images folder not found: ${this.imagesBasePath}`);
        await fs.mkdir(this.imagesBasePath, { recursive: true });
        this.logger.log("✅ Created images folder");
        return { synced: 0, message: "Images folder was empty" };
      }

      // Get all image files
      const files = await fs.readdir(this.imagesBasePath);
      const imageFiles = files.filter((file) =>
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file),
      );

      this.logger.log(`📁 Found ${imageFiles.length} image files`);

      const syncedCount = 0;
      const results = {
        synced: 0,
        skipped: 0,
        errors: 0,
        details: [] as any[],
      };

      // Get all products and variants for matching
      const products = await this.prisma.product.findMany({
        include: {
          variants: true,
          images: true,
        },
      });

      type ProductWithRelations = (typeof products)[0];

      const productMap = new Map<string, ProductWithRelations>(
        products.map((p) => [p.id, p]),
      );
      const skuMap = new Map();
      products.forEach((p) => {
        p.variants.forEach((v) =>
          skuMap.set(v.sku.toLowerCase(), { product: p, variant: v }),
        );
      });

      for (const filename of imageFiles) {
        try {
          const nameParts = path.parse(filename);
          const nameWithoutExt = nameParts.name;
          const imageUrl = `/images/products/${filename}`;

          // Try to match by SKU first (with or without suffix like -1, -2)
          const [baseName, suffix] = nameWithoutExt.split("-");
          const match = skuMap.get(baseName.toLowerCase());

          if (match) {
            const { product, variant } = match;

            // Check if image already exists
            const existingImage = product.images.find(
              (img) => img.url === imageUrl,
            );
            if (existingImage) {
              results.skipped++;
              continue;
            }

            // Add image to product
            await this.prisma.productImage.create({
              data: {
                productId: product.id,
                url: imageUrl,
                alt: `${product.name} - ${variant.sku}`,
              },
            });

            results.synced++;
            results.details.push({
              file: filename,
              product: product.name,
              sku: variant.sku,
              status: "synced",
            });

            this.logger.log(
              `✅ Synced ${filename} -> ${product.name} (${variant.sku})`,
            );
          } else {
            // Try to match by product ID
            const productById = productMap.get(nameWithoutExt);
            if (
              productById &&
              productById.images &&
              productById.id &&
              productById.name
            ) {
              const existingImage = productById.images.find(
                (img) => img.url === imageUrl,
              );
              if (!existingImage) {
                await this.prisma.productImage.create({
                  data: {
                    productId: productById.id,
                    url: imageUrl,
                    alt: productById.name,
                  },
                });

                results.synced++;
                results.details.push({
                  file: filename,
                  product: productById.name,
                  status: "synced",
                });

                this.logger.log(`✅ Synced ${filename} -> ${productById.name}`);
              } else {
                results.skipped++;
              }
            } else {
              results.skipped++;
              results.details.push({
                file: filename,
                status: "no_match",
                reason: "No matching product or SKU found",
              });
              this.logger.warn(`⚠️  No match found for ${filename}`);
            }
          }
        } catch (error) {
          results.errors++;
          results.details.push({
            file: filename,
            status: "error",
            error: error.message,
          });
          this.logger.error(`❌ Error syncing ${filename}:`, error.message);
        }
      }

      this.logger.log(`
🎉 Sync completed!
   ✅ Synced: ${results.synced}
   ⏭️  Skipped: ${results.skipped}
   ❌ Errors: ${results.errors}
      `);

      return results;
    } catch (error) {
      this.logger.error("❌ Sync failed:", error);
      throw error;
    }
  }

  /**
   * Scan một folder cụ thể và sync ảnh
   */
  async syncFromCustomFolder(folderPath: string) {
    this.logger.log(`🔄 Syncing from custom folder: ${folderPath}`);

    try {
      const files = await fs.readdir(folderPath);
      const imageFiles = files.filter((file) =>
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file),
      );

      for (const file of imageFiles) {
        const sourcePath = path.join(folderPath, file);
        const destPath = path.join(this.imagesBasePath, file);

        // Copy file to products folder
        await fs.copyFile(sourcePath, destPath);
        this.logger.log(`📁 Copied ${file} to products folder`);
      }

      // Now sync the images
      return this.syncProductImages();
    } catch (error) {
      this.logger.error("❌ Custom folder sync failed:", error);
      throw error;
    }
  }

  /**
   * Watch folder for new images and auto-sync
   */
  async watchFolder() {
    this.logger.log("👀 Starting folder watch...");

    try {
      const { watch } = await import("fs/promises");

      const watcher = watch(this.imagesBasePath);

      for await (const event of watcher) {
        if (event.eventType === "change" || event.eventType === "rename") {
          this.logger.log(`📸 Detected change: ${event.filename}`);

          // Wait a bit to ensure file is fully written
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Sync images
          await this.syncProductImages();
        }
      }
    } catch (error) {
      this.logger.error("❌ Watch failed:", error);
    }
  }

  /**
   * Tạo mapping guide file
   */
  async generateMappingGuide() {
    const products = await this.prisma.product.findMany({
      include: {
        variants: true,
      },
    });

    let guide = `# 📸 Product Image Mapping Guide\n\n`;
    guide += `## 📋 Naming Convention\n\n`;
    guide += `Place images in: \`client/public/images/products/\`\n\n`;
    guide += `### Option 1: By SKU (Recommended)\n`;
    guide += `- \`{SKU}.jpg\` - Main image for variant\n`;
    guide += `- \`{SKU}-1.jpg\`, \`{SKU}-2.jpg\` - Additional images\n\n`;
    guide += `### Option 2: By Product ID\n`;
    guide += `- \`{PRODUCT_ID}.jpg\` - Main image for product\n\n`;
    guide += `---\n\n`;
    guide += `## 🏷️ Your Products & SKUs:\n\n`;

    products.forEach((product) => {
      guide += `### ${product.name}\n`;
      guide += `- Product ID: \`${product.id}\`\n`;
      guide += `- Suggested filename: \`${product.id}.jpg\`\n\n`;

      if (product.variants.length > 0) {
        guide += `**Variants:**\n`;
        product.variants.forEach((variant) => {
          guide += `- SKU: \`${variant.sku}\` → Filename: \`${variant.sku}.jpg\`\n`;
          if (variant.attributes) {
            guide += `  - Attributes: ${JSON.stringify(variant.attributes)}\n`;
          }
        });
        guide += `\n`;
      }
    });

    guide += `\n## 🚀 Usage\n\n`;
    guide += `### 1. Place your images in the folder\n`;
    guide += `\`\`\`\nclient/public/images/products/\n├── MBA-M3-8-256-SG.jpg\n├── MBA-M3-8-512-SG.jpg\n└── PRODUCT_ID.jpg\n\`\`\`\n\n`;
    guide += `### 2. Run sync command\n`;
    guide += `\`\`\`bash\nPOST http://localhost:5000/admin/images/sync\n\`\`\`\n\n`;
    guide += `### 3. Images will be automatically mapped!\n\n`;
    guide += `---\n\n`;
    guide += `Generated: ${new Date().toISOString()}\n`;

    const guidePath = path.join(process.cwd(), "IMAGE_MAPPING_GUIDE.md");
    await fs.writeFile(guidePath, guide, "utf-8");

    this.logger.log(`📄 Generated mapping guide: ${guidePath}`);
    return { path: guidePath, content: guide };
  }

  /**
   * Clean up orphaned images (images not associated with any product)
   */
  async cleanupOrphanedImages() {
    const images = await this.prisma.productImage.findMany({
      include: {
        product: true,
      },
    });

    let deleted = 0;

    for (const image of images) {
      if (!image.product) {
        await this.prisma.productImage.delete({
          where: { id: image.id },
        });
        deleted++;
        this.logger.log(`🗑️  Deleted orphaned image: ${image.url}`);
      }
    }

    return { deleted };
  }
}
