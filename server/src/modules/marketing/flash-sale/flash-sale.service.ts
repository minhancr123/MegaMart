import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateFlashSaleDto, UpdateFlashSaleDto, AddFlashSaleItemsDto, UpdateFlashSaleItemDto } from './dto/flash-sale.dto';
import { AuditLogService, AuditAction, AuditEntity } from '../../audit-log/audit-log.service';
import { formatPrice } from 'src/utils/price.util';

@Injectable()
export class FlashSaleService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) { }

  async findAll(status?: 'active' | 'upcoming' | 'ended' | 'all') {
    const now = new Date();

    let where: any = {};

    switch (status) {
      case 'active':
        where = {
          active: true,
          startTime: { lte: now },
          endTime: { gte: now },
        };
        break;
      case 'upcoming':
        where = {
          startTime: { gt: now },
        };
        break;
      case 'ended':
        where = {
          endTime: { lt: now },
        };
        break;
      default:
        // All flash sales
        break;
    }

    const flashSales = await this.prisma.flashSale.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: [
                        { isPrimary: 'desc' },
                        { displayOrder: 'asc' }
                      ]
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return this.serializeFlashSales(flashSales);
  }

  async findActive() {
    const now = new Date();

    const flashSales = await this.prisma.flashSale.findMany({
      where: {
        active: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: [
                        { isPrimary: 'desc' },
                        { displayOrder: 'asc' }
                      ]
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { endTime: 'asc' },
    });

    return this.serializeFlashSales(flashSales);
  }

  async findOne(id: string) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: [
                        { isPrimary: 'desc' },
                        { displayOrder: 'asc' }
                      ]
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!flashSale) {
      throw new NotFoundException('Flash sale not found');
    }

    return this.serializeFlashSale(flashSale);
  }

  async create(createFlashSaleDto: CreateFlashSaleDto, userId?: string, ipAddress?: string) {
    const startTime = new Date(createFlashSaleDto.startTime);
    const endTime = new Date(createFlashSaleDto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    const { items, ...flashSaleData } = createFlashSaleDto;

    const flashSale = await this.prisma.flashSale.create({
      data: {
        ...flashSaleData,
        startTime,
        endTime,
        items: items ? {
          create: items.map(item => ({
            variantId: item.variantId,
            salePrice: BigInt(Math.round(item.salePrice * 100)),
            quantity: item.quantity,
          })),
        } : undefined,
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.FLASHSALE_CREATE,
      AuditEntity.FLASHSALE,
      userId,
      flashSale.id,
      {
        name: flashSale.name,
        itemCount: flashSale.items.length,
        startTime: flashSale.startTime,
        endTime: flashSale.endTime,
      },
      ipAddress
    );

    return this.serializeFlashSale(flashSale);
  }

  async update(id: string, updateFlashSaleDto: UpdateFlashSaleDto, userId?: string, ipAddress?: string) {
    const oldFlashSale = await this.findOne(id);

    const updateData: any = { ...updateFlashSaleDto };

    if (updateFlashSaleDto.startTime) {
      updateData.startTime = new Date(updateFlashSaleDto.startTime);
    }
    if (updateFlashSaleDto.endTime) {
      updateData.endTime = new Date(updateFlashSaleDto.endTime);
    }

    // Validate time if both provided
    if (updateData.startTime && updateData.endTime) {
      if (updateData.startTime >= updateData.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    const flashSale = await this.prisma.flashSale.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.FLASHSALE_UPDATE,
      AuditEntity.FLASHSALE,
      userId,
      id,
      {
        before: { name: oldFlashSale.name, active: oldFlashSale.active },
        after: { name: flashSale.name, active: flashSale.active },
      },
      ipAddress
    );

    return this.serializeFlashSale(flashSale);
  }

  async addItems(id: string, addItemsDto: AddFlashSaleItemsDto) {
    await this.findOne(id);

    const created = await this.prisma.flashSaleItem.createMany({
      data: addItemsDto.items.map(item => ({
        flashSaleId: id,
        variantId: item.variantId,
        salePrice: BigInt(Math.round(item.salePrice * 100)),
        quantity: item.quantity,
      })),
      skipDuplicates: true,
    });

    return this.findOne(id);
  }

  async removeItem(flashSaleId: string, itemId: string) {
    await this.prisma.flashSaleItem.delete({
      where: { id: itemId },
    });

    return this.findOne(flashSaleId);
  }

  async updateItem(flashSaleId: string, itemId: string, updateDto: UpdateFlashSaleItemDto) {
    // Check if item exists
    const item = await this.prisma.flashSaleItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Flash sale item not found');
    }

    // Update item
    const updateData: any = {};

    if (updateDto.salePrice !== undefined) {
      updateData.salePrice = BigInt(Math.round(updateDto.salePrice * 100));
    }

    if (updateDto.quantity !== undefined) {
      updateData.quantity = updateDto.quantity;
    }

    await this.prisma.flashSaleItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return this.findOne(flashSaleId);
  }

  async toggleActive(id: string, userId?: string, ipAddress?: string) {
    const flashSale = await this.findOne(id);

    const updated = await this.prisma.flashSale.update({
      where: { id },
      data: { active: !flashSale.active },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return this.serializeFlashSale(updated);
  }

  async delete(id: string, userId?: string, ipAddress?: string) {
    const flashSale = await this.findOne(id);

    await this.prisma.flashSale.delete({
      where: { id },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.FLASHSALE_DELETE,
      AuditEntity.FLASHSALE,
      userId,
      id,
      { name: flashSale.name, itemCount: flashSale.items?.length || 0 },
      ipAddress
    );

    return { message: 'Flash sale deleted successfully' };
  }

  // Check if a variant is currently in an active flash sale
  async getFlashSalePrice(variantId: string): Promise<{ isOnSale: boolean; salePrice?: bigint; flashSale?: any }> {
    const now = new Date();

    const item = await this.prisma.flashSaleItem.findFirst({
      where: {
        variantId,
        flashSale: {
          active: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
        soldCount: { lt: this.prisma.flashSaleItem.fields.quantity },
      },
      include: {
        flashSale: true,
      },
    });

    if (item) {
      return {
        isOnSale: true,
        salePrice: item.salePrice,
        flashSale: item.flashSale,
      };
    }

    return { isOnSale: false };
  }

  // Update sold count when an order is placed
  async incrementSoldCount(variantId: string, quantity: number) {
    const now = new Date();

    const item = await this.prisma.flashSaleItem.findFirst({
      where: {
        variantId,
        flashSale: {
          active: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      },
    });

    if (item) {
      await this.prisma.flashSaleItem.update({
        where: { id: item.id },
        data: {
          soldCount: { increment: quantity },
        },
      });
    }
  }

  // Helper method to serialize BigInt fields
  private serializeFlashSale(flashSale: any) {
    return {
      ...flashSale,
      items: flashSale.items?.map((item: any) => ({
        ...item,
        salePrice: formatPrice(item.salePrice),
        variant: item.variant ? {
          ...item.variant,
          price: formatPrice(item.variant.price),
        } : undefined,
      })) || [],
    };
  }

  private serializeFlashSales(flashSales: any[]) {
    return flashSales.map(fs => this.serializeFlashSale(fs));
  }
}
