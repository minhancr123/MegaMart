import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class AddItemToCartDto {

   @ApiProperty({
    description: 'User ID của người dùng',
    example: 'user_id_123',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Variant ID của sản phẩm',
    example: 'variant_id_123',
  })
  @IsNotEmpty()
  @IsString()
  variantId: string;
  @ApiProperty({
    description: 'Số lượng sản phẩm',
    example: 1,
    default: 1,
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  @Min(1)
  quantity?: number;
}

export class CartResponseDto {
  @ApiProperty({
    description: 'Cart ID',
    example: 'cart_id_123',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: 'user_id_123',
  })
  userId: string;

  @ApiProperty({
    description: 'Cart items',
    type: 'array',
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    description: 'Creation date',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
  })
  updatedAt: Date;
}

export class CartItemResponseDto {
  @ApiProperty({
    description: 'Cart item ID',
    example: 'item_id_123',
  })
  id: string;

  @ApiProperty({
    description: 'Variant ID',
    example: 'variant_id_123',
  })
  variantId: string;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Variant details',
  })
  variant: {
    id: string;
    sku: string;
    price: number;
    stock: number;
    attributes?: any;
    product: {
      id: string;
      name: string;
      description?: string;
      images: {
        id: string;
        url: string;
        alt?: string;
      }[];
    };
  };
}