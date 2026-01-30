import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============== WAREHOUSE DTOs ==============

export class CreateWarehouseDto {
  @ApiProperty({ description: 'Tên kho' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mã kho', example: 'KHO-HCM' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Địa chỉ kho' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============== SUPPLIER DTOs ==============

export class CreateSupplierDto {
  @ApiProperty({ description: 'Tên nhà cung cấp' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mã nhà cung cấp', example: 'NCC-001' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Mã số thuế' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Người liên hệ' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============== WAREHOUSE INVENTORY DTOs ==============

export class UpdateInventoryDto {
  @ApiProperty({ description: 'Số lượng tồn' })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Số lượng tối thiểu cảnh báo' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Số lượng tối đa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxQuantity?: number;

  @ApiPropertyOptional({ description: 'Vị trí trong kho', example: 'A1-01' })
  @IsOptional()
  @IsString()
  location?: string;
}

export class QueryInventoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Lọc sản phẩm sắp hết' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Tìm theo SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
