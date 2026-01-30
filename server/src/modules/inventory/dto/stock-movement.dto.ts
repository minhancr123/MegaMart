import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsEnum, Min, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum StockMovementType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  DAMAGE = 'DAMAGE',
  SALE = 'SALE',
}

export enum StockMovementStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ============== STOCK MOVEMENT ITEM DTO ==============

export class StockMovementItemDto {
  @ApiProperty({ description: 'ID của variant' })
  @IsString()
  variantId: string;

  @ApiProperty({ description: 'Số lượng' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Giá nhập (cho nhập kho)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============== CREATE STOCK MOVEMENT DTO ==============

export class CreateStockMovementDto {
  @ApiProperty({ enum: StockMovementType, description: 'Loại phiếu' })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ description: 'ID kho hàng' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'ID nhà cung cấp (cho nhập kho)' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'ID kho đích (cho chuyển kho)' })
  @IsOptional()
  @IsString()
  toWarehouseId?: string;

  @ApiPropertyOptional({ description: 'ID đơn hàng (cho xuất bán)' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [StockMovementItemDto], description: 'Danh sách sản phẩm' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockMovementItemDto)
  items: StockMovementItemDto[];
}

// ============== UPDATE STOCK MOVEMENT DTO ==============

export class UpdateStockMovementDto {
  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: StockMovementStatus, description: 'Trạng thái' })
  @IsOptional()
  @IsEnum(StockMovementStatus)
  status?: StockMovementStatus;
}

// ============== QUERY STOCK MOVEMENT DTO ==============

export class QueryStockMovementDto {
  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: StockMovementStatus })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã phiếu' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
