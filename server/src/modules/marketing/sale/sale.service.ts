import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { ApplySaleDto, UpdateVariantSaleDto, RemoveSaleDto } from './dto/sale.dto';
import { AuditLogService, AuditAction, AuditEntity } from 'src/modules/audit-log/audit-log.service';

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
    const { variantIds, discountPercent, saleStartDate, saleEndDate } = applySaleDto;

    // Validate dates
    if (saleStartDate && saleEndDate) {
      const start = new Date(saleStartDate);
      const end = new Date(saleEndDate);
      if (start >= end) {
        throw new BadRequestException('Sale start date must be before end date');
      }
    }

    // Get variants with products
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length === 0) {
      throw new NotFoundException('No variants found');
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
        action: 'APPLY_SALE',
        variantCount: variantIds.length,
        discountPercent,
      },
    );

    return {
      message: `Applied ${discountPercent}% sale to ${updatedVariants.length} variant(s)`,
      updatedCount: updatedVariants.length,
      variants: updatedVariants.map(v => ({
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
      throw new NotFoundException('Variant not found');
    }

    const data: any = {};

    if (updateDto.discountPercent !== undefined) {
      const originalPrice = Number(variant.price);
      const salePrice = Math.round(originalPrice * (1 - updateDto.discountPercent / 100));
      data.discountPercent = updateDto.discountPercent;
      data.salePrice = BigInt(salePrice);
    }

    if (updateDto.saleStartDate !== undefined) {
      data.saleStartDate = updateDto.saleStartDate ? new Date(updateDto.saleStartDate) : null;
    }

    if (updateDto.saleEndDate !== undefined) {
      data.saleEndDate = updateDto.saleEndDate ? new Date(updateDto.saleEndDate) : null;
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
        action: 'REMOVE_SALE',
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
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { discountPercent: 'desc' },
    });

    return variants.map(v => ({
      id: v.id,
      sku: v.sku,
      productId: v.product.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      image: v.product.images[0]?.url,
      originalPrice: v.price.toString(),
      salePrice: v.salePrice?.toString(),
      discountPercent: v.discountPercent,
      savedAmount: v.salePrice ? (Number(v.price) - Number(v.salePrice)).toString() : '0',
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
      throw new NotFoundException('Variant not found');
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
      savedAmount: variant.salePrice ? (Number(variant.price) - Number(variant.salePrice)).toString() : '0',
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
    discountType: 'FLASH_SALE' | 'REGULAR_SALE' | 'NONE';
  }> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
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
        discountType: 'FLASH_SALE',
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
        discountType: 'REGULAR_SALE',
      };
    }

    // No discount
    return {
      originalPrice: originalPrice.toString(),
      finalPrice: originalPrice.toString(),
      discountPercent: 0,
      savedAmount: '0',
      discountType: 'NONE',
    };
  }
}
