import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { SupplierPortalController } from './supplier-portal.controller';
import { InventoryService } from './inventory.service';
import { SupplierGuard } from 'src/guards/supplier.guard';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Module({
  controllers: [InventoryController, SupplierPortalController],
  providers: [InventoryService, SupplierGuard, PrismaService],
  exports: [InventoryService],
})
export class InventoryModule {}
