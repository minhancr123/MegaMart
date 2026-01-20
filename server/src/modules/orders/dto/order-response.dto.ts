import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentProvider } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  variantId: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ required: false })
  variant?: any;
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  total: number;

  @ApiProperty({ description: 'Giảm giá từ voucher (VND)', required: false })
  discountAmount?: number;

  @ApiProperty({ required: false })
  voucherCode?: string | null;

  @ApiProperty()
  vatAmount: number;

  @ApiProperty()
  shippingFee: number;

  @ApiProperty()
  shippingAddress: any;

  @ApiProperty()
  billingAddress: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ required: false })
  payments?: any[];
}
