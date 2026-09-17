import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Injectable()
export class ShippersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Chỉ expose thông tin shipper an toàn cho khách hàng. */
  public toPublicShipper(user: any) {
    if (!user) return null;
    const profile = user.shipperProfile || null;
    return {
      id: user.id,
      name: user.name || 'Shipper MegaMart',
      phone: profile?.phone || null,
      vehiclePlate: profile?.vehiclePlate || null,
      avatarUrl: profile?.avatarUrl || user.avatarUrl || null,
      isActive: profile?.isActive ?? false,
    };
  }

  /** Load-balancing đơn giản: chọn shipper active có ít đơn SHIPPING nhất, hòa thì random. */
  async getLeastBusyActiveShipper(tx?: any) {
    const client = tx || this.prisma;
    const shippers = await client.user.findMany({
      where: { role: 'SHIPPER' as any, shipperProfile: { isActive: true } },
      include: {
        shipperProfile: true,
        _count: { select: { assignedOrders: { where: { status: 'SHIPPING' as any } } } },
      },
    });
    if (!shippers.length) return null;
    const min = Math.min(...shippers.map((s: any) => s._count?.assignedOrders || 0));
    const candidates = shippers.filter((s: any) => (s._count?.assignedOrders || 0) === min);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  async listShippers() {
    const shippers = await this.prisma.user.findMany({
      where: { role: 'SHIPPER' as any },
      include: {
        shipperProfile: true,
        _count: { select: { assignedOrders: { where: { status: 'SHIPPING' as any } } } },
      },
      orderBy: { name: 'asc' },
    });
    return shippers.map((s: any) => ({
      ...this.toPublicShipper(s),
      email: s.email,
      activeOrders: s._count?.assignedOrders || 0,
    }));
  }

  async upsertProfile(targetUserId: string, dto: { phone?: string; vehiclePlate?: string; avatarUrl?: string; isActive?: boolean }) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new HttpException({ success: false, message: 'Không tìm thấy shipper' }, HttpStatus.NOT_FOUND);
    if (String(user.role) !== 'SHIPPER') {
      throw new HttpException({ success: false, message: 'Tài khoản này không phải shipper' }, HttpStatus.BAD_REQUEST);
    }
    const phone = String(dto.phone || '').trim();
    const vehiclePlate = String(dto.vehiclePlate || '').trim();
    if (!phone || !vehiclePlate) {
      throw new HttpException({ success: false, message: 'Số điện thoại và biển số xe là bắt buộc' }, HttpStatus.BAD_REQUEST);
    }
    const profile = await (this.prisma as any).shipperProfile.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        phone,
        vehiclePlate,
        avatarUrl: dto.avatarUrl || null,
        isActive: dto.isActive ?? true,
      },
      update: {
        phone,
        vehiclePlate,
        avatarUrl: dto.avatarUrl || null,
        isActive: dto.isActive ?? true,
      },
    });
    return profile;
  }
}
