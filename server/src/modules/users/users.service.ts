import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/prismaClient/prisma.service";
import { CreateUserDto, UpdateUserDto } from "./dto/user.dto";
import { hash, compare } from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter?: { role?: string }) {
    const where: any = {};
    if (
      filter?.role &&
      ["USER", "ADMIN", "SUPPLIER", "SHIPPER"].includes(filter.role)
    ) {
      where.role = filter.role;
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        loyaltyPoints: true,
        wallet: { select: { balance: true } },
        supplierId: true,
        supplier: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getCustomer360(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        shipperProfile: true,
      },
    });
    if (!user) throw new NotFoundException("Không tìm thấy khách hàng");

    const [
      recentOrders,
      walletTransactions,
      loyaltyTransactions,
      stats,
      cancelledCount,
      customerTags,
      customerNotes,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId: id },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      }),
      (this.prisma as any).walletTransaction.findMany({
        where: { wallet: { userId: id } },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      (this.prisma as any).loyaltyTransaction.findMany({
        where: { userId: id },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.aggregate({
        where: {
          userId: id,
          status: { in: ["DELIVERED", "COMPLETED", "PAID"] },
        },
        _sum: { total: true },
        _count: { id: true },
        _max: { createdAt: true },
      }),
      this.prisma.order.count({
        where: { userId: id, status: { in: ["CANCELED", "FAILED"] as any } },
      }),
      (this.prisma as any).customerTagAssignment.findMany({
        where: { userId: id },
        include: { tag: true },
        orderBy: { assignedAt: "desc" },
      }),
      (this.prisma as any).customerNote.findMany({
        where: { userId: id },
        take: 5,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const lifetimePoints = (user as any).lifetimePoints || 0;
    const TIER_RULES = [
      { name: "Kim Cương", icon: "💎", minPoints: 20000 },
      { name: "Vàng", icon: "🥇", minPoints: 5000 },
      { name: "Bạc", icon: "🥈", minPoints: 1000 },
      { name: "Thành viên", icon: "🥉", minPoints: 0 },
    ];
    const tier =
      TIER_RULES.find((t) => lifetimePoints >= t.minPoints) || TIER_RULES[3];
    const totalSpent = Number(stats._sum.total || 0);
    const orderCount = stats._count.id || 0;
    const lastOrderDate = stats._max.createdAt || null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / 86400000)
      : Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) / 86400000,
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
      totalSpent >= 50000000
        ? 25
        : totalSpent >= 20000000
          ? 20
          : totalSpent >= 5000000
            ? 14
            : totalSpent > 0
              ? 8
              : 2;
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        recencyScore +
          frequencyScore +
          monetaryScore +
          10 -
          Math.min(20, cancelledCount * 5),
      ),
    );
    const segment =
      orderCount === 0
        ? "NEW"
        : daysSinceLastOrder > 120
          ? "DORMANT"
          : daysSinceLastOrder > 60 || healthScore < 40
            ? "AT_RISK"
            : healthScore >= 80 && totalSpent >= 20000000
              ? "CHAMPION"
              : healthScore >= 65 && orderCount >= 3
                ? "LOYAL"
                : "POTENTIAL";

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: (user as any).shipperProfile?.phone || null,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      financial: {
        walletBalance: Number(user.wallet?.balance || 0),
        walletStatus: (user.wallet as any)?.status || "ACTIVE",
        loyaltyPoints: (user as any).loyaltyPoints || 0,
        lifetimePoints,
        tierName: tier.name,
        tierIcon: tier.icon,
      },
      stats: {
        totalOrders: orderCount,
        totalSpent,
        lastOrderDate,
      },
      crm: {
        healthScore,
        segment,
        daysSinceLastOrder,
        cancelledCount,
        tags: customerTags.map((assignment: any) => assignment.tag),
        notes: customerNotes,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        total: Number(o.total),
        createdAt: o.createdAt,
        itemCount: o._count.items,
      })),
      recentWalletTransactions: walletTransactions.map((t: any) => ({
        ...t,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
      })),
      recentPointTransactions: loyaltyTransactions,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        supplierId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, name } = createUserDto;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Role qua API này chỉ cho USER/SUPPLIER (DTO đã chặn ADMIN).
    // SUPPLIER bắt buộc gắn 1 NCC tồn tại.
    const role = (createUserDto as any).role || "USER";
    let supplierId: string | undefined;
    if (role === "SUPPLIER") {
      supplierId = (createUserDto as any).supplierId;
      if (!supplierId) {
        throw new BadRequestException(
          "Tạo tài khoản NCC phải chọn nhà cung cấp",
        );
      }
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId },
      });
      if (!supplier) {
        throw new BadRequestException("Nhà cung cấp không tồn tại");
      }
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role,
        supplierId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        supplierId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, requester?: any) {
    const user = await this.findOne(id);
    const isAdmin = requester?.role === "ADMIN";

    // Đổi role/supplierId chỉ ADMIN được làm, và không được tự đổi role của mình
    // (tránh tự khóa quyền admin).
    const wantsRoleChange =
      (updateUserDto as any).role !== undefined ||
      (updateUserDto as any).supplierId !== undefined;
    if (wantsRoleChange) {
      if (!isAdmin) {
        throw new ForbiddenException("Chỉ quản trị viên được đổi vai trò");
      }
      if (
        requester?.userId === id &&
        (updateUserDto as any).role !== undefined
      ) {
        throw new ForbiddenException(
          "Không được tự đổi vai trò của chính mình",
        );
      }
      if (
        (updateUserDto as any).role === "SUPPLIER" &&
        !(updateUserDto as any).supplierId &&
        !(user as any).supplierId
      ) {
        throw new BadRequestException("Gán role NCC phải chọn nhà cung cấp");
      }
      if ((updateUserDto as any).supplierId) {
        const supplier = await this.prisma.supplier.findUnique({
          where: { id: (updateUserDto as any).supplierId },
        });
        if (!supplier) {
          throw new BadRequestException("Nhà cung cấp không tồn tại");
        }
      }
      // Hạ từ SUPPLIER xuống role khác thì gỡ link NCC
      if (
        (updateUserDto as any).role &&
        (updateUserDto as any).role !== "SUPPLIER"
      ) {
        (updateUserDto as any).supplierId = null;
      }
    } else if (!isAdmin && requester?.userId !== id) {
      // User thường chỉ được sửa chính mình
      throw new ForbiddenException("Bạn chỉ được sửa tài khoản của mình");
    }

    if (updateUserDto.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException("Email already in use");
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        supplierId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async validateUser(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async updateAvatar(userid: string, avatarUrl: string) {
    const user = await this.findOne(userid);
    if (!user) throw new NotFoundException(`User with ID ${userid} not found`);

    return this.prisma.user.update({
      where: { id: userid },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
