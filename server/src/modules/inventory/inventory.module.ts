import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { SupplierPortalController } from "./supplier-portal.controller";
import { InventoryService } from "./inventory.service";
import { SupplierGuard } from "src/guards/supplier.guard";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [EmailModule],
  controllers: [InventoryController, SupplierPortalController],
  providers: [InventoryService, SupplierGuard],
  exports: [InventoryService],
})
export class InventoryModule {}
