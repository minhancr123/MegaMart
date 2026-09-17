import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsEnum, Min, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ============== PO ITEM DTO ==============

export class PurchaseOrderItemDto {
  @ApiProperty({ description: 'ID của variant' })
  @IsString()
  variantId: string;

  @ApiProperty({ description: 'Số lượng đặt' })
  @IsInt()
  @Min(1)
  orderedQty: number;

  @ApiPropertyOptional({ description: 'Giá nhập dự kiến (VND)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'Ghi chú dòng hàng' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============== CREATE PO DTO ==============

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'ID nhà cung cấp' })
  @IsString()
  supplierId: string;

  @ApiProperty({ description: 'ID kho nhận dự kiến' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Ngày mong muốn về hàng (ISO)' })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú PO' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto], description: 'Danh sách mặt hàng đặt' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}

// ============== QUERY PO DTO ==============

export class QueryPurchaseOrderDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã PO' })
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

// ============== QC ITEM DTO ==============

export class QcItemDto {
  @ApiProperty({ description: 'ID của variant' })
  @IsString()
  variantId: string;

  @ApiProperty({ description: 'Số lượng đạt QC (cộng tồn bấy nhiêu)' })
  @IsInt()
  @Min(0)
  qcPassedQty: number;

  @ApiPropertyOptional({ description: 'Số lượng lỗi QC (không cộng tồn)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  qcFailedQty?: number;

  @ApiPropertyOptional({ description: 'Ghi chú kiểm hàng' })
  @IsOptional()
  @IsString()
  qcNote?: string;

  @ApiPropertyOptional({ description: 'Vị trí kệ xếp hàng (vd A1-01)' })
  @IsOptional()
  @IsString()
  putawayLocation?: string;

  @ApiPropertyOptional({ description: 'ID pallet xếp hàng' })
  @IsOptional()
  @IsString()
  palletId?: string;

  @ApiPropertyOptional({ description: 'Mã lô (trống = tự sinh nếu có HSD/NSX)' })
  @IsOptional()
  @IsString()
  lotCode?: string;

  @ApiPropertyOptional({ description: 'NSX của lô (ISO)' })
  @IsOptional()
  @IsString()
  mfgDate?: string;

  @ApiPropertyOptional({ description: 'HSD của lô (ISO)' })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Danh sách serial (mảng hoặc chuỗi nhiều dòng)' })
  @IsOptional()
  serials?: string[] | string;
}

export class UpdateMovementQcDto {
  @ApiProperty({ type: [QcItemDto], description: 'Kết quả QC từng dòng hàng' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QcItemDto)
  items: QcItemDto[];
}

// ============== PALLET DTO ==============

export class CreatePalletDto {
  @ApiProperty({ description: 'Mã pallet (vd PL-HCM-001)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'ID kho' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Số tầng tối đa' })
  @IsOptional()
  @IsInt()
  maxLevels?: number;

  @ApiPropertyOptional({ description: 'Vị trí pallet đang đứng' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tải trọng tối đa (kg)' })
  @IsOptional()
  @IsInt()
  maxWeight?: number;

  @ApiPropertyOptional({ description: 'Thể tích tối đa (m3)' })
  @IsOptional()
  @IsNumber()
  maxVolume?: number;
}

export class CreatePalletBoxDto {
  @ApiProperty({ description: 'Mã thùng (vd PL-HCM-002-T1-B03). Bỏ trống = tự sinh' })
  @IsOptional()
  @IsString()
  boxCode?: string;

  @ApiProperty({ description: 'Tầng (1 = sát pallet)' })
  @IsInt()
  @Min(1)
  level: number;

  @ApiPropertyOptional({ description: 'ID variant trong thùng' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Số lượng trong thùng' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Ghi chú thùng' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Khối lượng bì (kg)' })
  @IsOptional()
  @IsNumber()
  tareWeight?: number;

  @ApiPropertyOptional({ description: 'Khối lượng tịnh (kg)' })
  @IsOptional()
  @IsNumber()
  netWeight?: number;

  @ApiPropertyOptional({ description: 'Dài (mm)' })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ description: 'Rộng (mm)' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Cao (mm)' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Thể tích (m3)' })
  @IsOptional()
  @IsNumber()
  volume?: number;

  @ApiPropertyOptional({ description: 'Mã vạch thùng' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Mã PO nhập hàng' })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional({ description: 'Mục đích xuất' })
  @IsOptional()
  @IsString()
  exportPurpose?: string;

  @ApiPropertyOptional({ description: 'Phiếu xuất liên kết' })
  @IsOptional()
  @IsString()
  exportTicketCode?: string;

  @ApiPropertyOptional({ description: 'Người niêm phong' })
  @IsOptional()
  @IsString()
  sealedBy?: string;
}

export class UpdatePalletBoxDto {
  @ApiPropertyOptional({ description: 'Tầng (1 = sát pallet)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({ description: 'ID variant trong thùng' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ description: 'Số lượng trong thùng' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Ghi chú thùng' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Khối lượng bì (kg)' })
  @IsOptional()
  @IsNumber()
  tareWeight?: number;

  @ApiPropertyOptional({ description: 'Khối lượng tịnh (kg)' })
  @IsOptional()
  @IsNumber()
  netWeight?: number;

  @ApiPropertyOptional({ description: 'Dài (mm)' })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({ description: 'Rộng (mm)' })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Cao (mm)' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Thể tích (m3)' })
  @IsOptional()
  @IsNumber()
  volume?: number;

  @ApiPropertyOptional({ description: 'Mã vạch thùng' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Mã PO nhập hàng' })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional({ description: 'Mục đích xuất' })
  @IsOptional()
  @IsString()
  exportPurpose?: string;

  @ApiPropertyOptional({ description: 'Phiếu xuất liên kết' })
  @IsOptional()
  @IsString()
  exportTicketCode?: string;

  @ApiPropertyOptional({ description: 'Người niêm phong' })
  @IsOptional()
  @IsString()
  sealedBy?: string;

  @ApiPropertyOptional({ description: 'Thứ tự ô xếp trên tầng' })
  @IsOptional()
  @IsInt()
  slotIndex?: number;
}

export class UpdatePalletDto {
  @ApiPropertyOptional({ description: 'Vị trí pallet đang đứng' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EMPTY', 'LOCKED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tải trọng tối đa (kg)' })
  @IsOptional()
  @IsInt()
  maxWeight?: number;

  @ApiPropertyOptional({ description: 'Thể tích tối đa (m3)' })
  @IsOptional()
  @IsNumber()
  maxVolume?: number;

  @ApiPropertyOptional({ description: 'Trạng thái kiểm định' })
  @IsOptional()
  @IsString()
  qcStatus?: string;

  @ApiPropertyOptional({ description: 'Ghi chú kiểm định' })
  @IsOptional()
  @IsString()
  qcNote?: string;
}
