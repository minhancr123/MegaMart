import { Module } from "@nestjs/common";
import { BannerModule } from "./banner/banner.module";
import { FlashSaleModule } from "./flash-sale/flash-sale.module";
import { SaleModule } from "./sale/sale.module";
import { CampaignModule } from "./campaign/campaign.module";

@Module({
  imports: [BannerModule, FlashSaleModule, SaleModule, CampaignModule],
  exports: [BannerModule, FlashSaleModule, SaleModule, CampaignModule],
})
export class MarketingModule {}
