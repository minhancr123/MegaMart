import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ImageSyncService } from './image-sync.service';

@ApiTags('Admin - Images')
@Controller('admin/images')
export class ImageSyncController {
  constructor(private readonly imageSyncService: ImageSyncService) {}

  @Post('sync')
  @ApiOperation({ 
    summary: 'Sync images from folder',
    description: 'Automatically map images from public/images/products/ to products based on SKU or Product ID'
  })
  async syncImages() {
    return this.imageSyncService.syncProductImages();
  }

  @Post('sync-custom')
  @ApiOperation({ 
    summary: 'Sync from custom folder',
    description: 'Copy images from a custom folder and sync'
  })
  async syncCustomFolder(@Body('folderPath') folderPath: string) {
    return this.imageSyncService.syncFromCustomFolder(folderPath);
  }

  @Get('mapping-guide')
  @ApiOperation({ 
    summary: 'Generate image mapping guide',
    description: 'Get a markdown guide showing how to name images for each product/variant'
  })
  async getMappingGuide() {
    return this.imageSyncService.generateMappingGuide();
  }

  @Post('cleanup')
  @ApiOperation({ 
    summary: 'Cleanup orphaned images',
    description: 'Remove images not associated with any product'
  })
  async cleanupImages() {
    return this.imageSyncService.cleanupOrphanedImages();
  }

  @Post('watch')
  @ApiOperation({ 
    summary: 'Start watching folder (development only)',
    description: 'Automatically sync when new images are added'
  })
  async startWatching() {
    // Run in background
    this.imageSyncService.watchFolder();
    return { message: 'Folder watch started' };
  }
}
