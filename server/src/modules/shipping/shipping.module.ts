import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ShippingService } from "./shipping.service";
import { ShippingController } from "./shipping.controller";
import { PrismaModule } from "src/prismaClient/prisma.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [PrismaModule, ConfigModule, forwardRef(() => OrdersModule)],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
