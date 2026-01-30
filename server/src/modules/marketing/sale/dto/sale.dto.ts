import { IsNotEmpty, IsOptional, IsInt, Min, Max, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplySaleDto {
  @ApiProperty({ description: 'Variant IDs to apply sale', type: [String] })
  @IsArray()
  @IsNotEmpty()
  variantIds: string[];

  @ApiProperty({ description: 'Discount percentage (0-100)', example: 20 })
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent: number;

  @ApiPropertyOptional({ description: 'Sale start date', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  saleStartDate?: string;

  @ApiPropertyOptional({ description: 'Sale end date', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  saleEndDate?: string;
}

export class UpdateVariantSaleDto {
  @ApiPropertyOptional({ description: 'Discount percentage (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Sale start date' })
  @IsOptional()
  @IsDateString()
  saleStartDate?: string;

  @ApiPropertyOptional({ description: 'Sale end date' })
  @IsOptional()
  @IsDateString()
  saleEndDate?: string;
}

export class RemoveSaleDto {
  @ApiProperty({ description: 'Variant IDs to remove sale', type: [String] })
  @IsArray()
  @IsNotEmpty()
  variantIds: string[];
}
