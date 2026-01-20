import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });

    this.logger.log('✅ Cloudinary configured');
  }

  /**
   * Upload single image to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'products',
  ): Promise<{ url: string; publicId: string }> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `megamart/${folder}`,
            resource_type: 'auto',
            transformation: [
              { width: 1000, height: 1000, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) {
              this.logger.error('Upload failed:', error);
              return reject(error);
            }
            if (!result) {
              return reject(new Error('Upload failed: No result returned'));
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          },
        );

        uploadStream.end(file.buffer);
      });
    } catch (error) {
      this.logger.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: Array<Express.Multer.File>,
    folder: string = 'products',
  ): Promise<Array<{ url: string; publicId: string; originalName: string }>> {
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadImage(file, folder);
      return {
        ...result,
        originalName: file.originalname,
      };
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`🗑️ Deleted image: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    const deletePromises = publicIds.map((id) => this.deleteImage(id));
    await Promise.all(deletePromises);
  }

  /**
   * Get all images from a folder
   */
  async getImagesFromFolder(folder: string = 'products'): Promise<any[]> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `megamart/${folder}`,
        max_results: 500,
      });

      return result.resources;
    } catch (error) {
      this.logger.error('Error fetching images:', error);
      throw error;
    }
  }

  /**
   * Search images by filename pattern
   */
  async searchImagesByPattern(pattern: string): Promise<any[]> {
    try {
      const result = await cloudinary.search
        .expression(`folder:megamart/products AND filename:${pattern}*`)
        .sort_by('created_at', 'desc')
        .max_results(100)
        .execute();

      return result.resources;
    } catch (error) {
      this.logger.error('Error searching images:', error);
      throw error;
    }
  }

  /**
   * Get image info by public ID
   */
  async getImageInfo(publicId: string): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      this.logger.error('Error getting image info:', error);
      throw error;
    }
  }

  /**
   * Generate optimized URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {},
  ): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: options.width || 800,
          height: options.height || 800,
          crop: options.crop || 'limit',
        },
        { quality: options.quality || 'auto' },
        { fetch_format: options.format || 'auto' },
      ],
    });
  }
}
