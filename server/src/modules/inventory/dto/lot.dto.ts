import { IsString, IsOptional, IsArray, IsInt, Min, IsDateString, IsIn, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============== LOT DTO ==============

export class CreateLotDto {
  @ApiProperty({ description: 'Mã lô (vd LOT-2026-0001). Trống = tự sinh' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'ID biến thể' })
  @IsString()
  variantId: string;

  @ApiPropertyOptional({ description: 'ID kho (lô đang nằm)' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'ID NCC của lô' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({ description: 'Số lượng ban đầu của lô' })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ description: 'Ngày sản xuất (ISO)' })
  @IsOptional()
  @IsDateString()
  mfgDate?: string;

  @ApiPropertyOptional({ description: 'Hạn sử dụng (ISO)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú lô' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLotDto {
  @ApiPropertyOptional({ description: 'Số lượng hiện tại (kiểm kê tay)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Ngày sản xuất (ISO)' })
  @IsOptional()
  @IsDateString()
  mfgDate?: string;

  @ApiPropertyOptional({ description: 'Hạn sử dụng (ISO)' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'BLOCKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'BLOCKED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Ghi chú lô' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryLotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Lọc: all | expiring (HSD 30 ngày) | expired (quá HSD còn tồn)' })
  @IsOptional()
  @IsString()
  expiry?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã lô / SKU' })
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

// ============== SERIAL DTO ==============

export class CreateSerialsDto {
  @ApiProperty({ description: 'ID biến thể' })
  @IsString()
  variantId: string;

  @ApiPropertyOptional({ description: 'ID lô (nếu thuộc lô)' })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty({ type: [String], description: 'Danh sách serial (tối đa 500/lần)' })
  @IsArray()
  @IsString({ each: true })
  serials: string[];

  @ApiPropertyOptional({ description: 'Ghi chú chung' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSerialDto {
  @ApiPropertyOptional({ enum: ['IN_STOCK', 'SOLD', 'DEFECTIVE', 'RETURNED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'ID đơn đã bán (khi SOLD)' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QuerySerialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Tìm theo serial' })
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
