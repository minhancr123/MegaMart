import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductImageDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty()
    @IsString()
    url: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    alt?: string;

    @ApiProperty({ required: false, description: 'Set this image as primary (shown on homepage)' })
    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    displayOrder?: number;
}

export class UpdateVariantDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @ApiProperty({ required: false, description: 'Array of colors with images' })
    @IsOptional()
    colors?: any;

    @ApiProperty({ required: false })
    @IsOptional()
    attributes?: any;
}

export class UpdateProductDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    brand?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiProperty({ 
        required: false, 
        description: 'Set specific image ID as primary. This will override isPrimary flags in images array.'
    })
    @IsOptional()
    @IsString()
    primaryImageId?: string;

    @ApiProperty({ required: false, type: [UpdateVariantDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateVariantDto)
    variants?: UpdateVariantDto[];

    @ApiProperty({ 
        required: false, 
        type: [UpdateProductImageDto],
        description: 'Can be array of URLs (strings) or array of image objects with isPrimary flag'
    })
    @IsOptional()
    @IsArray()
    images?: (string | UpdateProductImageDto)[]; // Array of image URLs or image objects
}

export class CreateProductWithVariantsDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    slug: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    brand?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    categoryId?: string;

    @ApiProperty({ type: [UpdateVariantDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateVariantDto)
    variants: UpdateVariantDto[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    images?: string[];
}
