import { Module } from '@nestjs/common';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { VoucherGovernanceService } from './voucher-governance.service';
import { VoucherGovernanceController } from './voucher-governance.controller';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Module({
  controllers: [VoucherController, VoucherGovernanceController],
  providers: [VoucherService, VoucherGovernanceService, PrismaService],
  exports: [VoucherService, VoucherGovernanceService],
})
export class VoucherModule {}
