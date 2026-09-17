import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { InngestRegistryService } from './inngest-registry.service';
import { InngestController } from './inngest.controller';
import { ProductEnrichmentJob } from './functions/product-enrichment.job';
import { SalesIngestJob } from './functions/sales-ingest.job';
import { VoucherGovernorJob } from './functions/voucher-governor.job';
import { FlashSaleCampaignJob } from './functions/flash-sale-campaign.job';
import { LoyaltyNurtureJob } from './functions/loyalty-nurture.job';
import { RecommendationRefreshJob } from './functions/recommendation-refresh.job';

/**
 * Durable runtime cho agent jobs.
 * PrismaModule và AuditLogModule là @Global() nên inject trực tiếp, không cần import.
 * Thêm job mới: tạo class job tương tự ProductEnrichmentJob, khai báo trong
 * providers bên dưới — job tự đăng ký vào registry trong constructor.
 * Cron các job cố ý lệch phút nhau (00, :15, :20, :45, T2 08:30) để không dồn
 * rate-limit Gemini free tier (~15 RPM).
 */
@Module({
  imports: [AgentModule],
  controllers: [InngestController],
  providers: [
    InngestRegistryService,
    SalesIngestJob,
    ProductEnrichmentJob,
    VoucherGovernorJob,
    FlashSaleCampaignJob,
    LoyaltyNurtureJob,
    RecommendationRefreshJob,
  ],
  exports: [InngestRegistryService],
})
export class InngestModule {}
