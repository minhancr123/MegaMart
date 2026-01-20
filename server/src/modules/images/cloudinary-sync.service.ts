import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prismaClient/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import * as multer from 'multer';

@Injectable()
export class CloudinaryImageSyncService {
  private readonly logger = new Logger(CloudinaryImageSyncService.name);

  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  /**
   * Upload images to Cloudinary và tự động map với products
   * Naming convention: {SKU}.jpg hoặc {SKU}-1.jpg
   */
  async uploadAndSyncImages(files: Array<Express.Multer.File>) {
    this.logger.log(`🔄 Uploading ${files.length} images to Cloudinary...`);

    const results = {
      uploaded: 0,
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

    const skuMap = new Map();
    products.forEach((p) => {
      p.variants.forEach((v) =>
        skuMap.set(v.sku.toLowerCase(), { product: p, variant: v }),
      );
    });

    for (const file of files) {
      try {
        // Extract SKU from filename
        const filename = file.originalname;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        const [baseName] = nameWithoutExt.split('-').slice(0, -1).length > 0
          ? [nameWithoutExt.split('-').slice(0, -1).join('-')]
          : [nameWithoutExt];

        const match = skuMap.get(baseName.toLowerCase());

        if (!match) {
          results.skipped++;
          results.details.push({
            file: filename,
            status: 'no_match',
            reason: 'No matching SKU found',
          });
          this.logger.warn(`⚠️ No match for ${filename}`);
          continue;
        }

        const { product } = match;

        // Upload to Cloudinary
        this.logger.log(`📤 Uploading ${filename}...`);
        const uploaded = await this.cloudinary.uploadImage(file, 'products');
        results.uploaded++;

        // Check if image already exists
        const existingImage = product.images.find(
          (img) => img.url === uploaded.url,
        );
        if (existingImage) {
          results.skipped++;
          results.details.push({
            file: filename,
            product: product.name,
            status: 'already_exists',
            url: uploaded.url,
          });
          continue;
        }

        // Add to database
        await this.prisma.productImage.create({
          data: {
            productId: product.id,
            url: uploaded.url,
            alt: `${product.name} - ${nameWithoutExt}`,
          },
        });

        results.synced++;
        results.details.push({
          file: filename,
          product: product.name,
          sku: baseName,
          status: 'synced',
          url: uploaded.url,
          publicId: uploaded.publicId,
        });

        this.logger.log(`✅ Synced ${filename} -> ${product.name}`);
      } catch (error) {
        results.errors++;
        results.details.push({
          file: file.originalname,
          status: 'error',
          error: error.message,
        });
        this.logger.error(`❌ Error processing ${file.originalname}:`, error);
      }
    }

    this.logger.log(`
🎉 Upload & Sync completed!
   📤 Uploaded: ${results.uploaded}
   ✅ Synced: ${results.synced}
   ⏭️  Skipped: ${results.skipped}
   ❌ Errors: ${results.errors}
    `);

    return results;
  }

  /**
   * Sync existing Cloudinary images with products
   */
  async syncCloudinaryImages() {
    this.logger.log('🔄 Syncing existing Cloudinary images...');

    const results = {
      synced: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    try {
      // Get all images from Cloudinary
      const cloudinaryImages = await this.cloudinary.getImagesFromFolder(
        'products',
      );
      this.logger.log(`📁 Found ${cloudinaryImages.length} images on Cloudinary`);

      // Get products
      const products = await this.prisma.product.findMany({
        include: {
          variants: true,
          images: true,
        },
      });

      const skuMap = new Map();
      products.forEach((p) => {
        p.variants.forEach((v) =>
          skuMap.set(v.sku.toLowerCase(), { product: p, variant: v }),
        );
      });

      for (const image of cloudinaryImages) {
        try {
          // Extract filename from public_id
          const filename = image.public_id.split('/').pop();
          const nameWithoutExt = filename;
          const [baseName] = nameWithoutExt.split('-');

          const match = skuMap.get(baseName.toLowerCase());

          if (!match) {
            results.skipped++;
            continue;
          }

          const { product } = match;

          // Check if already in database
          const existingImage = product.images.find(
            (img) => img.url === image.secure_url,
          );
          if (existingImage) {
            results.skipped++;
            continue;
          }

          // Add to database
          await this.prisma.productImage.create({
            data: {
              productId: product.id,
              url: image.secure_url,
              alt: `${product.name} - ${nameWithoutExt}`,
            },
          });

          results.synced++;
          results.details.push({
            file: filename,
            product: product.name,
            status: 'synced',
            url: image.secure_url,
          });
        } catch (error) {
          results.errors++;
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Sync failed:', error);
      throw error;
    }
  }

  /**
   * Xóa ảnh khỏi cả Cloudinary và database
   */
  async deleteProductImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new Error('Image not found');
    }

    // Extract public_id from URL
    const publicId = this.extractPublicIdFromUrl(image.url);

    if (publicId) {
      // Delete from Cloudinary
      await this.cloudinary.deleteImage(publicId);
    }

    // Delete from database
    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    return { success: true, deletedUrl: image.url };
  }

  /**
   * Upload single image for specific product
   */
  async uploadImageForProduct(
    productId: string,
    file: Express.Multer.File,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Upload to Cloudinary
    const uploaded = await this.cloudinary.uploadImage(file, 'products');

    // Determine if this should be primary (first image)
    const isPrimary = product.images.length === 0;
    const displayOrder = product.images.length;

    // Save to database
    const image = await this.prisma.productImage.create({
      data: {
        productId: product.id,
        url: uploaded.url,
        alt: `${product.name} - ${file.originalname}`,
        isPrimary,
        displayOrder,
      },
    });

    this.logger.log(
      `✅ Uploaded image for ${product.name}${isPrimary ? ' (primary)' : ''}`,
    );

    return {
      ...image,
      imageUrl: uploaded.url,
      imageId: image.id,
      publicId: uploaded.publicId,
    };
  }

  /**
   * Get all images for a product
   */
  async getProductImages(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      images: product.images,
    };
  }

  /**
   * Set image as primary for product
   */
  async setPrimaryImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: true },
    });

    if (!image) {
      throw new Error('Image not found');
    }

    // Unset current primary image
    await this.prisma.productImage.updateMany({
      where: {
        productId: image.productId,
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });

    // Set new primary image
    const updatedImage = await this.prisma.productImage.update({
      where: { id: imageId },
      data: {
        isPrimary: true,
      },
    });

    return {
      success: true,
      image: updatedImage,
    };
  }

  /**
   * Extract Cloudinary public_id from URL
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      const matches = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif)/);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStats() {
    const [totalImages, totalProducts, cloudinaryImages] = await Promise.all([
      this.prisma.productImage.count(),
      this.prisma.product.count(),
      this.cloudinary.getImagesFromFolder('products'),
    ]);

    return {
      totalImages,
      totalProducts,
      cloudinaryImages: cloudinaryImages.length,
      averageImagesPerProduct: (totalImages / totalProducts).toFixed(2),
    };
  }

  /**
   * Add image from URL to product
   */
  async addImageFromUrl(
    productId: string,
    url: string,
    alt?: string,
  ): Promise<any> {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if URL already exists for this product
    const existingImage = product.images.find((img) => img.url === url);
    if (existingImage) {
      return {
        success: false,
        message: 'Image URL already exists for this product',
        image: existingImage,
      };
    }

    // Create image record
    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url,
        alt: alt || `${product.name} image`,
        isPrimary: product.images.length === 0, // Set as primary if first image
        displayOrder: product.images.length,
      },
    });

    this.logger.log(`✅ Added image from URL for product: ${product.name}`);

    return {
      success: true,
      image,
      imageUrl: url,
    };
  }
}
