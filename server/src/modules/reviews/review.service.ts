import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto) {
    const { userId, productId, rating, comment, images } = dto;

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    // Optional check: user đã mua hàng này?
    if (userId) {
      const hasPurchased = await this.prisma.order.findFirst({
        where: {
          userId,
          items: {
            some: {
              variant: {
                productId,
              },
            },
          },
        },
      });
      if (!hasPurchased) {
        throw new BadRequestException('Bạn cần mua sản phẩm này trước khi đánh giá');
      }
    }

    const review = await this.prisma.review.create({
      data: {
        userId: userId || 'guest',
        productId,
        rating,
        comment,
        images: images?.length ? images : null,
        approved: true,
      },
    });

    return review;
  }

  async listByProduct(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, approved: true },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const avg =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    return { reviews, averageRating: avg, count: reviews.length };
  }
}
