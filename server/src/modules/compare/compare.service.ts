import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Injectable()
export class CompareService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.compareItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, productId: string) {
    try {
      const item = await this.prisma.compareItem.create({
        data: { userId, productId },
        include: { product: true },
      });
      return item;
    } catch (err: any) {
      if (String(err.message).includes('Unique constraint')) {
        throw new BadRequestException('Sản phẩm đã có trong so sánh');
      }
      throw err;
    }
  }

  async remove(userId: string, productId: string) {
    await this.prisma.compareItem.delete({ where: { userId_productId: { userId, productId } } });
    return { success: true };
  }

  async clear(userId: string) {
    await this.prisma.compareItem.deleteMany({ where: { userId } });
    return { success: true };
  }
}
