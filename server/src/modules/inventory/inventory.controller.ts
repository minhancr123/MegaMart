import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { 
  CreateWarehouseDto, 
  UpdateWarehouseDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  UpdateInventoryDto,
  QueryInventoryDto,
} from './dto/inventory.dto';
import {
  CreateStockMovementDto,
  QueryStockMovementDto,
} from './dto/stock-movement.dto';
import {
  CreatePurchaseOrderDto,
  QueryPurchaseOrderDto,
  UpdateMovementQcDto,
  CreatePalletDto,
  UpdatePalletDto,
  CreatePalletBoxDto,
  UpdatePalletBoxDto,
} from './dto/purchase-order.dto';
import {
  CreateLotDto,
  UpdateLotDto,
  QueryLotDto,
  CreateSerialsDto,
  UpdateSerialDto,
  QuerySerialDto,
} from './dto/lot.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ============== WAREHOUSE ==============

  @Get('warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiQuery({ name: 'includeInactive', required: false })
  async findAllWarehouses(@Query('includeInactive') includeInactive?: string) {
    return this.inventoryService.findAllWarehouses(includeInactive === 'true');
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  async findWarehouseById(@Param('id') id: string) {
    return this.inventoryService.findWarehouseById(id);
  }

  @Post('warehouses')
  @ApiOperation({ summary: 'Create new warehouse' })
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse' })
  async updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.inventoryService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Delete warehouse (soft delete)' })
  async deleteWarehouse(@Param('id') id: string) {
    return this.inventoryService.deleteWarehouse(id);
  }

  // ============== SUPPLIER ==============

  @Get('suppliers')
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiQuery({ name: 'includeInactive', required: false })
  async findAllSuppliers(@Query('includeInactive') includeInactive?: string) {
    return this.inventoryService.findAllSuppliers(includeInactive === 'true');
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findSupplierById(@Param('id') id: string) {
    return this.inventoryService.findSupplierById(id);
  }

  @Post('suppliers')
  @ApiOperation({ summary: 'Create new supplier' })
  async createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: 'Update supplier' })
  async updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.inventoryService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: 'Delete supplier (soft delete)' })
  async deleteSupplier(@Param('id') id: string) {
    return this.inventoryService.deleteSupplier(id);
  }

  // ============== INVENTORY ==============

  @Get('stock')
  @ApiOperation({ summary: 'Get inventory with filters' })
  async getInventory(@Query() query: QueryInventoryDto) {
    return this.inventoryService.getInventory(query);
  }

  @Get('stock/low')
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getLowStockItems(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getLowStockItems(warehouseId);
  }

  @Get('stock/stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async getInventoryStats(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getInventoryStats(warehouseId);
  }

  @Put('stock/:warehouseId/:variantId')
  @ApiOperation({ summary: 'Update inventory for a variant in a warehouse' })
  async updateInventory(
    @Param('warehouseId') warehouseId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateInventoryDto,
  ) {
    return this.inventoryService.updateInventory(warehouseId, variantId, dto);
  }

  // ============== STOCK MOVEMENTS ==============

  @Get('movements')
  @ApiOperation({ summary: 'Get all stock movements' })
  async findAllStockMovements(@Query() query: QueryStockMovementDto) {
    return this.inventoryService.findAllStockMovements(query);
  }

  @Get('movements/:id')
  @ApiOperation({ summary: 'Get stock movement by ID' })
  async findStockMovementById(@Param('id') id: string) {
    return this.inventoryService.findStockMovementById(id);
  }

  @Get('variants/search')
  @ApiOperation({ summary: 'Search variants by SKU or product name' })
  @ApiQuery({ name: 'q', description: 'Search query (SKU or product name)', required: true })
  async searchVariants(@Query('q') query: string) {
    return this.inventoryService.searchVariants(query);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Create new stock movement (import/export/transfer)' })
  async createStockMovement(@Body() dto: CreateStockMovementDto, @Req() req: any) {
    console.log('Request user:', req.user);
    console.log('User keys:', req.user ? Object.keys(req.user) : 'undefined');
    
    if (!req.user) {
      throw new Error('User not authenticated - req.user is undefined');
    }
    
    if (!req.user.userId) {
      throw new Error(`User not authenticated - userId not found. Available keys: ${Object.keys(req.user).join(', ')}`);
    }
    
    return this.inventoryService.createStockMovement(dto, req.user.userId);
  }

  @Put('movements/:id/complete')
  @ApiOperation({ summary: 'Complete stock movement (apply to inventory)' })
  async completeStockMovement(@Param('id') id: string) {
    return this.inventoryService.completeStockMovement(id);
  }

  @Put('movements/:id/cancel')
  @ApiOperation({ summary: 'Cancel stock movement' })
  async cancelStockMovement(@Param('id') id: string) {
    return this.inventoryService.cancelStockMovement(id);
  }

  @Patch('movements/:id/qc')
  @ApiOperation({ summary: 'Ghi nhận kết quả QC phiếu nhập (đạt/lỗi, vị trí kệ, pallet)' })
  async updateMovementQc(@Param('id') id: string, @Body() dto: UpdateMovementQcDto) {
    return this.inventoryService.updateMovementQc(id, dto);
  }

  // ============== PURCHASE ORDER (Nấc 2) ==============

  @Get('purchase-orders')
  @ApiOperation({ summary: 'Danh sách Purchase Order' })
  async findAllPurchaseOrders(@Query() query: QueryPurchaseOrderDto) {
    return this.inventoryService.findAllPurchaseOrders(query);
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Chi tiết Purchase Order' })
  async findPurchaseOrderById(@Param('id') id: string) {
    return this.inventoryService.findPurchaseOrderById(id);
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: 'Tạo Purchase Order (nháp)' })
  async createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    return this.inventoryService.createPurchaseOrder(dto, req.user?.userId || req.user?.sub);
  }

  @Put('purchase-orders/:id/send')
  @ApiOperation({ summary: 'Gửi PO cho NCC (DRAFT -> SENT)' })
  async sendPurchaseOrder(@Param('id') id: string) {
    return this.inventoryService.sendPurchaseOrder(id);
  }

  @Post('purchase-orders/:id/send-email')
  @ApiOperation({ summary: 'Gửi email PO cho NCC (cần cấu hình SMTP)' })
  async sendPurchaseOrderEmail(@Param('id') id: string) {
    return this.inventoryService.sendPurchaseOrderEmail(id);
  }

  @Put('purchase-orders/:id/shipment')
  @ApiOperation({ summary: 'Admin đẩy tiến độ xe giao (0-100), share với NCC' })
  async updateShipment(@Param('id') id: string, @Body() body: { progress: number }) {
    return this.inventoryService.updateAdminShipment(id, body?.progress ?? 0);
  }

  @Put('purchase-orders/:id/cancel')
  @ApiOperation({ summary: 'Hủy Purchase Order' })
  async cancelPurchaseOrder(@Param('id') id: string) {
    return this.inventoryService.cancelPurchaseOrder(id);
  }

  // ============== PALLET (Nấc 2, gọn nhẹ) ==============

  @Get('pallets')
  @ApiOperation({ summary: 'Danh sách pallet (lọc theo kho)' })
  async findAllPallets(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.findAllPallets(warehouseId);
  }

  @Post('pallets')
  @ApiOperation({ summary: 'Tạo pallet mới' })
  async createPallet(@Body() dto: CreatePalletDto) {
    return this.inventoryService.createPallet(dto);
  }

  @Put('pallets/:id')
  @ApiOperation({ summary: 'Cập nhật pallet (vị trí/trạng thái/ghi chú)' })
  async updatePallet(@Param('id') id: string, @Body() dto: UpdatePalletDto) {
    return this.inventoryService.updatePallet(id, dto);
  }

  @Get('pallets/:id')
  @ApiOperation({ summary: 'Chi tiết pallet kèm thùng theo tầng' })
  async getPalletById(@Param('id') id: string) {
    return this.inventoryService.getPalletById(id);
  }

  @Post('pallets/:id/boxes')
  @ApiOperation({ summary: 'Thêm thùng vào pallet (chọn tầng)' })
  async createPalletBox(@Param('id') id: string, @Body() dto: CreatePalletBoxDto, @Req() req: any) {
    return this.inventoryService.createPalletBox(id, dto, req.user?.userId || req.user?.sub);
  }

  @Put('pallets/:id/boxes/:boxId')
  @ApiOperation({ summary: 'Sửa thùng (tầng/SL/ghi chú/mặt hàng)' })
  async updatePalletBox(
    @Param('id') id: string,
    @Param('boxId') boxId: string,
    @Body() dto: UpdatePalletBoxDto,
  ) {
    return this.inventoryService.updatePalletBox(id, boxId, dto);
  }

  @Delete('pallets/:id/boxes/:boxId')
  @ApiOperation({ summary: 'Xóa thùng khỏi pallet' })
  async deletePalletBox(@Param('id') id: string, @Param('boxId') boxId: string, @Req() req: any) {
    return this.inventoryService.deletePalletBox(id, boxId, req.user?.userId || req.user?.sub);
  }

  @Get('pallets/:id/history')
  @ApiOperation({ summary: 'Lịch sử thao tác của pallet' })
  async getPalletHistory(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.inventoryService.getPalletHistory(id, limit ? Number(limit) : 20);
  }

  @Post('pallets/transfer-box')
  @ApiOperation({ summary: 'Di dời thùng sang pallet khác (cập nhật trực tiếp)' })
  async transferPalletBox(
    @Body() dto: { boxId: string; toPalletId: string; targetLevel: number },
    @Req() req: any,
  ) {
    return this.inventoryService.transferPalletBox(
      dto.boxId,
      dto.toPalletId,
      Number(dto.targetLevel),
      req.user?.userId || req.user?.sub,
    );
  }

  // ============== LOT (Nấc 3) ==============

  @Get('lots/expiry-alerts')
  @ApiOperation({ summary: 'Cảnh báo HSD: quá hạn còn tồn + sắp hết trong 30 ngày' })
  async getExpiryAlerts() {
    return this.inventoryService.getExpiryAlerts();
  }

  @Get('lots')
  @ApiOperation({ summary: 'Danh sách lô hàng' })
  async findAllLots(@Query() query: QueryLotDto) {
    return this.inventoryService.findAllLots(query);
  }

  @Get('lots/:id')
  @ApiOperation({ summary: 'Chi tiết lô + serial' })
  async findLotById(@Param('id') id: string) {
    return this.inventoryService.findLotById(id);
  }

  @Post('lots')
  @ApiOperation({ summary: 'Tạo lô tay' })
  async createLot(@Body() dto: CreateLotDto) {
    return this.inventoryService.createLot(dto);
  }

  @Put('lots/:id')
  @ApiOperation({ summary: 'Sửa lô (tồn/NSX/HSD/trạng thái)' })
  async updateLot(@Param('id') id: string, @Body() dto: UpdateLotDto) {
    return this.inventoryService.updateLot(id, dto);
  }

  // ============== SERIAL (Nấc 3) ==============

  @Get('serials')
  @ApiOperation({ summary: 'Tra cứu serial' })
  async findAllSerials(@Query() query: QuerySerialDto) {
    return this.inventoryService.findAllSerials(query);
  }

  @Post('serials')
  @ApiOperation({ summary: 'Nạp serial hàng loạt (tối đa 500/lần)' })
  async createSerials(@Body() dto: CreateSerialsDto) {
    return this.inventoryService.createSerials(dto);
  }

  @Put('serials/:id')
  @ApiOperation({ summary: 'Đổi trạng thái serial (bán/lỗi...)' })
  async updateSerial(@Param('id') id: string, @Body() dto: UpdateSerialDto) {
    return this.inventoryService.updateSerial(id, dto);
  }
}
