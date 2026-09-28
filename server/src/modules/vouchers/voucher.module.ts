import { Module } from "@nestjs/common";
import { VoucherController } from "./voucher.controller";
import { VoucherService } from "./voucher.service";
import { VoucherGovernanceService } from "./voucher-governance.service";
import { VoucherGovernanceController } from "./voucher-governance.controller";

@Module({
  controllers: [VoucherController, VoucherGovernanceController],
  providers: [VoucherService, VoucherGovernanceService],
  exports: [VoucherService, VoucherGovernanceService],
})
export class VoucherModule {}
