import { Module } from "@nestjs/common";
import { SaleController } from "./sale.controller";
import { SaleService } from "./sale.service";
import { AuditLogModule } from "src/modules/audit-log/audit-log.module";

@Module({
  imports: [AuditLogModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
