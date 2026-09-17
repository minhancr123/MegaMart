import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prismaClient/prisma.service';

/**
 * Đọc gợi ý cá nhân do job recommendation-refresh tính sẵn.
 * Client render "Dành riêng cho bạn" — không gọi LLM lúc request.
 */
@Injectable()
export class RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, take = 20) {
    if (!userId) throw new Error('listForUser: thiếu userId');
    const rows = await this.prisma.userRecommendation.findMany({
      where: {
        userId,
        // Ẩn sp đã xóa mềm sau khi job chạy (deletedAt set sau).
        product: { deletedAt: null },
      },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      take: Math.min(Math.max(take, 1), 50),
      select: {
        productId: true,
        score: true,
        reason: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            brand: true,
            variants: {
              orderBy: { price: 'asc' },
              take: 1,
              select: { price: true, salePrice: true },
            },
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
          },
        },
      },
    });
    // Lọc sp đã bị xóa mềm sau khi job chạy + ép BigInt về Number.
    return rows
      .filter((r) => r.product !== null)
      .map((r) => ({
        productId: r.productId,
        score: r.score,
        reason: r.reason,
        refreshedAt: r.updatedAt,
        product: {
          id: r.product!.id,
          name: r.product!.name,
          slug: r.product!.slug,
          brand: r.product!.brand,
          price:
            r.product!.variants[0]?.price != null
              ? Number(r.product!.variants[0].price)
              : null,
          salePrice:
            r.product!.variants[0]?.salePrice != null
              ? Number(r.product!.variants[0].salePrice)
              : null,
          image: r.product!.images[0]?.url ?? null,
        },
      }));
  }
}
