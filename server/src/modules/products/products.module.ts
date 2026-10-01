import { Module } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";

@Module({
  imports: [CacheModule.register({ ttl: 5 * 60 * 1000, max: 1000 })],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
