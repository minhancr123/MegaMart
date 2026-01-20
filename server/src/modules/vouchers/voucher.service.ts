import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { VoucherType } from '@prisma/client';

@Injectable()
export class VoucherService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVoucherDto) {
    const exists = await this.prisma.voucher.findUnique({ where: { code: dto.code } });
    if (exists) {
      throw new BadRequestException('Mã voucher đã tồn tại');
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        value: dto.value,
        maxDiscount: dto.maxDiscount,
        minOrderValue: dto.minOrderValue,
        usageLimit: dto.usageLimit,
        usagePerUser: dto.usagePerUser,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        active: dto.active ?? true,
      },
    });

    return voucher;
  }

  private assertUsable(voucher: any, userId?: string, subtotal?: number) {
    const now = new Date();
    if (!voucher.active) throw new BadRequestException('Voucher không hoạt động');
    if (voucher.startDate && now < voucher.startDate) throw new BadRequestException('Voucher chưa tới ngày hiệu lực');
    if (voucher.endDate && now > voucher.endDate) throw new BadRequestException('Voucher đã hết hạn');
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) throw new BadRequestException('Voucher đã hết lượt dùng');
    if (voucher.minOrderValue && subtotal !== undefined && subtotal < voucher.minOrderValue) throw new BadRequestException('Đơn hàng chưa đạt giá trị tối thiểu');
    return true;
  }

  private calcDiscount(voucher: any, subtotal: number) {
    if (!subtotal || subtotal <= 0) return 0;
    if (voucher.type === VoucherType.FIXED) return Math.min(voucher.value, subtotal);
    if (voucher.type === VoucherType.PERCENT) {
      const raw = Math.floor((voucher.value / 100) * subtotal);
      return voucher.maxDiscount ? Math.min(raw, voucher.maxDiscount) : raw;
    }
    if (voucher.type === VoucherType.FREESHIP) {
      // For now treat freeship as a fixed discount (shipping) caller can apply.
      return voucher.value || 0;
    }
    return 0;
  }

  async validate(code: string, userId: string | undefined, subtotal: number | undefined) {
    const voucher = await this.prisma.voucher.findUnique({ where: { code } });
    if (!voucher) throw new NotFoundException('Không tìm thấy voucher');

    this.assertUsable(voucher, userId, subtotal);

    if (userId && voucher.usagePerUser) {
      const used = await this.prisma.voucherUsage.count({ where: { voucherId: voucher.id, userId } });
      if (used >= voucher.usagePerUser) throw new BadRequestException('Bạn đã dùng hết lượt voucher này');
    }

    const discount = this.calcDiscount(voucher, subtotal || 0);
    return { voucher, discount };
  }

  async consume(code: string, userId: string | undefined, orderId: string | undefined, subtotal: number) {
    const { voucher, discount } = await this.validate(code, userId, subtotal);

    await this.prisma.$transaction(async (tx) => {
      await tx.voucher.update({ where: { id: voucher.id }, data: { usedCount: { increment: 1 } } });
      await tx.voucherUsage.create({
        data: {
          voucherId: voucher.id,
          userId: userId || 'guest',
          orderId,
        },
      });
    });

    return { voucher, discount };
  }
}
