import {
  Controller,
  Get,
  Post,
  Put,
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
}
