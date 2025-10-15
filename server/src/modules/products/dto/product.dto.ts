import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsNumber, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'iPhone 15 Pro',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Product slug (URL-friendly name)',
    example: 'iphone-15-pro',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Latest iPhone with A17 Pro chip',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Product brand',
    example: 'Apple',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'Category ID',
    example: 'category_id_123',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CreateVariantDto {
  @ApiProperty({
    description: 'Product variant SKU',
    example: 'IP15P-128-NT',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Price in cents (VND)',
    example: 2999000000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Stock quantity',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({
    description: 'Variant attributes (color, size, etc.)',
    example: { color: 'Natural Titanium', storage: '128GB' },
    required: false,
  })
  @IsOptional()
  attributes?: any;
}

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'product_id_123',
  })
  id: string;

  @ApiProperty({
    description: 'Product slug',
    example: 'iphone-15-pro',
  })
  slug: string;

  @ApiProperty({
    description: 'Product name',
    example: 'iPhone 15 Pro',
  })
  name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Latest iPhone with A17 Pro chip',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Product brand',
    example: 'Apple',
    nullable: true,
  })
  brand: string | null;

  @ApiProperty({
    description: 'Category information',
    nullable: true,
  })
  category?: {
     id: string;
    name: string;
    slug: string;
  } | null;

  @ApiProperty({
    description: 'Product images',
    type: 'array',
  })
  images: {
    id: string;
    url: string;
    alt?: string;
  }[];

  @ApiProperty({
    description: 'Product variants',
    type: 'array',
  })
  variants: {
     id: string;
    sku: string;
    price: string; // Convert BigInt to string
    stock: number;
    attributes?: any;
  }[];

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class ProductQueryDto {
  @ApiProperty({
    description: 'Search term',
    required: false,
    example: 'iPhone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Category ID filter',
    required: false,
    example: 'category_id_123',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'Brand filter',
    required: false,
    example: 'Apple',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    description: 'Page number',
    required: false,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}
