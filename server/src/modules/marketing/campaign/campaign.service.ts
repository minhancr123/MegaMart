import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prismaClient/prisma.service";
import { CrmService } from "src/modules/crm/crm.service";
import { CreateCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmService: CrmService,
  ) {}

  async list() {
    return (this.prisma as any).marketingCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { history: true } } },
    });
  }

  async get(id: string) {
    const campaign = await (this.prisma as any).marketingCampaign.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { executedAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!campaign) throw new NotFoundException("Không tìm thấy chiến dịch");
    return campaign;
  }

  async create(dto: CreateCampaignDto) {
    this.validateReward(dto);
    return (this.prisma as any).marketingCampaign.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        type: dto.type,
        trigger: dto.trigger,
        status:
          dto.status || (dto.trigger === "HEALTH_DROP" ? "ACTIVE" : "DRAFT"),
        targetSegment: dto.targetSegment || null,
        minHealthScore: dto.minHealthScore ?? null,
        rewardValue: dto.rewardValue ?? null,
        rewardType: dto.rewardType || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.get(id);
    this.validateReward(dto);
    return (this.prisma as any).marketingCampaign.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim() || undefined,
        type: dto.type,
        trigger: dto.trigger,
        status: dto.status,
        targetSegment: dto.targetSegment,
        minHealthScore: dto.minHealthScore,
        rewardValue: dto.rewardValue,
        rewardType: dto.rewardType,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async setStatus(id: string, status: string) {
    await this.get(id);
    if (!["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"].includes(status))
      throw new BadRequestException("Trạng thái chiến dịch không hợp lệ");
    return (this.prisma as any).marketingCampaign.update({
      where: { id },
      data: { status },
    });
  }

  @Cron("0 2 * * *")
  async runHealthDropCampaigns() {
    const now = new Date();
    const campaigns = await (this.prisma as any).marketingCampaign.findMany({
      where: {
        trigger: "HEALTH_DROP",
        status: "ACTIVE",
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
    });
    const results: any[] = [];
    for (const campaign of campaigns) {
      results.push(await this.executeCampaign(campaign, { automated: true }));
      await (this.prisma as any).marketingCampaign.update({
        where: { id: campaign.id },
        data: { lastRunAt: now },
      });
    }
    return { campaignCount: campaigns.length, results };
  }

  async execute(id: string) {
    const campaign = await this.get(id);
    return this.executeCampaign(campaign, { automated: false });
  }

  private async executeCampaign(
    campaign: any,
    options: { automated: boolean },
  ) {
    if (!["DRAFT", "ACTIVE", "PAUSED"].includes(campaign.status))
      throw new BadRequestException("Chiến dịch không thể thực thi");

    const allCustomers = await this.collectTargetCustomers(campaign);
    const already = await (this.prisma as any).campaignHistory.findMany({
      where: { campaignId: campaign.id },
      select: { userId: true },
    });
    const alreadySet = new Set(already.map((x: any) => x.userId));
    const userIds = allCustomers
      .map((c: any) => c.id)
      .filter((id: string) => !alreadySet.has(id));
    if (!userIds.length)
      return {
        campaignId: campaign.id,
        successCount: 0,
        failedCount: 0,
        targetedCount: 0,
        message: "Không có khách mới phù hợp",
      };

    let result: any = { successCount: 0, failedCount: 0 };
    if (campaign.type === "VOUCHER") {
      result = await this.crmService.issuePersonalVouchers({
        userIds,
        title: campaign.name,
        type: campaign.rewardType || "FIXED",
        value: Number(campaign.rewardValue || 0),
      } as any);
    } else if (campaign.type === "LOYALTY_POINTS") {
      result = await this.crmService.bulkPoints({
        userIds,
        amount: Number(campaign.rewardValue || 0),
        reason: `Chiến dịch: ${campaign.name}`,
      } as any);
    }

    const histories = userIds
      .slice(0, result.successCount || userIds.length)
      .map((userId: string) => ({
        campaignId: campaign.id,
        userId,
        actionTaken:
          campaign.type === "VOUCHER"
            ? "Cấp mã giảm riêng"
            : campaign.type === "LOYALTY_POINTS"
              ? "Tặng điểm thưởng"
              : "Gửi thông báo",
      }));
    if (histories.length)
      await (this.prisma as any).campaignHistory.createMany({
        data: histories,
        skipDuplicates: true,
      });
    if (!options.automated && campaign.trigger === "MANUAL")
      await this.setStatus(campaign.id, "COMPLETED");
    return {
      ...result,
      campaignId: campaign.id,
      targetedCount: userIds.length,
    };
  }

  private async collectTargetCustomers(campaign: any) {
    const first = await this.crmService.listCustomers({
      page: 1,
      limit: 100,
      segment: campaign.targetSegment || undefined,
      maxHealthScore: campaign.minHealthScore || undefined,
    } as any);
    let items = first.items || [];
    const totalPages = first.totalPages || 1;
    for (let page = 2; page <= totalPages; page++) {
      const next = await this.crmService.listCustomers({
        page,
        limit: 100,
        segment: campaign.targetSegment || undefined,
        maxHealthScore: campaign.minHealthScore || undefined,
      } as any);
      items = items.concat(next.items || []);
    }
    return items;
  }

  private validateReward(dto: Partial<CreateCampaignDto>) {
    if (dto.type === "VOUCHER" && (!dto.rewardValue || dto.rewardValue <= 0))
      throw new BadRequestException("Chiến dịch mã giảm cần giá trị ưu đãi");
    if (dto.rewardType === "PERCENT" && Number(dto.rewardValue || 0) > 100)
      throw new BadRequestException(
        "Mã giảm phần trăm không được vượt quá 100%",
      );
    if (
      dto.type === "LOYALTY_POINTS" &&
      (!dto.rewardValue || dto.rewardValue <= 0)
    )
      throw new BadRequestException(
        "Chiến dịch điểm thưởng cần số điểm lớn hơn 0",
      );
  }
}
