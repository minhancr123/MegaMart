import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { CloudinaryImageSyncService } from './cloudinary-sync.service';

@ApiTags('Admin - Cloud Images')
@Controller('admin/cloud-images')
export class CloudImageController {
  constructor(
    private readonly cloudImageService: CloudinaryImageSyncService,
  ) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload images to Cloudinary and auto-map to products',
    description:
      'Upload multiple images. Filename should match SKU (e.g., MBA-M3-8-256-SG.jpg)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 20))
  async uploadImages(@UploadedFiles() files: Array<Express.Multer.File>) {
    return this.cloudImageService.uploadAndSyncImages(files as any);
  }

  @Post('upload/:productId')
  @ApiOperation({
    summary: 'Upload image for specific product',
    description: 'Upload single image and attach to a specific product',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImageForProduct(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.cloudImageService.uploadImageForProduct(productId, file as any);
  }

  @Post('sync-cloudinary')
  @ApiOperation({
    summary: 'Sync existing Cloudinary images',
    description:
      'Scan Cloudinary folder and map existing images to products by SKU',
  })
  async syncCloudinaryImages() {
    return this.cloudImageService.syncCloudinaryImages();
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get upload statistics',
    description: 'Get statistics about uploaded images',
  })
  async getStats() {
    return this.cloudImageService.getUploadStats();
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get images for product',
    description: 'Get all images for a specific product',
  })
  async getProductImages(@Param('productId') productId: string) {
    return this.cloudImageService.getProductImages(productId);
  }

  @Delete(':imageId')
  @ApiOperation({
    summary: 'Delete image',
    description: 'Delete image from both Cloudinary and database',
  })
  async deleteImage(@Param('imageId') imageId: string) {
    return this.cloudImageService.deleteProductImage(imageId);
  }

  @Patch(':imageId/set-primary')
  @ApiOperation({
    summary: 'Set image as primary',
    description: 'Set an image as the primary image for its product',
  })
  async setPrimaryImage(@Param('imageId') imageId: string) {
    return this.cloudImageService.setPrimaryImage(imageId);
  }

  @Post('add-url/:productId')
  @ApiOperation({
    summary: 'Add image from URL to product',
    description: 'Add an image to a product using an external URL',
  })
  async addImageFromUrl(
    @Param('productId') productId: string,
    @Body() body: { url: string; alt?: string },
  ) {
    return this.cloudImageService.addImageFromUrl(
      productId,
      body.url,
      body.alt,
    );
  }
}
