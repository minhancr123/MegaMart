import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { Prisma } from '@prisma/client';
import { 
  CreateWarehouseDto, 
  UpdateWarehouseDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  UpdateInventoryDto,
  QueryInventoryDto,
} from './dto/inventory.dto';
import {
  CreateStockMovementDto,
  UpdateStockMovementDto,
  QueryStockMovementDto,
} from './dto/stock-movement.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ============== WAREHOUSE ==============

  async findAllWarehouses(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.warehouse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { inventories: true, stockMovements: true },
        },
      },
    });
  }

  async findWarehouseById(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: { inventories: true, stockMovements: true },
        },
      },
    });
    if (!warehouse) throw new NotFoundException('Không tìm thấy kho hàng');
    return warehouse;
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    // Check code unique
    const exists = await this.prisma.warehouse.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new BadRequestException('Mã kho đã tồn tại');

    return this.prisma.warehouse.create({ data: dto });
  }

  async updateWarehouse(id: string, dto: UpdateWarehouseDto) {
    await this.findWarehouseById(id);
    return this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
  }

  async deleteWarehouse(id: string) {
    await this.findWarehouseById(id);
    // Soft delete by setting isActive = false
    return this.prisma.warehouse.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============== SUPPLIER ==============

  async findAllSuppliers(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { stockMovements: true },
        },
      },
    });
  }

  async findSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
    });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    return supplier;
  }

  async createSupplier(dto: CreateSupplierDto) {
    const exists = await this.prisma.supplier.findUnique({
      where: { code: dto.code },
    });
    if (exists) throw new BadRequestException('Mã nhà cung cấp đã tồn tại');

    return this.prisma.supplier.create({ data: dto });
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    await this.findSupplierById(id);
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSupplier(id: string) {
    await this.findSupplierById(id);
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============== WAREHOUSE INVENTORY ==============

  async getInventory(query: QueryInventoryDto) {
    const { warehouseId, lowStock, search, page = 1, limit = 20 } = query;
    
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    
    // Search by SKU
    if (search) {
      where.variant = {
        sku: { contains: search, mode: 'insensitive' },
      };
    }

    // Get all data first (we'll filter low stock in memory if needed)
    const [allData, total] = await Promise.all([
      this.prisma.warehouseInventory.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          variant: {
            select: {
              id: true,
              sku: true,
              price: true,
              attributes: true,
              product: {
                select: { id: true, name: true, images: { take: 1 } },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.warehouseInventory.count({ where }),
    ]);

    // Filter low stock items if requested
    let data = allData;
    let filteredTotal = total;
    
    if (lowStock) {
      data = allData.filter(item => item.quantity <= item.minQuantity);
      filteredTotal = data.length;
    }

    // Apply pagination after filtering
    const paginatedData = data.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedData,
      meta: { total: filteredTotal, page, limit, totalPages: Math.ceil(filteredTotal / limit) },
    };
  }

  async getLowStockItems(warehouseId?: string) {
    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;

    // Get items where quantity <= minQuantity
    return this.prisma.$queryRaw`
      SELECT wi.*, w.name as "warehouseName", v.sku, v.price, 
             p.name as "productName"
      FROM "WarehouseInventory" wi
      JOIN "Warehouse" w ON wi."warehouseId" = w.id
      JOIN "Variant" v ON wi."variantId" = v.id
      JOIN "Product" p ON v."productId" = p.id
      WHERE wi.quantity <= wi."minQuantity"
      ${warehouseId ? `AND wi."warehouseId" = ${warehouseId}` : ''}
      ORDER BY wi.quantity ASC
    `;
  }

  async updateInventory(warehouseId: string, variantId: string, dto: UpdateInventoryDto) {
    // Upsert inventory record
    return this.prisma.warehouseInventory.upsert({
      where: {
        warehouseId_variantId: { warehouseId, variantId },
      },
      update: dto,
      create: {
        warehouseId,
        variantId,
        ...dto,
      },
    });
  }

  // ============== STOCK MOVEMENT ==============

  async findAllStockMovements(query: QueryStockMovementDto) {
    const { type, warehouseId, supplierId, status, search, startDate, endDate, page = 1, limit = 20 } = query;

    const where: any = {};
    if (type) where.type = type;
    if (warehouseId) where.warehouseId = warehouseId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (search) where.code = { contains: search, mode: 'insensitive' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              variant: {
                select: {
                  id: true,
                  sku: true,
                  product: { select: { id: true, name: true } },
                },
              },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    // Convert BigInt/Decimal to Number
    const serializedData = data.map(movement => ({
      ...movement,
      totalAmount: movement.totalAmount ? Number(movement.totalAmount) : 0,
      items: movement.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      })),
    }));

    return {
      data: serializedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findStockMovementById(id: string) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        warehouse: true,
        supplier: true,
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                price: true,
                attributes: true,
              },
              include: {
                product: { select: { id: true, name: true, images: { take: 1 } } },
              },
            },
          },
        },
      },
    });
    if (!movement) throw new NotFoundException('Không tìm thấy phiếu');
    
    // Convert BigInt/Decimal to Number
    return {
      ...movement,
      totalAmount: movement.totalAmount ? Number(movement.totalAmount) : 0,
      items: movement.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        variant: {
          ...item.variant,
          price: Number(item.variant.price),
        },
      })),
    };
  }

  async searchVariants(query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    
    const variants = await this.prisma.variant.findMany({
      where: {
        OR: [
          { sku: { contains: query, mode: 'insensitive' } },
          { product: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
          },
        },
      },
      take: 10,
    });
    
    return variants.map(v => ({
      variantId: v.id,
      sku: v.sku,
      productId: v.product.id,
      productName: v.product.name,
      price: Number(v.price),
      stock: v.stock,
      imageUrl: v.product.images[0]?.url,
      attributes: v.attributes,
    }));
  }

  async createStockMovement(dto: CreateStockMovementDto, createdBy: string) {
    // Generate code
    const year = new Date().getFullYear();
    const prefix = this.getMovementPrefix(dto.type as any);
    const count = await this.prisma.stockMovement.count({
      where: {
        type: dto.type as any,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const code = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    // Calculate total amount for imports
    let totalAmount: bigint | undefined;
    if (dto.type === 'IMPORT') {
      totalAmount = dto.items.reduce((sum, item) => {
        return sum + BigInt((item.unitPrice || 0) * item.quantity);
      }, BigInt(0));
    }

    const result = await this.prisma.stockMovement.create({
      data: {
        code,
        type: dto.type as any,
        warehouseId: dto.warehouseId,
        supplierId: dto.supplierId,
        toWarehouseId: dto.toWarehouseId,
        orderId: dto.orderId,
        notes: dto.notes,
        totalAmount,
        createdBy,
        items: {
          create: dto.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice ? BigInt(item.unitPrice) : undefined,
            notes: item.notes,
          })),
        },
      },
      include: {
        warehouse: true,
        supplier: true,
        items: { include: { variant: true } },
      },
    });
    
    // Convert BigInt/Decimal to Number
    return {
      ...result,
      totalAmount: result.totalAmount ? Number(result.totalAmount) : 0,
      items: result.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        variant: {
          ...item.variant,
          price: Number(item.variant.price),
        },
      })),
    };
  }

  async completeStockMovement(id: string) {
    const movement = await this.findStockMovementById(id);
    
    if (movement.status === 'COMPLETED') {
      throw new BadRequestException('Phiếu đã được hoàn thành');
    }
    if (movement.status === 'CANCELLED') {
      throw new BadRequestException('Phiếu đã bị hủy');
    }

    // Update inventory based on movement type
    await this.prisma.$transaction(async (tx) => {
      for (const item of movement.items) {
        const quantityChange = this.getQuantityChange(movement.type as any, item.quantity);
        
        // Update or create warehouse inventory
        await tx.warehouseInventory.upsert({
          where: {
            warehouseId_variantId: {
              warehouseId: movement.warehouseId,
              variantId: item.variantId,
            },
          },
          update: {
            quantity: { increment: quantityChange },
          },
          create: {
            warehouseId: movement.warehouseId,
            variantId: item.variantId,
            quantity: quantityChange > 0 ? quantityChange : 0,
          },
        });

        // Update total stock on variant
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stock: { increment: quantityChange } },
        });

        // Handle transfer: add to destination warehouse
        if ((movement.type as any) === 'TRANSFER_OUT' && movement.toWarehouseId) {
          await tx.warehouseInventory.upsert({
            where: {
              warehouseId_variantId: {
                warehouseId: movement.toWarehouseId,
                variantId: item.variantId,
              },
            },
            update: {
              quantity: { increment: item.quantity },
            },
            create: {
              warehouseId: movement.toWarehouseId,
              variantId: item.variantId,
              quantity: item.quantity,
            },
          });
        }
      }

      // Update movement status
      await tx.stockMovement.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return this.findStockMovementById(id);
  }

  async cancelStockMovement(id: string) {
    const movement = await this.findStockMovementById(id);
    
    if (movement.status === 'COMPLETED') {
      throw new BadRequestException('Không thể hủy phiếu đã hoàn thành');
    }

    return this.prisma.stockMovement.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ============== HELPERS ==============

  private getMovementPrefix(type: string): string {
    switch (type) {
      case 'IMPORT': return 'PN';
      case 'EXPORT': return 'PX';
      case 'TRANSFER_IN': return 'NK';
      case 'TRANSFER_OUT': return 'XK';
      case 'ADJUSTMENT': return 'DC';
      case 'RETURN': return 'TH';
      case 'DAMAGE': return 'HH';
      case 'SALE': return 'BH';
      default: return 'PK';
    }
  }

  private getQuantityChange(type: string, quantity: number): number {
    // Positive = add to inventory, Negative = subtract from inventory
    switch (type) {
      case 'IMPORT':
      case 'TRANSFER_IN':
      case 'RETURN':
        return quantity;
      case 'EXPORT':
      case 'TRANSFER_OUT':
      case 'DAMAGE':
      case 'SALE':
        return -quantity;
      case 'ADJUSTMENT':
        return quantity; // Can be positive or negative
      default:
        return 0;
    }
  }

  // ============== STATISTICS ==============

  async getInventoryStats(warehouseId?: string) {
    const totalItems = await this.prisma.warehouseInventory.count({
      where: warehouseId ? { warehouseId } : {},
    });

    // Low stock count using Prisma.sql for proper parameterization
    let lowStockCount = 0;
    if (warehouseId) {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>(
        Prisma.sql`
          SELECT COUNT(*) as count 
          FROM "WarehouseInventory" 
          WHERE quantity <= "minQuantity"
          AND "warehouseId" = ${warehouseId}
        `
      );
      lowStockCount = Number(result[0]?.count || 0);
    } else {
      const result = await this.prisma.$queryRaw<[{ count: bigint }]>(
        Prisma.sql`
          SELECT COUNT(*) as count 
          FROM "WarehouseInventory" 
          WHERE quantity <= "minQuantity"
        `
      );
      lowStockCount = Number(result[0]?.count || 0);
    }

    // Total inventory value
    let totalValue = 0;
    if (warehouseId) {
      const result = await this.prisma.$queryRaw<[{ total: bigint }]>(
        Prisma.sql`
          SELECT COALESCE(SUM(wi.quantity * v.price), 0) as total
          FROM "WarehouseInventory" wi
          JOIN "Variant" v ON wi."variantId" = v.id
          WHERE wi."warehouseId" = ${warehouseId}
        `
      );
      totalValue = Number(result[0]?.total || 0);
    } else {
      const result = await this.prisma.$queryRaw<[{ total: bigint }]>(
        Prisma.sql`
          SELECT COALESCE(SUM(wi.quantity * v.price), 0) as total
          FROM "WarehouseInventory" wi
          JOIN "Variant" v ON wi."variantId" = v.id
        `
      );
      totalValue = Number(result[0]?.total || 0);
    }

    return {
      totalItems,
      lowStockCount,
      totalValue,
    };
  }
}
