import { Module } from '@nestjs/common';
import { FlashSaleController } from './flash-sale.controller';
import { FlashSaleService } from './flash-sale.service';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [FlashSaleController],
  providers: [FlashSaleService, PrismaService],
  exports: [FlashSaleService],
})
export class FlashSaleModule {}
