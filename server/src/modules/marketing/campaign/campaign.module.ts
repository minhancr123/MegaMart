import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prismaClient/prisma.module";
import { CrmModule } from "src/modules/crm/crm.module";
import { CampaignController } from "./campaign.controller";
import { CampaignService } from "./campaign.service";

@Module({
  imports: [PrismaModule, CrmModule],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
