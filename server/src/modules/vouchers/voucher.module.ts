import { Module } from '@nestjs/common';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Module({
  controllers: [VoucherController],
  providers: [VoucherService, PrismaService],
  exports: [VoucherService],
})
export class VoucherModule {}
