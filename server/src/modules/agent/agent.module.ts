import { Module } from "@nestjs/common";
import { ImageSyncModule } from "../images/image-sync.module";
import { AgentWorkflowService } from "./agent-workflow.service";
import { VoucherGovernorService } from "./voucher-governor.workflow";
import { FlashSaleCampaignService } from "./flash-sale.workflow";
import { LoyaltyNurtureService } from "./loyalty.workflow";
import { RecommendationService } from "./recommendation.workflow";

@Module({
  imports: [ImageSyncModule], // lấy CloudinaryService cho designer node
  providers: [
    AgentWorkflowService,
    VoucherGovernorService,
    FlashSaleCampaignService,
    LoyaltyNurtureService,
    RecommendationService,
  ],
  exports: [
    AgentWorkflowService,
    VoucherGovernorService,
    FlashSaleCampaignService,
    LoyaltyNurtureService,
    RecommendationService,
  ],
})
export class AgentModule {}
