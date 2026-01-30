import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FlashSaleItemDto {
  @IsString()
  variantId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  salePrice: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateFlashSaleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlashSaleItemDto)
  items?: FlashSaleItemDto[];
}

export class UpdateFlashSaleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AddFlashSaleItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlashSaleItemDto)
  items: FlashSaleItemDto[];
}

export class UpdateFlashSaleItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  salePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}
