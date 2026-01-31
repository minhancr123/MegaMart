import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @ApiProperty({ enum: OrderStatus, required: false })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiProperty({ required: false, description: 'ID người thay đổi (admin/system)' })
  @IsString()
  @IsOptional()
  changedBy?: string;

  @ApiProperty({ required: false, description: 'Lý do thay đổi trạng thái' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiProperty({ required: false, description: 'Ghi chú thêm' })
  @IsString()
  @IsOptional()
  note?: string;
}
