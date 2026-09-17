import { IsString, IsOptional, IsBoolean, IsInt, IsDateString, IsUrl, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredProductIds?: string[];

  @IsOptional()
  @IsInt()
  impressions?: number;

  @IsOptional()
  @IsInt()
  clicks?: number;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredProductIds?: string[];

  @IsOptional()
  @IsInt()
  impressions?: number;

  @IsOptional()
  @IsInt()
  clicks?: number;
}

export class UpdateBannerOrderDto {
  @IsString({ each: true })
  bannerIds: string[];
}
