import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class UpdatePaymentMethodDto {
  @ApiProperty({ 
    enum: PaymentProvider,
    description: 'Payment method: COD, VNPAY, BANK_TRANSFER, or MOMO'
  })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  paymentMethod: PaymentProvider;
}
