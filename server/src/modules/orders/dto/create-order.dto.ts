import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject, IsNumber, IsEnum } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

export class OrderTotalsDto {
  @ApiProperty()
  @IsNumber()
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  tax: number;

  @ApiProperty()
  @IsNumber()
  total: number;

  @ApiProperty({ required: false, description: 'Giảm giá từ voucher (VND)' })
  @IsNumber()
  @IsOptional()
  discount?: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cartId: string;

  @ApiProperty({ type: ShippingAddressDto })
  @IsObject()
  @IsNotEmpty()
  shipping: ShippingAddressDto;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  paymentMethod: PaymentProvider;

  @ApiProperty({ type: OrderTotalsDto })
  @IsObject()
  @IsNotEmpty()
  totals: OrderTotalsDto;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiProperty({ required : false })
  @IsString()
  @IsOptional()
  userId?: string;
}
