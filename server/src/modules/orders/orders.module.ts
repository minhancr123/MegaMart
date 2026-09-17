import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderHoldTimeoutService } from './order-hold-timeout.service';
import { PrismaModule } from 'src/prismaClient/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { ShippingModule } from '../shipping/shipping.module';
import { ImageSyncModule } from '../images/image-sync.module';
import { WalletModule } from '../wallet/wallet.module';
import { RefundModule } from '../refund/refund.module';
import { ShippersModule } from '../shippers/shippers.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { VoucherModule } from '../vouchers/voucher.module';

@Module({
  imports: [PrismaModule, PaymentModule, ShippingModule, ImageSyncModule, WalletModule, RefundModule, ShippersModule, forwardRef(() => LoyaltyModule), forwardRef(() => VoucherModule)],
  controllers: [OrdersController],
  providers: [OrdersService, OrderHoldTimeoutService],
  exports: [OrdersService]
})
export class OrdersModule {}
