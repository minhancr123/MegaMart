import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateSaleCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  defaultDiscount: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  variantIds: string[];
}

export class AddSaleCampaignItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  variantIds: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  discountPercent: number;
}

export class GetSuggestedVariantsDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number = 10;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(180)
  days?: number = 30;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(9999)
  maxSales?: number = 2;
}
