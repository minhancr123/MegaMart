import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/prismaClient/prisma.service";
import {
  ApplySaleDto,
  UpdateVariantSaleDto,
  RemoveSaleDto,
} from "./dto/sale.dto";
import {
  AddSaleCampaignItemsDto,
  CreateSaleCampaignDto,
  GetSuggestedVariantsDto,
} from "./dto/sale-campaign.dto";
import {
  AuditLogService,
  AuditAction,
  AuditEntity,
} from "src/modules/audit-log/audit-log.service";

@Injectable()
export class SaleService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Apply sale to multiple variants
   */
  async applySale(applySaleDto: ApplySaleDto) {
    const { variantIds, discountPercent, saleStartDate, saleEndDate } =
      applySaleDto;

    // Validate dates
    if (saleStartDate && saleEndDate) {
      const start = new Date(saleStartDate);
      const end = new Date(saleEndDate);
      if (start >= end) {
        throw new BadRequestException(
          "Sale start date must be before end date",
        );
      }
    }

    // Get variants with products
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length === 0) {
      throw new NotFoundException("No variants found");
    }

    // Calculate sale prices and update variants
    const updates = variants.map(async (variant) => {
      const originalPrice = Number(variant.price);
      const salePrice = Math.round(originalPrice * (1 - discountPercent / 100));

      return this.prisma.variant.update({
        where: { id: variant.id },
        data: {
          discountPercent,
          salePrice: BigInt(salePrice),
          saleStartDate: saleStartDate ? new Date(saleStartDate) : null,
          saleEndDate: saleEndDate ? new Date(saleEndDate) : null,
        },
      });
    });

    const updatedVariants = await Promise.all(updates);

    // Log audit
    await this.auditLogService.log(
      AuditAction.PRODUCT_UPDATE,
      AuditEntity.PRODUCT,
      undefined,
      variantIds[0],
      {
        action: "APPLY_SALE",
        variantCount: variantIds.length,
        discountPercent,
      },
    );

    return {
      message: `Applied ${discountPercent}% sale to ${updatedVariants.length} variant(s)`,
      updatedCount: updatedVariants.length,
      variants: updatedVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        originalPrice: v.price.toString(),
        salePrice: v.salePrice?.toString(),
        discountPercent: v.discountPercent,
      })),
    };
  }

  /**
   * Update sale for a single variant
   */
  async updateVariantSale(variantId: string, updateDto: UpdateVariantSaleDto) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    const data: any = {};

    if (updateDto.discountPercent !== undefined) {
      const originalPrice = Number(variant.price);
      const salePrice = Math.round(
        originalPrice * (1 - updateDto.discountPercent / 100),
      );
      data.discountPercent = updateDto.discountPercent;
      data.salePrice = BigInt(salePrice);
    }

    if (updateDto.saleStartDate !== undefined) {
      data.saleStartDate = updateDto.saleStartDate
        ? new Date(updateDto.saleStartDate)
        : null;
    }

    if (updateDto.saleEndDate !== undefined) {
      data.saleEndDate = updateDto.saleEndDate
        ? new Date(updateDto.saleEndDate)
        : null;
    }

    const updated = await this.prisma.variant.update({
      where: { id: variantId },
      data,
    });

    return {
      id: updated.id,
      sku: updated.sku,
      originalPrice: updated.price.toString(),
      salePrice: updated.salePrice?.toString(),
      discountPercent: updated.discountPercent,
      saleStartDate: updated.saleStartDate,
      saleEndDate: updated.saleEndDate,
    };
  }

  /**
   * Remove sale from variants
   */
  async removeSale(removeSaleDto: RemoveSaleDto) {
    const { variantIds } = removeSaleDto;

    const updated = await this.prisma.variant.updateMany({
      where: { id: { in: variantIds } },
      data: {
        salePrice: null,
        discountPercent: null,
        saleStartDate: null,
        saleEndDate: null,
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.PRODUCT_UPDATE,
      AuditEntity.PRODUCT,
      undefined,
      variantIds[0],
      {
        action: "REMOVE_SALE",
        variantCount: variantIds.length,
      },
    );

    return {
      message: `Removed sale from ${updated.count} variant(s)`,
      removedCount: updated.count,
    };
  }

  /**
   * Get all products/variants currently on sale
   */
  async getActiveSales() {
    const now = new Date();

    // Chỉ select đúng field cần map ở dưới: product nguyên dòng (description
    // dài + descriptionImages + attributes JSON) từng phình response lên >30MB
    // và vượt giới hạn 5MB của Prisma Accelerate (P6009).
    const variants = await this.prisma.variant.findMany({
      where: {
        discountPercent: { not: null },
        OR: [
          // No date restrictions
          { saleStartDate: null, saleEndDate: null },
          // Within date range
          {
            saleStartDate: { lte: now },
            saleEndDate: { gte: now },
          },
          // Started but no end date
          {
            saleStartDate: { lte: now },
            saleEndDate: null,
          },
          // No start date but not ended
          {
            saleStartDate: null,
            saleEndDate: { gte: now },
          },
        ],
      },
      select: {
        id: true,
        sku: true,
        price: true,
        salePrice: true,
        discountPercent: true,
        saleStartDate: true,
        saleEndDate: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
      orderBy: { discountPercent: "desc" },
    });

    return variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      productId: v.product.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      image: v.product.images[0]?.url,
      originalPrice: v.price.toString(),
      salePrice: v.salePrice?.toString(),
      discountPercent: v.discountPercent,
      savedAmount: v.salePrice
        ? (Number(v.price) - Number(v.salePrice)).toString()
        : "0",
      saleStartDate: v.saleStartDate,
      saleEndDate: v.saleEndDate,
    }));
  }

  /**
   * Get sale info for a specific variant
   */
  async getVariantSale(variantId: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    const now = new Date();
    const isActive =
      variant.discountPercent !== null &&
      (!variant.saleStartDate || variant.saleStartDate <= now) &&
      (!variant.saleEndDate || variant.saleEndDate >= now);

    return {
      id: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      originalPrice: variant.price.toString(),
      salePrice: variant.salePrice?.toString(),
      discountPercent: variant.discountPercent,
      savedAmount: variant.salePrice
        ? (Number(variant.price) - Number(variant.salePrice)).toString()
        : "0",
      saleStartDate: variant.saleStartDate,
      saleEndDate: variant.saleEndDate,
      isActive,
    };
  }

  /**
   * Calculate final price (prioritizes Flash Sale > Regular Sale > Original)
   */
  async calculateFinalPrice(variantId: string): Promise<{
    originalPrice: string;
    finalPrice: string;
    discountPercent: number;
    savedAmount: string;
    discountType: "FLASH_SALE" | "REGULAR_SALE" | "NONE";
  }> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    const now = new Date();
    const originalPrice = Number(variant.price);

    // Check Flash Sale first (highest priority)
    const flashSaleItem = await this.prisma.flashSaleItem.findFirst({
      where: {
        variantId,
        flashSale: {
          active: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
        soldCount: { lt: this.prisma.flashSaleItem.fields.quantity },
      },
      include: { flashSale: true },
    });

    if (flashSaleItem) {
      const flashPrice = Number(flashSaleItem.salePrice);
      const savedAmount = originalPrice - flashPrice;
      const discountPercent = Math.round((savedAmount / originalPrice) * 100);

      return {
        originalPrice: originalPrice.toString(),
        finalPrice: flashPrice.toString(),
        discountPercent,
        savedAmount: savedAmount.toString(),
        discountType: "FLASH_SALE",
      };
    }

    // Check Regular Sale
    const hasActiveSale =
      variant.discountPercent !== null &&
      variant.salePrice !== null &&
      (!variant.saleStartDate || variant.saleStartDate <= now) &&
      (!variant.saleEndDate || variant.saleEndDate >= now);

    if (hasActiveSale) {
      const salePrice = Number(variant.salePrice);
      const savedAmount = originalPrice - salePrice;

      return {
        originalPrice: originalPrice.toString(),
        finalPrice: salePrice.toString(),
        discountPercent: variant.discountPercent!,
        savedAmount: savedAmount.toString(),
        discountType: "REGULAR_SALE",
      };
    }

    // No discount
    return {
      originalPrice: originalPrice.toString(),
      finalPrice: originalPrice.toString(),
      discountPercent: 0,
      savedAmount: "0",
      discountType: "NONE",
    };
  }

  async getTimingSuggestions() {
    const now = new Date();
    const from = new Date(now.getTime() - 60 * 86_400_000);
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: now },
        status: { notIn: ["CANCELED", "FAILED", "REFUNDED"] as any },
      },
      select: { createdAt: true, total: true, status: true },
    });

    const dayNames = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    const byDay = Array.from({ length: 7 }, (_, day) => ({
      day,
      orders: 0,
      revenue: 0,
    }));
    const businessOffsetMs = 7 * 60 * 60_000;
    const toBusinessClock = (date: Date) =>
      new Date(date.getTime() + businessOffsetMs);
    const businessNow = toBusinessClock(now);
    const toBusinessInstant = (
      year: number,
      monthIndex: number,
      day: number,
      hour = 0,
      minute = 0,
    ) => new Date(Date.UTC(year, monthIndex, day, hour - 7, minute, 0, 0));
    const clampFutureStart = (date: Date) =>
      date <= now ? new Date(now.getTime() + 5 * 60_000) : date;

    orders.forEach((order: any) => {
      const day = toBusinessClock(new Date(order.createdAt)).getUTCDay();
      byDay[day].orders += 1;
      byDay[day].revenue += Number(order.total || 0);
    });
    const ranked = [...byDay].sort((a, b) => a.revenue - b.revenue);
    const slowest = ranked[0];
    const peak = ranked[ranked.length - 1];
    const hasUsefulSalesData =
      orders.length >= 10 && peak.revenue > slowest.revenue && peak.revenue > 0;

    const nextDateForDay = (targetDay: number, hour = 0) => {
      const currentDay = businessNow.getUTCDay();
      let add = (targetDay - currentDay + 7) % 7;
      const d = toBusinessInstant(
        businessNow.getUTCFullYear(),
        businessNow.getUTCMonth(),
        businessNow.getUTCDate() + add,
        hour,
      );
      const endOfCandidate = toBusinessInstant(
        businessNow.getUTCFullYear(),
        businessNow.getUTCMonth(),
        businessNow.getUTCDate() + add,
        23,
        59,
      );
      if (endOfCandidate <= now) add += 7;
      return clampFutureStart(
        toBusinessInstant(
          businessNow.getUTCFullYear(),
          businessNow.getUTCMonth(),
          businessNow.getUTCDate() + add,
          hour,
        ),
      );
    };
    const range = (start: Date, days: number, endHour = 23) => {
      const startBusiness = toBusinessClock(start);
      const end = toBusinessInstant(
        startBusiness.getUTCFullYear(),
        startBusiness.getUTCMonth(),
        startBusiness.getUTCDate() + days - 1,
        endHour,
        59,
      );
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    };
    const nextMonthlyDate = (day: number, hour = 0) => {
      let d = toBusinessInstant(
        businessNow.getUTCFullYear(),
        businessNow.getUTCMonth(),
        day,
        hour,
      );
      const end = toBusinessInstant(
        businessNow.getUTCFullYear(),
        businessNow.getUTCMonth(),
        day,
        23,
        59,
      );
      if (end <= now)
        d = toBusinessInstant(
          businessNow.getUTCFullYear(),
          businessNow.getUTCMonth() + 1,
          day,
          hour,
        );
      return clampFutureStart(d);
    };
    const nextDoubleDay = () => {
      for (let i = 0; i < 15; i++) {
        const month = businessNow.getUTCMonth() + i;
        const m = (month % 12) + 1;
        const y = businessNow.getUTCFullYear() + Math.floor(month / 12);
        const d = toBusinessInstant(y, m - 1, m, 0);
        const end = toBusinessInstant(y, m - 1, m, 23, 59);
        if (end > now) return clampFutureStart(d);
      }
      return nextMonthlyDate(11);
    };
    const fixedHoliday = (
      month: number,
      day: number,
      title: string,
      discount: number,
    ) => {
      let d = toBusinessInstant(
        businessNow.getUTCFullYear(),
        month - 1,
        day,
        0,
      );
      const end = toBusinessInstant(
        businessNow.getUTCFullYear(),
        month - 1,
        day,
        23,
        59,
      );
      if (end <= now)
        d = toBusinessInstant(
          businessNow.getUTCFullYear() + 1,
          month - 1,
          day,
          0,
        );
      return { d: clampFutureStart(d), title, discount };
    };
    const holidays = [
      fixedHoliday(10, 20, "Ngày Phụ nữ Việt Nam 20/10", 20),
      fixedHoliday(11, 20, "Ngày Nhà giáo Việt Nam 20/11", 15),
      fixedHoliday(12, 24, "Giáng sinh", 25),
      fixedHoliday(1, 1, "Tết Dương lịch", 20),
      fixedHoliday(4, 30, "Đại lễ 30/4", 20),
      fixedHoliday(9, 2, "Quốc khánh 2/9", 20),
    ].sort((a, b) => a.d.getTime() - b.d.getTime());
    const holiday = holidays[0];
    const doubleDay = nextDoubleDay();
    const weekendStart = nextDateForDay(5, 0);
    const payday = nextMonthlyDate(25, 0);
    const slowStart = nextDateForDay(hasUsefulSalesData ? slowest.day : 1, 0);

    return {
      orderSampleSize: orders.length,
      dayOfWeekStats: byDay.map((d) => ({ ...d, label: dayNames[d.day] })),
      suggestions: [
        {
          id: "data-slow-day",
          type: "DATA_DRIVEN",
          badge: hasUsefulSalesData ? "Dữ liệu thực tế" : "Gợi ý mặc định",
          title: hasUsefulSalesData
            ? `Kích cầu ngày trũng: ${dayNames[slowest.day]}`
            : "Kích cầu đầu tuần",
          reason: hasUsefulSalesData
            ? `${dayNames[slowest.day]} có doanh thu thấp nhất 60 ngày gần đây, phù hợp để kéo đơn bằng ưu đãi nhẹ.`
            : "Chưa đủ dữ liệu đơn hàng đủ tin cậy, dùng quy tắc phổ biến: đầu tuần thường cần kích cầu.",
          template: {
            name: `Sale kích cầu ${dayNames[hasUsefulSalesData ? slowest.day : 1]}`,
            description: "Tự động gợi ý theo nhịp mua hàng 60 ngày gần đây",
            ...range(slowStart, 1),
            defaultDiscount: 10,
          },
        },
        {
          id: "data-peak-day",
          type: "DATA_DRIVEN",
          badge: hasUsefulSalesData ? "Tối đa doanh thu" : "Gợi ý mặc định",
          title: hasUsefulSalesData
            ? `Đẩy mạnh ngày đỉnh: ${dayNames[peak.day]}`
            : "Đẩy mạnh cuối tuần",
          reason: hasUsefulSalesData
            ? `${dayNames[peak.day]} đang là ngày có doanh thu cao nhất, phù hợp sale flash để tối đa hóa doanh thu.`
            : "Cuối tuần thường có nhu cầu mua sắm cao hơn.",
          template: {
            name: hasUsefulSalesData
              ? `Flash sale ${dayNames[peak.day]}`
              : "Flash sale cuối tuần",
            description: "Tận dụng ngày có nhu cầu cao để tăng doanh thu",
            ...range(
              nextDateForDay(hasUsefulSalesData ? peak.day : 6, 8),
              1,
              23,
            ),
            defaultDiscount: 12,
          },
        },
        {
          id: "calendar-weekend",
          type: "CALENDAR",
          badge: "Cuối tuần",
          title: "Sale cuối tuần",
          reason:
            "Khung Thứ 6 - Chủ nhật phù hợp cho chiến dịch ngắn, dễ truyền thông.",
          template: {
            name: "Sale cuối tuần",
            description: "Ưu đãi cuối tuần cho nhóm sản phẩm được chọn",
            ...range(weekendStart, 3),
            defaultDiscount: 15,
          },
        },
        {
          id: "calendar-double-day",
          type: "CALENDAR",
          badge: "Ngày đôi",
          title: `Sale ngày đôi ${doubleDay.getDate()}/${doubleDay.getMonth() + 1}`,
          reason:
            "Ngày đôi là mốc quen thuộc với khách hàng thương mại điện tử.",
          template: {
            name: `Mega Sale ${doubleDay.getDate()}/${doubleDay.getMonth() + 1}`,
            description: "Chiến dịch ngày đôi cho sản phẩm chủ lực",
            ...range(doubleDay, 1),
            defaultDiscount: 20,
          },
        },
        {
          id: "calendar-payday",
          type: "CALENDAR",
          badge: "Ngày lương",
          title: "Sale ngày lương về",
          reason:
            "Giai đoạn 25-28 hàng tháng thường có khả năng chi tiêu cao hơn.",
          template: {
            name: "Sale ngày lương",
            description:
              "Ưu đãi cuối tháng khi khách hàng có ngân sách mua sắm",
            ...range(payday, 4),
            defaultDiscount: 12,
          },
        },
        {
          id: "calendar-holiday",
          type: "CALENDAR",
          badge: "Ngày lễ",
          title: holiday.title,
          reason:
            "Mốc ngày lễ sắp tới, phù hợp tạo campaign theo chủ đề và truyền thông trước.",
          template: {
            name: `Sale ${holiday.title}`,
            description: `Ưu đãi dịp ${holiday.title}`,
            ...range(holiday.d, 2),
            defaultDiscount: holiday.discount,
          },
        },
      ],
    };
  }

  async getSuggestedVariants(dto: GetSuggestedVariantsDto = {}) {
    const limit = Math.min(
      Math.max(dto.limit !== undefined ? Number(dto.limit) : 12, 1),
      50,
    );
    const minStock = Math.max(
      dto.minStock !== undefined ? Number(dto.minStock) : 10,
      0,
    );
    const days = Math.min(
      Math.max(dto.days !== undefined ? Number(dto.days) : 30, 7),
      180,
    );
    const maxSales = Math.max(
      dto.maxSales !== undefined ? Number(dto.maxSales) : 2,
      0,
    );
    const since = new Date(Date.now() - days * 86_400_000);
    const now = new Date();

    const soldRows = await (this.prisma as any).orderItem.groupBy({
      by: ["variantId"],
      where: {
        order: {
          createdAt: { gte: since },
          status: { notIn: ["CANCELED", "FAILED", "REFUNDED"] },
        },
      },
      _sum: { quantity: true },
    });
    const soldByVariant = new Map<string, number>(
      soldRows.map((row: any) => [
        row.variantId,
        Number(row._sum?.quantity || 0),
      ]),
    );

    const variants = await this.prisma.variant.findMany({
      where: {
        stock: { gte: minStock },
        product: { deletedAt: null },
        saleCampaignItems: {
          none: { campaign: { status: { in: ["ACTIVE", "DRAFT"] } } },
        },
        OR: [
          { saleCampaignId: null },
          { saleCampaign: { status: { notIn: ["ACTIVE", "DRAFT"] } } },
        ],
        AND: [
          {
            OR: [
              { discountPercent: null },
              { discountPercent: { lte: 0 } },
              { saleEndDate: { lt: now } },
            ],
          },
          {
            flashSaleItems: {
              none: {
                flashSale: {
                  active: true,
                  startTime: { lte: now },
                  endTime: { gte: now },
                },
              },
            },
          },
        ],
      } as any,
      take: 500,
      orderBy: { stock: "desc" },
      select: {
        id: true,
        sku: true,
        price: true,
        stock: true,
        reservedQuantity: true,
        product: {
          select: {
            id: true,
            name: true,
            images: { take: 1, select: { url: true } },
          },
        },
      } as any,
    });

    return variants
      .map((v: any) => {
        const soldCount = soldByVariant.get(v.id) || 0;
        const availableStock = Math.max(
          0,
          Number(v.stock || 0) - Number(v.reservedQuantity || 0),
        );
        return {
          id: v.id,
          sku: v.sku,
          productId: v.product?.id,
          productName: v.product?.name || "Sản phẩm",
          image: v.product?.images?.[0]?.url || null,
          price: Number(v.price),
          stock: v.stock,
          availableStock,
          soldCount,
          activeCampaign: null,
          reason:
            soldCount === 0
              ? `Tồn khả dụng ${availableStock}, chưa bán trong ${days} ngày`
              : `Tồn khả dụng ${availableStock}, chỉ bán ${soldCount} trong ${days} ngày`,
        };
      })
      .filter(
        (v: any) => v.availableStock >= minStock && v.soldCount <= maxSales,
      )
      .sort(
        (a: any, b: any) =>
          a.soldCount - b.soldCount || b.availableStock - a.availableStock,
      )
      .slice(0, limit);
  }

  async searchVariantsForCampaign(query = "", limit = 20) {
    const q = query.trim();
    const variants = await this.prisma.variant.findMany({
      where: {
        product: { deletedAt: null },
        ...(q
          ? {
              OR: [
                { sku: { contains: q, mode: "insensitive" } },
                { product: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      } as any,
      take: Math.min(Math.max(Number(limit) || 20, 1), 50),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sku: true,
        price: true,
        stock: true,
        saleCampaign: { select: { id: true, name: true, status: true } },
        saleCampaignItems: {
          where: { campaign: { status: { in: ["ACTIVE", "DRAFT"] } } },
          orderBy: { createdAt: "desc" },
          include: {
            campaign: { select: { id: true, name: true, status: true } },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: { take: 1, select: { url: true } },
          },
        },
      } as any,
    });
    return variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      productId: v.product?.id,
      productName: v.product?.name || "Sản phẩm",
      image: v.product?.images?.[0]?.url || null,
      price: Number(v.price),
      stock: v.stock,
      activeCampaign: ["ACTIVE", "DRAFT"].includes(v.saleCampaign?.status)
        ? v.saleCampaign
        : v.saleCampaignItems?.find((i: any) => i.campaign?.status === "ACTIVE")
            ?.campaign ||
          v.saleCampaignItems?.find((i: any) => i.campaign?.status === "DRAFT")
            ?.campaign ||
          null,
    }));
  }

  async getCampaigns() {
    const campaigns = await (this.prisma as any).saleCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    return campaigns.map((c: any) => ({
      ...c,
      itemCount: c._count?.items || 0,
    }));
  }

  async getCampaignById(id: string) {
    const campaign = await (this.prisma as any).saleCampaign.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                price: true,
                salePrice: true,
                discountPercent: true,
                stock: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: { take: 1, select: { url: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!campaign)
      throw new NotFoundException("Không tìm thấy chiến dịch sale");
    return campaign;
  }

  async createCampaign(dto: CreateSaleCampaignDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end)
      throw new BadRequestException("Ngày bắt đầu phải trước ngày kết thúc");
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: dto.variantIds } },
      select: { id: true, price: true },
    });
    if (!variants.length)
      throw new NotFoundException("Không tìm thấy sản phẩm/biến thể");
    return (this.prisma as any).saleCampaign.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        startDate: start,
        endDate: end,
        defaultDiscount: dto.defaultDiscount,
        items: {
          create: variants.map((variant: any) => ({
            variantId: variant.id,
            discountPercent: dto.defaultDiscount,
            salePrice: BigInt(
              Math.round(
                Number(variant.price) * (1 - dto.defaultDiscount / 100),
              ),
            ),
          })),
        },
      },
    });
  }

  async addCampaignItems(id: string, dto: AddSaleCampaignItemsDto) {
    const campaign = await this.getCampaignById(id);
    if (campaign.status !== "DRAFT")
      throw new BadRequestException(
        "Chỉ có thể thêm sản phẩm vào chiến dịch bản nháp",
      );
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: dto.variantIds } },
      select: { id: true, price: true },
    });
    if (!variants.length)
      throw new NotFoundException("Không tìm thấy sản phẩm/biến thể");
    await (this.prisma as any).saleCampaignItem.createMany({
      data: variants.map((variant: any) => ({
        campaignId: id,
        variantId: variant.id,
        discountPercent: dto.discountPercent,
        salePrice: BigInt(
          Math.round(Number(variant.price) * (1 - dto.discountPercent / 100)),
        ),
      })),
      skipDuplicates: true,
    });
    return this.getCampaignById(id);
  }

  async applyCampaign(id: string) {
    const campaign = await this.getCampaignById(id);
    if (!campaign.items?.length)
      throw new BadRequestException("Chiến dịch chưa có sản phẩm");
    if (!["DRAFT", "PAUSED"].includes(campaign.status))
      throw new BadRequestException(
        "Chỉ có thể kích hoạt chiến dịch bản nháp hoặc đang tạm dừng",
      );
    if (campaign.endDate <= new Date())
      throw new BadRequestException("Chiến dịch đã quá hạn kết thúc");
    await this.prisma.$transaction([
      ...campaign.items.map((item: any) =>
        this.prisma.variant.update({
          where: { id: item.variantId },
          data: {
            salePrice: item.salePrice,
            discountPercent: item.discountPercent,
            saleStartDate: campaign.startDate,
            saleEndDate: campaign.endDate,
            saleCampaignId: campaign.id,
          } as any,
        }),
      ),
      (this.prisma as any).saleCampaign.update({
        where: { id },
        data: { status: "ACTIVE" },
      }),
    ]);
    return { success: true, message: "Đã kích hoạt chiến dịch" };
  }

  async deactivateCampaign(id: string, status: "PAUSED" | "ENDED" = "PAUSED") {
    const campaign = await this.getCampaignById(id);
    if (campaign.status === "ENDED")
      throw new BadRequestException("Chiến dịch đã kết thúc");
    if (status === "PAUSED" && campaign.status !== "ACTIVE")
      throw new BadRequestException("Chỉ có thể tạm dừng chiến dịch đang chạy");
    if (status === "ENDED" && !["ACTIVE", "PAUSED"].includes(campaign.status))
      throw new BadRequestException(
        "Chỉ có thể kết thúc chiến dịch đang chạy hoặc tạm dừng",
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.variant.updateMany({
        where: { saleCampaignId: id } as any,
        data: {
          salePrice: null,
          discountPercent: null,
          saleStartDate: null,
          saleEndDate: null,
          saleCampaignId: null,
        } as any,
      });
      await (tx as any).saleCampaign.update({
        where: { id },
        data: { status },
      });
    });
    return {
      success: true,
      message:
        status === "ENDED"
          ? "Đã kết thúc chiến dịch"
          : "Đã tạm dừng chiến dịch",
    };
  }

  async deleteCampaign(id: string) {
    const campaign = await this.getCampaignById(id);
    if (campaign.status !== "DRAFT")
      throw new BadRequestException("Chỉ có thể xóa chiến dịch bản nháp");
    await (this.prisma as any).saleCampaign.delete({ where: { id } });
    return { success: true, message: "Đã xóa chiến dịch nháp" };
  }

  @Cron("*/15 * * * *")
  async closeExpiredCampaigns() {
    const expired = await (this.prisma as any).saleCampaign.findMany({
      where: {
        status: { in: ["ACTIVE", "PAUSED"] },
        endDate: { lt: new Date() },
      },
    });
    for (const campaign of expired)
      await this.deactivateCampaign(campaign.id, "ENDED");
    return { closedCount: expired.length };
  }
}
