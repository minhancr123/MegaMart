import { Module } from "@nestjs/common";
import { FlashSaleController } from "./flash-sale.controller";
import { FlashSaleService } from "./flash-sale.service";
import { AuditLogModule } from "src/modules/audit-log/audit-log.module";

@Module({
  imports: [AuditLogModule],
  controllers: [FlashSaleController],
  providers: [FlashSaleService],
  exports: [FlashSaleService],
})
export class FlashSaleModule {}
