import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { VoucherType } from "@prisma/client";
import { PrismaService } from "src/prismaClient/prisma.service";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { EmailService } from "../email/email.service";
import {
  BulkPointsDto,
  BulkTagDto,
  CreateCustomerNoteDto,
  CreateCustomerTagDto,
  CrmCustomerQueryDto,
  IssueVoucherDto,
} from "./dto/crm.dto";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  PAID: "Đã thanh toán",
  CANCELED: "Đã hủy",
  FAILED: "Thất bại",
  REFUNDED: "Đã hoàn tiền",
};

const orderStatusLabel = (status: string) =>
  ORDER_STATUS_LABELS[status] || status;

type Segment =
  | "CHAMPION"
  | "LOYAL"
  | "POTENTIAL"
  | "AT_RISK"
  | "DORMANT"
  | "NEW";

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyaltyService: LoyaltyService,
    private readonly emailService: EmailService,
  ) {}

  async listCustomers(query: CrmCustomerQueryDto = {}) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const where: any = { role: "USER" };
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (query.tagId) {
      where.customerTagAssignments = { some: { tagId: query.tagId } };
    }

    const needsCrmFilter =
      !!query.segment ||
      query.minHealthScore != null ||
      query.maxHealthScore != null;
    const [baseTotal, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: needsCrmFilter ? undefined : (page - 1) * limit,
        take: needsCrmFilter ? undefined : limit,
        orderBy: { createdAt: "desc" },
        include: {
          wallet: { select: { balance: true } },
          customerTagAssignments: { include: { tag: true } },
          _count: { select: { orders: true } },
        },
      }),
    ]);

    const enriched = await Promise.all(
      users.map(async (user) => {
        const crm = await this.calculateCustomerProfile(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          walletBalance: Number((user.wallet as any)?.balance || 0),
          loyaltyPoints: (user as any).loyaltyPoints || 0,
          tags: user.customerTagAssignments.map((a) => a.tag),
          ...crm,
        };
      }),
    );

    const filtered = enriched.filter((item) => {
      if (query.segment && item.segment !== query.segment) return false;
      if (
        query.minHealthScore != null &&
        item.healthScore < query.minHealthScore
      )
        return false;
      if (
        query.maxHealthScore != null &&
        item.healthScore > query.maxHealthScore
      )
        return false;
      return true;
    });
    const total = needsCrmFilter ? filtered.length : baseTotal;
    const items = needsCrmFilter
      ? filtered.slice((page - 1) * limit, page * limit)
      : filtered;

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async calculateCustomerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) throw new NotFoundException("Không tìm thấy khách hàng");

    const [paidStats, cancelledCount] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          userId,
          status: { in: ["DELIVERED", "COMPLETED", "PAID"] as any },
        },
        _sum: { total: true },
        _count: { id: true },
        _max: { createdAt: true },
      }),
      this.prisma.order.count({
        where: { userId, status: { in: ["CANCELED", "FAILED"] as any } },
      }),
    ]);

    const totalSpent = Number(paidStats._sum.total || 0);
    const orderCount = paidStats._count.id || 0;
    const lastOrderDate = paidStats._max.createdAt || null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor(
          (Date.now() - new Date(lastOrderDate).getTime()) / 86_400_000,
        )
      : Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000,
        );

    const recencyScore = lastOrderDate
      ? daysSinceLastOrder <= 14
        ? 35
        : daysSinceLastOrder <= 45
          ? 25
          : daysSinceLastOrder <= 90
            ? 15
            : 5
      : 8;
    const frequencyScore =
      orderCount >= 10
        ? 30
        : orderCount >= 5
          ? 24
          : orderCount >= 2
            ? 16
            : orderCount === 1
              ? 10
              : 2;
    const monetaryScore =
      totalSpent >= 50_000_000
        ? 25
        : totalSpent >= 20_000_000
          ? 20
          : totalSpent >= 5_000_000
            ? 14
            : totalSpent > 0
              ? 8
              : 2;
    const penalty = Math.min(20, cancelledCount * 5);
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        recencyScore + frequencyScore + monetaryScore + 10 - penalty,
      ),
    );
    const segment: Segment = this.segmentCustomer(
      orderCount,
      totalSpent,
      daysSinceLastOrder,
      healthScore,
    );

    return {
      healthScore,
      segment,
      totalSpent,
      orderCount,
      lastOrderDate,
      daysSinceLastOrder,
      cancelledCount,
    };
  }

  segmentCustomer(
    orderCount: number,
    totalSpent: number,
    daysSinceLastOrder: number,
    healthScore: number,
  ): Segment {
    if (orderCount === 0) return "NEW";
    if (daysSinceLastOrder > 120) return "DORMANT";
    if (daysSinceLastOrder > 60 || healthScore < 40) return "AT_RISK";
    if (healthScore >= 80 && totalSpent >= 20_000_000) return "CHAMPION";
    if (healthScore >= 65 && orderCount >= 3) return "LOYAL";
    return "POTENTIAL";
  }

  async getTimeline(userId: string) {
    await this.ensureUser(userId);
    const [orders, walletTx, loyaltyTx, notes] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          status: true,
          total: true,
          createdAt: true,
        },
      }),
      (this.prisma as any).walletTransaction.findMany({
        where: { wallet: { userId } },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      (this.prisma as any).loyaltyTransaction.findMany({
        where: { userId },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      (this.prisma as any).customerNote.findMany({
        where: { userId },
        take: 20,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    return [
      ...orders.map((o) => ({
        id: `order-${o.id}`,
        type: "ORDER",
        title: `Đơn hàng ${o.code}`,
        description: `Trạng thái ${orderStatusLabel(o.status)} • ${Number(o.total).toLocaleString("vi-VN")}₫`,
        timestamp: o.createdAt,
        linkUrl: `/admin/orders/${o.id}`,
      })),
      ...walletTx.map((t: any) => ({
        id: `wallet-${t.id}`,
        type: "WALLET",
        title: t.type || "Giao dịch ví",
        description: `${Number(t.amount).toLocaleString("vi-VN")}₫ • ${t.description || ""}`,
        timestamp: t.createdAt,
      })),
      ...loyaltyTx.map((t: any) => ({
        id: `loyalty-${t.id}`,
        type: "LOYALTY",
        title: t.type || "Điểm thưởng",
        description: `${t.amount > 0 ? "+" : ""}${t.amount} điểm • ${t.description || ""}`,
        timestamp: t.createdAt,
      })),
      ...notes.map((n: any) => ({
        id: `note-${n.id}`,
        type: "NOTE",
        title: n.isPinned ? "Ghi chú ghim" : "Ghi chú CSKH",
        description: n.content,
        timestamp: n.createdAt,
        meta: { author: n.author },
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 50);
  }

  async getTags() {
    return (this.prisma as any).customerTag.findMany({
      orderBy: { name: "asc" },
    });
  }

  async createTag(dto: CreateCustomerTagDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Tên tag không hợp lệ");
    return (this.prisma as any).customerTag.upsert({
      where: { name },
      update: { color: dto.color || undefined, description: dto.description },
      create: {
        name,
        color: dto.color || "#f97316",
        description: dto.description,
      },
    });
  }

  async assignTag(userId: string, tagId: string, adminId?: string) {
    await this.ensureUser(userId);
    const tag = await (this.prisma as any).customerTag.findUnique({
      where: { id: tagId },
    });
    if (!tag) throw new NotFoundException("Không tìm thấy tag CRM");
    return (this.prisma as any).customerTagAssignment.upsert({
      where: { userId_tagId: { userId, tagId } },
      update: {},
      create: { userId, tagId, assignedById: adminId },
      include: { tag: true },
    });
  }

  async removeTag(userId: string, tagId: string) {
    await (this.prisma as any).customerTagAssignment.deleteMany({
      where: { userId, tagId },
    });
    return { success: true };
  }

  async getNotes(userId: string) {
    await this.ensureUser(userId);
    return (this.prisma as any).customerNote.findMany({
      where: { userId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async createNote(
    userId: string,
    dto: CreateCustomerNoteDto,
    authorId?: string,
  ) {
    await this.ensureUser(userId);
    const content = dto.content.trim();
    if (!content)
      throw new BadRequestException("Nội dung ghi chú không hợp lệ");
    return (this.prisma as any).customerNote.create({
      data: { userId, authorId, content, isPinned: !!dto.isPinned },
    });
  }

  async setNotePinned(id: string, isPinned: boolean) {
    return (this.prisma as any).customerNote.update({
      where: { id },
      data: { isPinned },
    });
  }

  async deleteNote(id: string) {
    await (this.prisma as any).customerNote.delete({ where: { id } });
    return { success: true };
  }

  async bulkTag(dto: BulkTagDto, adminId?: string) {
    let successCount = 0;
    const failedUserIds: string[] = [];
    for (const userId of dto.userIds) {
      try {
        await this.assignTag(userId, dto.tagId, adminId);
        successCount++;
      } catch {
        failedUserIds.push(userId);
      }
    }
    return { successCount, failedCount: failedUserIds.length, failedUserIds };
  }

  async bulkPoints(dto: BulkPointsDto) {
    let successCount = 0;
    const failedUserIds: string[] = [];
    for (const userId of dto.userIds) {
      try {
        if (dto.amount < 0) {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { loyaltyPoints: true },
          });
          if (!user || (user as any).loyaltyPoints + dto.amount < 0)
            throw new BadRequestException("Điểm thưởng không đủ để trừ");
        }
        await this.loyaltyService.adminAdjustPoints(
          userId,
          dto.amount,
          dto.reason || "CRM bulk adjustment",
          dto.amount >= 0 ? "BONUS" : "ADJUSTMENT",
        );
        successCount++;
      } catch {
        failedUserIds.push(userId);
      }
    }
    return { successCount, failedCount: failedUserIds.length, failedUserIds };
  }

  async issuePersonalVouchers(dto: IssueVoucherDto) {
    if (dto.type === "PERCENT" && dto.value > 100) {
      throw new BadRequestException(
        "Voucher phần trăm không được vượt quá 100%",
      );
    }
    let successCount = 0;
    let mailedCount = 0;
    const failedUserIds: string[] = [];
    const vouchers: any[] = [];
    for (const userId of dto.userIds) {
      try {
        await this.ensureUser(userId);
        const salt = Math.random().toString(36).slice(2, 7).toUpperCase();
        const code = `CRM-${Date.now().toString(36).toUpperCase()}-${userId.slice(-5).toUpperCase()}-${salt}`;
        const voucher = await this.prisma.voucher.create({
          data: {
            code,
            title: dto.title,
            type: dto.type as VoucherType,
            value: dto.value,
            minOrderValue: dto.minOrderValue,
            usageLimit: 1,
            usagePerUser: 1,
            assignedUserId: userId,
            endDate: new Date(Date.now() + 30 * 86_400_000),
            active: true,
          } as any,
        });
        vouchers.push(voucher);
        successCount++;
        // Gửi mail voucher nền, lỗi mail không tính là fail voucher.
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, email: true },
          });
          if (user?.email) {
            const ok = await this.emailService.sendVoucher(
              user.email,
              user.name || undefined,
              {
                code: voucher.code,
                type: String(voucher.type),
                value: Number(voucher.value),
                minOrderValue:
                  voucher.minOrderValue != null
                    ? Number(voucher.minOrderValue)
                    : null,
                endDate: voucher.endDate,
              },
              dto.title,
            );
            if (ok) mailedCount++;
          }
        } catch {
          /* best-effort */
        }
      } catch {
        failedUserIds.push(userId);
      }
    }
    return {
      successCount,
      mailedCount,
      failedCount: failedUserIds.length,
      failedUserIds,
      vouchers,
    };
  }

  /**
   * Broadcast thư khuyến mãi cho nhóm khách (userIds / segment / tag).
   * Gửi bulk theo chunk để không vượt quota Gmail.
   */
  async broadcastPromotion(dto: {
    userIds?: string[];
    segment?: "ALL" | "RECENT_BUYERS";
    tagId?: string;
    title: string;
    content: string;
    ctaText?: string;
    ctaUrl?: string;
    bannerUrl?: string;
  }) {
    if (!dto.title?.trim() || !dto.content?.trim()) {
      throw new BadRequestException("Thiếu tiêu đề hoặc nội dung thư");
    }
    const recipients = await this.emailService.resolveAudience({
      userIds: dto.userIds,
      segment: dto.segment,
      tagId: dto.tagId,
    });
    const tpl = (r: { email: string; name?: string }) =>
      this.emailService.buildPromotion(r, {
        title: dto.title.trim(),
        content: dto.content,
        ctaText: dto.ctaText,
        ctaUrl: dto.ctaUrl,
        bannerUrl: dto.bannerUrl,
      });
    return this.emailService.sendBulk(recipients, tpl);
  }

  async dashboard() {
    const [totalCustomers, orderAgg, atRiskCandidates] = await Promise.all([
      this.prisma.user.count({ where: { role: "USER" } }),
      this.prisma.order.aggregate({
        where: { status: { in: ["DELIVERED", "COMPLETED", "PAID"] as any } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.user.findMany({
        where: { role: "USER" },
        select: { id: true },
      }),
    ]);
    const profiles = await Promise.all(
      atRiskCandidates.map((u) => this.calculateCustomerProfile(u.id)),
    );
    const bySegment = profiles.reduce(
      (acc: Record<string, number>, p) => ({
        ...acc,
        [p.segment]: (acc[p.segment] || 0) + 1,
      }),
      {},
    );
    return {
      totalCustomers,
      totalRevenue: Number(orderAgg._sum.total || 0),
      totalOrders: orderAgg._count.id || 0,
      averageOrderValue: orderAgg._count.id
        ? Number(orderAgg._sum.total || 0) / orderAgg._count.id
        : 0,
      bySegment,
      atRiskCount: profiles.filter(
        (p) => p.segment === "AT_RISK" || p.segment === "DORMANT",
      ).length,
    };
  }

  async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("Không tìm thấy khách hàng");
    return user;
  }
}
