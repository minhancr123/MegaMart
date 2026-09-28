import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prismaClient/prisma.service";
import { CreateBannerDto, UpdateBannerDto } from "./dto/banner.dto";
import {
  AuditLogService,
  AuditAction,
  AuditEntity,
} from "src/modules/audit-log/audit-log.service";

@Injectable()
export class BannerService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { active: true };

    return this.prisma.banner.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });
  }

  async findActive() {
    const now = new Date();

    const banners = await this.prisma.banner.findMany({
      where: {
        active: true,
        OR: [
          // No date restrictions
          { startDate: null, endDate: null },
          // Started and no end date
          { startDate: { lte: now }, endDate: null },
          // No start date but not ended
          { startDate: null, endDate: { gte: now } },
          // Within date range
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { displayOrder: "asc" },
    });

    // Nạp thông tin sản phẩm nổi cho banner động (giới hạn 4 SP/banner)
    const ids = [
      ...new Set(
        banners
          .flatMap((b) =>
            Array.isArray(b.featuredProductIds)
              ? b.featuredProductIds.slice(0, 4)
              : [],
          )
          .filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
      ),
    ];
    let productMap: Record<string, any> = {};
    if (ids.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: {
          id: true,
          name: true,
          images: { take: 1, orderBy: { displayOrder: "asc" } },
          variants: {
            take: 1,
            orderBy: { price: "asc" },
            select: { price: true, salePrice: true },
          },
        },
      });
      productMap = Object.fromEntries(
        products.map((p) => [
          p.id,
          {
            id: p.id,
            name: p.name,
            imageUrl: p.images[0]?.url || null,
            price:
              p.variants[0]?.price != null ? Number(p.variants[0].price) : null,
            salePrice:
              p.variants[0]?.salePrice != null
                ? Number(p.variants[0].salePrice)
                : null,
          },
        ]),
      );
    }

    return banners.map((b) => ({
      ...b,
      featuredProducts: (Array.isArray(b.featuredProductIds)
        ? b.featuredProductIds.slice(0, 4)
        : []
      )
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .map((id) => productMap[id])
        .filter(Boolean),
    }));
  }

  /** Thống kê KPI cho trang Quản lý Banner. Quy ước trạng thái (khớp client):
   * expired = hết hạn (bất kể active), scheduled = active + chưa tới ngày,
   * paused = tắt tay nhưng chưa hết hạn, active = còn lại. */
  async getStats() {
    const now = new Date();
    const [active, scheduled, expired, paused, clicks] = await Promise.all([
      this.prisma.banner.count({
        where: {
          active: true,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: now }, endDate: null },
            { startDate: null, endDate: { gte: now } },
            { startDate: { lte: now }, endDate: { gte: now } },
          ],
        },
      }),
      this.prisma.banner.count({
        where: { active: true, startDate: { gt: now } },
      }),
      this.prisma.banner.count({
        where: { endDate: { lt: now } },
      }),
      this.prisma.banner.count({
        where: {
          active: false,
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      }),
      this.prisma.banner.aggregate({
        _sum: { clicks: true, impressions: true },
      }),
    ]);
    return {
      active,
      scheduled,
      expired,
      paused,
      totalClicks: clicks._sum.clicks || 0,
      totalImpressions: clicks._sum.impressions || 0,
    };
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException("Banner not found");
    }

    return banner;
  }

  async create(createBannerDto: CreateBannerDto) {
    // Get max displayOrder
    const maxOrder = await this.prisma.banner.aggregate({
      _max: { displayOrder: true },
    });

    const banner = await this.prisma.banner.create({
      data: {
        ...createBannerDto,
        displayOrder:
          createBannerDto.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
        startDate: createBannerDto.startDate
          ? new Date(createBannerDto.startDate)
          : null,
        endDate: createBannerDto.endDate
          ? new Date(createBannerDto.endDate)
          : null,
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.BANNER_CREATE,
      AuditEntity.BANNER,
      undefined, // Will be set from request context if available
      banner.id,
      { title: banner.title, imageUrl: banner.imageUrl },
    );

    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto) {
    const oldBanner = await this.findOne(id); // Check if exists

    const updatedBanner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...updateBannerDto,
        startDate:
          updateBannerDto.startDate !== undefined
            ? updateBannerDto.startDate
              ? new Date(updateBannerDto.startDate)
              : null
            : undefined,
        endDate:
          updateBannerDto.endDate !== undefined
            ? updateBannerDto.endDate
              ? new Date(updateBannerDto.endDate)
              : null
            : undefined,
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.BANNER_UPDATE,
      AuditEntity.BANNER,
      undefined,
      id,
      {
        before: { title: oldBanner.title, active: oldBanner.active },
        after: { title: updatedBanner.title, active: updatedBanner.active },
      },
    );

    return updatedBanner;
  }

  async updateOrder(bannerIds: string[]) {
    // Update display order based on array order
    const updates = bannerIds.map((id, index) =>
      this.prisma.banner.update({
        where: { id },
        data: { displayOrder: index },
      }),
    );

    return this.prisma.$transaction(updates);
  }

  async toggleActive(id: string) {
    const banner = await this.findOne(id);

    return this.prisma.banner.update({
      where: { id },
      data: { active: !banner.active },
    });
  }

  async delete(id: string) {
    const banner = await this.findOne(id); // Check if exists

    await this.prisma.banner.delete({
      where: { id },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.BANNER_DELETE,
      AuditEntity.BANNER,
      undefined,
      id,
      { title: banner.title },
    );

    return { message: "Banner deleted successfully" };
  }
}
