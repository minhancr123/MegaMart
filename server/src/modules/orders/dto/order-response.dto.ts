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

  @ApiProperty({ required: false })
  user?: { id: string; name: string | null; email: string } | null;

  @ApiProperty({ required: false })
  assignedShipperId?: string | null;

  @ApiProperty({ required: false })
  assignedShipper?: {
    id: string;
    name: string | null;
    phone: string | null;
    vehiclePlate: string | null;
    avatarUrl: string | null;
    isActive?: boolean;
  } | null;

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

  @ApiProperty({ required: false })
  shippingCarrier?: string | null;

  @ApiProperty({ required: false })
  shippingOrderCode?: string | null;

  @ApiProperty({ required: false })
  shippingStatus?: string | null;

  @ApiProperty({ required: false })
  expectedDeliveryDate?: Date | null;

  @ApiProperty({ required: false })
  shippingFeeReal?: number | null;

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

  @ApiProperty({ required: false, description: 'Serial đã gán cho đơn (tra bảo hành)' })
  serials?: any[];
}
