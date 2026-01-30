import { Module } from '@nestjs/common';
import { BannerModule } from './banner/banner.module';
import { FlashSaleModule } from './flash-sale/flash-sale.module';
import { SaleModule } from './sale/sale.module';

@Module({
  imports: [BannerModule, FlashSaleModule, SaleModule],
  exports: [BannerModule, FlashSaleModule, SaleModule],
})
export class MarketingModule {}
