import { ApiProperty } from '@nestjs/swagger';
import { VoucherType } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVoucherDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: VoucherType })
  @IsEnum(VoucherType)
  type: VoucherType;

  @ApiProperty({ description: 'percent (1-100) hoặc số tiền VND' })
  @IsInt()
  @Min(1)
  value: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  maxDiscount?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  minOrderValue?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  usagePerUser?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}
