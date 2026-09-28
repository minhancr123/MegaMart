import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
  Min,
  ValidateNested,
} from "class-validator";
import { PaymentProvider } from "@prisma/client";

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

  @ApiProperty({ description: "Vĩ độ địa chỉ Google Maps", required: false })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiProperty({ description: "Kinh độ địa chỉ Google Maps", required: false })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ description: "Mã tỉnh GHN", required: false })
  @IsOptional()
  provinceId?: number;

  @ApiProperty({ description: "Mã quận/huyện GHN", required: false })
  @IsOptional()
  districtId?: number;

  @ApiProperty({ description: "Mã phường/xã GHN", required: false })
  @IsOptional()
  @IsString()
  wardCode?: string;
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

  @ApiProperty({ required: false, description: "Giảm giá từ voucher (VND)" })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ required: false, description: "Phí vận chuyển GHN (VND)" })
  @IsNumber()
  @IsOptional()
  shippingFee?: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cartId: string;

  @ApiProperty({ type: ShippingAddressDto })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    required: false,
    description: "Số tiền muốn trừ từ ví MegaMart (VND)",
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  useWalletAmount?: number;
}
