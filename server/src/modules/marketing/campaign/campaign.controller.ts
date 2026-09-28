import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";
import { CampaignService } from "./campaign.service";
import { CreateCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Controller("admin/marketing/campaigns")
@UseGuards(JwtAuthGuard, AdminGuard)
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get()
  list() {
    return this.campaignService.list();
  }

  @Post("cron/health-drop")
  runHealthDropCron() {
    return this.campaignService.runHealthDropCampaigns();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.campaignService.get(id);
  }

  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(id, dto);
  }

  @Patch(":id/status")
  setStatus(@Param("id") id: string, @Body("status") status: string) {
    return this.campaignService.setStatus(id, status);
  }

  @Post(":id/execute")
  execute(@Param("id") id: string) {
    return this.campaignService.execute(id);
  }
}
