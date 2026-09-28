import { Module } from "@nestjs/common";
import { ImageSyncService } from "./image-sync.service";
import { ImageSyncController } from "./image-sync.controller";
import { CloudinaryService } from "./cloudinary.service";
import { CloudinaryImageSyncService } from "./cloudinary-sync.service";
import { CloudImageController } from "./cloud-image.controller";

@Module({
  controllers: [ImageSyncController, CloudImageController],
  providers: [ImageSyncService, CloudinaryService, CloudinaryImageSyncService],
  exports: [ImageSyncService, CloudinaryService, CloudinaryImageSyncService],
})
export class ImageSyncModule {}
