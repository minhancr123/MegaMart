import { Controller, Get, Put, Patch, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { SupplierGuard } from 'src/guards/supplier.guard';

/**
 * Cổng nhà cung cấp: NCC chỉ thấy PO của chính mình,
 * xác nhận đã nhận PO + ngày giao dự kiến.
 */
@ApiTags('supplier-portal')
@Controller('supplier')
@UseGuards(JwtAuthGuard, SupplierGuard)
@ApiBearerAuth('JWT-auth')
export class SupplierPortalController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Thông tin NCC đang đăng nhập' })
  async getProfile(@Req() req: any) {
    return this.inventoryService.getSupplierProfile(req.supplierId);
  }

  @Get('purchase-orders')
  @ApiOperation({ summary: 'PO của NCC (phân trang, lọc trạng thái)' })
  async findMyPurchaseOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.findSupplierPurchaseOrders(req.supplierId, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Chi tiết 1 PO của NCC' })
  async findMyPurchaseOrder(@Req() req: any, @Param('id') id: string) {
    return this.inventoryService.findSupplierPurchaseOrder(req.supplierId, id);
  }

  @Put('purchase-orders/:id/confirm')
  @ApiOperation({ summary: 'NCC xác nhận đã nhận PO (kèm ngày giao dự kiến)' })
  async confirmPurchaseOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { expectedDate?: string; note?: string },
  ) {
    return this.inventoryService.confirmPurchaseOrder(req.supplierId, id, body || {});
  }

  @Patch('purchase-orders/:id/shipment')
  @ApiOperation({ summary: 'NCC đẩy tiến độ xe giao (0-100)' })
  async updateShipment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { progress: number },
  ) {
    return this.inventoryService.updateSupplierShipment(req.supplierId, id, body?.progress ?? 0);
  }
}
