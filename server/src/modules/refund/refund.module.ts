import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prismaClient/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { WalletRefundProvider } from './providers/wallet-refund.provider';
import { SepayRefundProvider } from './providers/sepay-refund.provider';
import { ManualRefundProvider } from './providers/manual-refund.provider';
import { RefundRouterService } from './refund-router.service';

@Module({
  imports: [PrismaModule, WalletModule],
  providers: [WalletRefundProvider, SepayRefundProvider, ManualRefundProvider, RefundRouterService],
  exports: [RefundRouterService, WalletRefundProvider, SepayRefundProvider, ManualRefundProvider],
})
export class RefundModule {}
