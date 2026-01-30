import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [SaleController],
  providers: [SaleService, PrismaService],
  exports: [SaleService],
})
export class SaleModule {}
