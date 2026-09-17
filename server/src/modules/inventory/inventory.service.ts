import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditLogService, AuditAction, AuditEntity } from 'src/modules/audit-log/audit-log.service';
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
  constructor(
    private prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
    const { warehouseId, variantId, productId, lowStock, search } = query;
    const take = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const currentPage = Math.max(1, Number(query.page) || 1);
    const skip = (currentPage - 1) * take;

    const include = {
      warehouse: { select: { id: true, name: true, code: true } },
      pallet: { select: { id: true, code: true, location: true } },
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
    };

    // So sánh 2 cột quantity <= minQuantity: Prisma where thường không làm được
    // nên lọc lowStock bằng raw SQL có phân trang (IDs), rồi hydrate findMany
    // để giữ nguyên shape response cho client cũ.
    if (lowStock) {
      const conds: any[] = [Prisma.sql`wi.quantity <= wi."minQuantity"`];
      if (warehouseId) conds.push(Prisma.sql`wi."warehouseId" = ${warehouseId}`);
      if (variantId) conds.push(Prisma.sql`wi."variantId" = ${variantId}`);
      if (productId) conds.push(Prisma.sql`v."productId" = ${productId}`);
      if (search) conds.push(Prisma.sql`v.sku ILIKE ${'%' + search + '%'}`);
      const whereSql =
        conds.length > 1 ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.sql`WHERE ${conds[0]}`;
      const joinVariant =
        productId || search
          ? Prisma.sql`JOIN "Variant" v ON v.id = wi."variantId"`
          : Prisma.empty;
      const [idRows, counted] = await Promise.all([
        this.prisma.$queryRaw<{ id: string }[]>`
          SELECT wi.id FROM "WarehouseInventory" wi ${joinVariant}
          ${whereSql} ORDER BY wi.quantity ASC LIMIT ${take} OFFSET ${skip}`,
        this.prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*)::bigint AS total FROM "WarehouseInventory" wi ${joinVariant}
          ${whereSql}`,
      ]);
      const ids = idRows.map((r) => r.id);
      const data =
        ids.length === 0
          ? []
          : await this.prisma.warehouseInventory.findMany({
              where: { id: { in: ids } },
              include,
            });
      // Giữ đúng thứ tự quantity ASC của raw query
      const order = new Map(ids.map((id, i) => [id, i]));
      data.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      const total = Number(counted[0]?.total ?? 0);
      return {
        data,
        meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
      };
    }

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (variantId) where.variantId = variantId;
    if (productId) where.variant = { ...(where.variant || {}), productId };
    // Search by SKU
    if (search) {
      where.variant = {
        ...(where.variant || {}),
        sku: { contains: search, mode: 'insensitive' },
      };
    }

    // Phân trang ở DB (trước đây đổ toàn bộ bảng vào RAM rồi mới slice)
    const [data, total] = await Promise.all([
      this.prisma.warehouseInventory.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.warehouseInventory.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async getLowStockItems(warehouseId?: string) {
    // Chuỗi rỗng nội suy trực tiếp vào $queryRaw sẽ thành tham số $1 lạc lõng
    // gây lỗi syntax - phải dựng điều kiện bằng Prisma.sql / Prisma.join.
    const conds: any[] = [Prisma.sql`wi.quantity <= wi."minQuantity"`];
    if (warehouseId) conds.push(Prisma.sql`wi."warehouseId" = ${warehouseId}`);

    // Get items where quantity <= minQuantity
    return this.prisma.$queryRaw`
      SELECT wi.*, w.name as "warehouseName", w.code as "warehouseCode", v.sku, v.price,
             p.id as "productId", p.name as "productName"
      FROM "WarehouseInventory" wi
      JOIN "Warehouse" w ON w.id = wi."warehouseId"
      JOIN "Variant" v ON v.id = wi."variantId"
      JOIN "Product" p ON p.id = v."productId"
      WHERE ${Prisma.join(conds, ' AND ')}
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
        purchaseOrder: { select: { id: true, code: true, status: true } },
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, images: { take: 1 } } },
              },
            },
            pallet: { select: { id: true, code: true, location: true } },
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

    // Phiếu nhập link PO: PO phải ở trạng thái cho nhận + cùng kho nhận
    let purchaseOrder: any = null;
    if ((dto as any).purchaseOrderId) {
      if (dto.type !== 'IMPORT') {
        throw new BadRequestException('Chỉ phiếu nhập kho mới được link Purchase Order');
      }
      purchaseOrder = await this.prisma.purchaseOrder.findUnique({
        where: { id: (dto as any).purchaseOrderId },
        include: { items: true },
      });
      if (!purchaseOrder) throw new BadRequestException('Purchase Order không tồn tại');
      if (!['SENT', 'PARTIAL'].includes(purchaseOrder.status)) {
        throw new BadRequestException(`PO ${purchaseOrder.code} đang ở trạng thái ${purchaseOrder.status}, không nhận hàng được`);
      }
      if (purchaseOrder.warehouseId !== dto.warehouseId) {
        throw new BadRequestException('Kho nhận của phiếu phải trùng kho nhận của PO');
      }
    }

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
        purchaseOrderId: (dto as any).purchaseOrderId,
        notes: dto.notes,
        totalAmount,
        createdBy,
        items: {
          create: dto.items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            // Mặc định số đặt = số thực nhận (đối chiếu sau ở bước QC/duyệt)
            orderedQty: (item as any).orderedQty ?? item.quantity,
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

    const type = movement.type as any;
    const destWarehouseId: string | undefined = movement.toWarehouseId || undefined;
    const isTransfer = type === 'TRANSFER_OUT' && !!destWarehouseId;

    // Validate chuyển kho trước khi đụng DB
    if (type === 'TRANSFER_OUT') {
      if (!destWarehouseId) {
        throw new BadRequestException('Phiếu chuyển kho đi phải chọn kho nhận');
      }
      if (destWarehouseId === movement.warehouseId) {
        throw new BadRequestException('Kho nhận phải khác kho xuất');
      }
    }

    // Update inventory based on movement type
    await this.prisma.$transaction(async (tx) => {
      for (const item of movement.items) {
        const qty = item.quantity;
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new BadRequestException(
            `Số lượng dòng ${item.variant?.sku || item.variantId} phải là số nguyên dương`
          );
        }
        const quantityChange = this.getQuantityChange(type, qty);

        if (isTransfer && destWarehouseId) {
          // Chuyển kho nội bộ: trừ kho nguồn, cộng kho đích, TỔNG Variant.stock
          // giữ nguyên (bản cũ trừ cả tổng nên tồn tổng bị hụt dần mỗi lần chuyển).
          // Sổ lô giữ nguyên theo (hàng + HSD đi nguyên sang kho đích).
          await this.decreaseStock(tx, movement.warehouseId, item, qty, false);
          await this.increaseStock(tx, destWarehouseId, item.variantId, qty);
        } else if (type === 'IMPORT') {
          // Nhập kho Nấc 2: chỉ cộng số ĐẠT QC (mặc định = toàn bộ thực nhận
          // nếu chưa QC riêng), kèm vị trí kệ + pallet khi put-away.
          const passed = (item as any).qcPassedQty ?? qty;
          const failed = (item as any).qcFailedQty ?? 0;
          if (passed < 0 || failed < 0 || passed + failed > qty) {
            throw new BadRequestException(
              `SKU ${item.variant?.sku || item.variantId}: đạt (${passed}) + lỗi (${failed}) ` +
              `vượt số thực nhận (${qty}). Hãy QC lại trước khi duyệt.`
            );
          }
          if (passed > 0) {
            // Nấc 3: nhập theo lô (tìm theo mã hoặc tự tạo) + serial
            const lotId = await this.resolveImportLot(tx, movement as any, item as any, passed);
            await this.increaseStock(tx, movement.warehouseId, item.variantId, passed, {
              location: (item as any).putawayLocation || undefined,
              palletId: (item as any).palletId || undefined,
              lotId: lotId || undefined,
            });
            await tx.variant.update({
              where: { id: item.variantId },
              data: { stock: { increment: passed } },
            });
            if (lotId) {
              await tx.stockMovementItem.update({
                where: { id: (item as any).id },
                data: { lotId },
              });
            }
            await this.createImportSerials(tx, item as any, lotId);
          }
        } else if (type === 'RESERVE' || type === 'RELEASE') {
          // Phiếu giữ/giải phóng thủ công: chỉ động Reserved (kho + tổng),
          // On Hand giữ nguyên nên Available tăng/giảm tương ứng.
          await this.adjustReservation(
            tx,
            movement.warehouseId,
            item.variantId,
            type === 'RESERVE' ? qty : -qty
          );
        } else {
          if (quantityChange < 0) {
            await this.decreaseStock(tx, movement.warehouseId, item, -quantityChange);
          } else if (quantityChange > 0) {
            await this.increaseStock(tx, movement.warehouseId, item.variantId, quantityChange);
          }
          // Tổng tồn variant đổi theo phiếu (trừ chuyển kho đã xử lý riêng ở trên)
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { increment: quantityChange } },
          });
        }
      }

      // Nhập theo PO: cộng dồn thực nhận (số đạt QC) + cập nhật trạng thái PO
      if (type === 'IMPORT' && movement.purchaseOrderId) {
        await this.applyImportToPurchaseOrder(tx, movement as any);
      }

      // Chốt trạng thái QC của phiếu nhập (nếu chưa QC riêng thì coi như đạt hết)
      if (type === 'IMPORT' && (movement as any).qcStatus === 'PENDING') {
        await tx.stockMovement.update({
          where: { id },
          data: { qcStatus: this.summarizeQc(movement.items as any[]) },
        });
      }

      // Update movement status
      await tx.stockMovement.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return this.findStockMovementById(id);
  }

  /**
   * Tăng/giảm tồn đang giữ (Reserved) theo kho + tổng variant.
   * delta > 0 (giữ hàng): chặn khi vượt Available. delta < 0 (xả hàng):
   * kẹp sàn 0 để không bao giờ âm.
   */
  private async adjustReservation(tx: any, warehouseId: string, variantId: string, delta: number) {
    if (delta > 0) {
      const row = await tx.warehouseInventory.findUnique({
        where: { warehouseId_variantId: { warehouseId, variantId } },
      });
      const available = Math.max(0, (row?.quantity ?? 0) - (row?.reservedQuantity ?? 0));
      if (available < delta) {
        throw new BadRequestException(
          `Không đủ hàng khả dụng để giữ: SKU ${variantId} tại kho chỉ còn ${available}, cần ${delta}`
        );
      }
      await tx.warehouseInventory.upsert({
        where: { warehouseId_variantId: { warehouseId, variantId } },
        update: { reservedQuantity: { increment: delta } },
        create: { warehouseId, variantId, quantity: 0, reservedQuantity: delta },
      });
      await tx.variant.update({
        where: { id: variantId },
        data: { reservedQuantity: { increment: delta } },
      });
    } else if (delta < 0) {
      const qty = -delta;
      await tx.$executeRaw`
        UPDATE "WarehouseInventory"
        SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${qty}),
            "updatedAt" = NOW()
        WHERE "warehouseId" = ${warehouseId} AND "variantId" = ${variantId}
      `;
      await tx.$executeRaw`
        UPDATE "Variant"
        SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${qty}),
            "updatedAt" = NOW()
        WHERE "id" = ${variantId}
      `;
    }
  }

  /** Trừ tồn kho nguồn, chặn xuất quá số đang có (kể cả khi chưa có dòng tồn). */
  private async decreaseStock(
    tx: any,
    warehouseId: string,
    item: any,
    qty: number,
    consumeLots = true,
  ) {
    const row = await tx.warehouseInventory.findUnique({
      where: { warehouseId_variantId: { warehouseId, variantId: item.variantId } },
    });
    const available = Math.max(0, (row?.quantity ?? 0) - (row?.reservedQuantity ?? 0));
    if (available < qty) {
      throw new BadRequestException(
        `Không đủ hàng để xuất: SKU ${item.variant?.sku || item.variantId} tại kho ` +
        `chỉ còn ${available}, cần ${qty}`
      );
    }
    await tx.warehouseInventory.update({
      where: { warehouseId_variantId: { warehouseId, variantId: item.variantId } },
      data: { quantity: { decrement: qty } },
    });
    // Xuất bán/hủy thì trừ sổ lô theo FEFO (HSD gần trước). Chuyển kho nội bộ
    // giữ nguyên sổ lô (hàng + HSD đi nguyên sang kho đích).
    if (consumeLots) {
      await this.consumeLotsFEFO(tx, item.variantId, warehouseId, qty);
    }
  }

  /** Cộng dồn thực nhận vào PO + cập nhật trạng thái PO sau khi duyệt nhập. */
  private async applyImportToPurchaseOrder(tx: any, movement: any) {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: movement.purchaseOrderId },
      include: { items: true },
    });
    if (!po || po.status === 'CANCELLED' || po.status === 'COMPLETED') return;

    for (const item of movement.items as any[]) {
      const passed = item.qcPassedQty ?? item.quantity;
      if (passed <= 0) continue;
      const poItem = po.items.find((i: any) => i.variantId === item.variantId);
      if (!poItem) continue;
      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { receivedQty: { increment: passed } },
      });
    }

    const updated = await tx.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });
    const allDone = updated.items.every((i: any) => i.receivedQty >= i.orderedQty);
    const someDone = updated.items.some((i: any) => i.receivedQty > 0);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: allDone ? 'COMPLETED' : someDone ? 'PARTIAL' : updated.status },
    });
  }

  /** Chuẩn hóa danh sách serial (mảng hoặc chuỗi nhiều dòng/phẩy/chấm phẩy), tối đa 500. */
  private normalizeSerials(input: unknown): string[] {
    const list: string[] = Array.isArray(input)
      ? input.map((s) => String(s).trim())
      : typeof input === 'string'
        ? input.split(/[\n,;]+/).map((s) => s.trim())
        : [];
    return [...new Set(list.filter(Boolean))].slice(0, 500);
  }

  private parseDateOnly(input: unknown, label: string): Date | undefined {
    if (input == null || input === '') return undefined;
    const d = new Date(input as any);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
    return d;
  }

  /**
   * Giải quyết lô cho dòng nhập: có mã lô -> dùng lô đó (tạo nếu chưa có),
   * chỉ có HSD/NSX -> tự sinh mã LOT-YYYY-NNNN. Cộng số đạt vào lô.
   */
  private async resolveImportLot(tx: any, movement: any, item: any, passedQty: number): Promise<string | null> {
    const lotCode = ((item as any).lotCode || '').trim();
    const mfg = (item as any).mfgDate ? new Date((item as any).mfgDate) : undefined;
    const exp = (item as any).expiryDate ? new Date((item as any).expiryDate) : undefined;
    if (!lotCode && !exp && !mfg) return null; // nhập lẻ không theo lô

    if (lotCode) {
      const existing = await tx.lot.findUnique({ where: { code: lotCode } });
      if (existing) {
        if (existing.variantId !== item.variantId) {
          throw new BadRequestException(`Mã lô "${lotCode}" đang thuộc biến thể khác`);
        }
        await tx.lot.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: passedQty },
            initialQty: { increment: passedQty },
            status: 'ACTIVE',
            ...(exp ? { expiryDate: exp } : {}),
            ...(mfg ? { mfgDate: mfg } : {}),
          },
        });
        return existing.id;
      }
    }
    const code = lotCode || (await this.nextLotCode(tx));
    const created = await tx.lot.create({
      data: {
        code,
        variantId: item.variantId,
        warehouseId: movement.warehouseId,
        supplierId: movement.supplierId ?? undefined,
        quantity: passedQty,
        initialQty: passedQty,
        mfgDate: mfg,
        expiryDate: exp,
        status: 'ACTIVE',
      },
    });
    return created.id;
  }

  private async nextLotCode(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.lot.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    return `LOT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /** Tạo serial IN_STOCK cho số đạt (bỏ trùng có sẵn). */
  private async createImportSerials(tx: any, item: any, lotId: string | null) {
    const list = this.normalizeSerials((item as any).serials);
    if (list.length === 0) return;
    await tx.serialNumber.createMany({
      data: list.map((serial) => ({
        serial,
        variantId: item.variantId,
        lotId,
        status: 'IN_STOCK',
      })),
      skipDuplicates: true,
    });
  }

  /** Tổng hợp trạng thái QC cả phiếu từ từng dòng. */
  private summarizeQc(items: any[]): string {
    let allPassed = true;
    let allFailed = true;
    for (const item of items) {
      const passed = item.qcPassedQty ?? item.quantity;
      const failed = item.qcFailedQty ?? 0;
      if (!(passed === item.quantity && failed === 0)) allPassed = false;
      if (passed !== 0) allFailed = false;
    }
    return allPassed ? 'PASSED' : allFailed ? 'FAILED' : 'PARTIAL';
  }

  /**
   * Trừ sổ lô theo FEFO: lô HSD gần nhất (null = không HSD xếp sau cùng).
   * Chỉ trừ trong phạm vi sổ lô hiện có; phần còn lại coi như hàng lẻ legacy.
   */
  private async consumeLotsFEFO(tx: any, variantId: string, warehouseId: string, qty: number) {
    const lots = await tx.lot.findMany({
      where: { variantId, warehouseId, quantity: { gt: 0 }, status: { not: 'BLOCKED' } },
    });
    if (lots.length === 0) return;
    lots.sort((a: any, b: any) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
    let need = qty;
    for (const lot of lots) {
      if (need <= 0) break;
      const take = Math.min(lot.quantity, need);
      const left = lot.quantity - take;
      await tx.lot.update({
        where: { id: lot.id },
        data: { quantity: left, status: left === 0 ? 'EXHAUSTED' : undefined },
      });
      need -= take;
    }
  }

  /** Cộng tồn kho (tự tạo dòng nếu chưa có). Kèm vị trí kệ + pallet + lô khi put-away. */
  private async increaseStock(
    tx: any,
    warehouseId: string,
    variantId: string,
    qty: number,
    extra?: { location?: string; palletId?: string; lotId?: string },
  ) {
    const putaway: any = {};
    if (extra?.location) putaway.location = extra.location;
    if (extra?.palletId) putaway.palletId = extra.palletId;
    if (extra?.lotId) putaway.lotId = extra.lotId;
    await tx.warehouseInventory.upsert({
      where: { warehouseId_variantId: { warehouseId, variantId } },
      update: { quantity: { increment: qty }, ...putaway },
      create: { warehouseId, variantId, quantity: qty, ...putaway },
    });
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

  // ============== PURCHASE ORDER (Nấc 2) ==============

  async createPurchaseOrder(dto: any, createdBy: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier || !supplier.isActive) {
      throw new BadRequestException('Nhà cung cấp không tồn tại hoặc đã ngưng');
    }
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException('Kho nhận không tồn tại hoặc đã ngưng');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('PO phải có ít nhất 1 mặt hàng');
    }
    const variantIds = dto.items.map((i: any) => i.variantId);
    const variants = await this.prisma.variant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, sku: true },
    });
    if (variants.length !== new Set(variantIds).size) {
      throw new BadRequestException('Có variantId không tồn tại trong PO');
    }

    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({
      where: {
        createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      },
    });
    const code = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

    let totalAmount = BigInt(0);
    for (const item of dto.items) {
      if (!Number.isInteger(item.orderedQty) || item.orderedQty <= 0) {
        throw new BadRequestException('Số lượng đặt phải là số nguyên dương');
      }
      if (item.unitPrice != null) {
        totalAmount += BigInt(Math.round(Number(item.unitPrice))) * BigInt(item.orderedQty);
      }
    }

    const po = await this.prisma.purchaseOrder.create({
      data: {
        code,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        notes: dto.notes,
        totalAmount: totalAmount > 0 ? totalAmount : undefined,
        createdBy,
        items: {
          create: dto.items.map((item: any) => ({
            variantId: item.variantId,
            orderedQty: item.orderedQty,
            unitPrice: item.unitPrice != null ? BigInt(Math.round(Number(item.unitPrice))) : undefined,
            notes: item.notes,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: { include: { variant: { select: { id: true, sku: true, product: { select: { id: true, name: true } } } } } },
      },
    });

    return { ...po, totalAmount: po.totalAmount ? Number(po.totalAmount) : 0 };
  }

  async findAllPurchaseOrders(query: any) {
    const { status, supplierId, warehouseId, search, page = 1, limit = 20 } = query;
    const take = Math.min(100, Math.max(1, Number(limit) || 20));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (search) where.code = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true, movements: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: data.map((po) => ({ ...po, totalAmount: po.totalAmount ? Number(po.totalAmount) : 0 })),
      meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findPurchaseOrderById(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                price: true,
                product: { select: { id: true, name: true, images: { take: 1 } } },
              },
            },
          },
        },
        movements: {
          select: { id: true, code: true, type: true, status: true, qcStatus: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    return {
      ...po,
      totalAmount: po.totalAmount ? Number(po.totalAmount) : 0,
      items: po.items.map((item: any) => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        variant: item.variant ? { ...item.variant, price: Number(item.variant.price) } : item.variant,
      })),
    };
  }

  async sendPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ gửi được PO đang ở nháp');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' as any },
    });
  }

  async sendPurchaseOrderEmail(id: string) {
    const po: any = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: { select: { id: true, name: true, code: true, address: true, phone: true } },
        items: {
          include: {
            variant: {
              select: { id: true, sku: true, product: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    if (!po.supplier?.email) {
      throw new BadRequestException('Nhà cung cấp chưa có email, không gửi được');
    }
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env as any;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new BadRequestException(
        'Chưa cấu hình SMTP (thiếu SMTP_HOST / SMTP_USER / SMTP_PASS trong server/.env)'
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer');
    const port = Number(SMTP_PORT) || 587;
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const fmt = (n: any) =>
      new Intl.NumberFormat('vi-VN').format(Number(n || 0)) + 'đ';
    const rows = po.items
      .map(
        (item: any, idx: number) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${idx + 1}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${item.variant?.product?.name || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;">${item.variant?.sku || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${item.orderedQty}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${item.unitPrice != null ? fmt(item.unitPrice) : '-'}</td>
        </tr>`,
      )
      .join('');
    const total = po.items.reduce(
      (s: number, i: any) => s + Number(i.unitPrice || 0) * i.orderedQty,
      0,
    );

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#222;">
        <h2 style="color:#c53b00;">Đơn đặt hàng ${po.code} - MegaMart</h2>
        <p>Kính gửi <strong>${po.supplier.name}</strong>,</p>
        <p>MegaMart đặt hàng như sau. Vui lòng xác nhận và báo ngày giao dự kiến.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr style="background:#f5f5f5;">
            <th style="padding:8px;border:1px solid #e5e7eb;">#</th>
            <th style="padding:8px;border:1px solid #e5e7eb;">Sản phẩm</th>
            <th style="padding:8px;border:1px solid #e5e7eb;">SKU</th>
            <th style="padding:8px;border:1px solid #e5e7eb;">SL đặt</th>
            <th style="padding:8px;border:1px solid #e5e7eb;">Giá nhập</th>
          </tr>
          ${rows}
        </table>
        <p><strong>Tạm tính:</strong> ${fmt(total)}</p>
        <p>
          Giao tới: <strong>${po.warehouse?.name} (${po.warehouse?.code})</strong><br>
          ${po.warehouse?.address || ''} ${po.warehouse?.phone ? ' - ' + po.warehouse.phone : ''}<br>
          ${po.expectedDate ? `Mong nhận trước: <strong>${new Date(po.expectedDate).toLocaleDateString('vi-VN')}</strong><br>` : ''}
          ${po.notes ? `Ghi chú: ${po.notes}<br>` : ''}
        </p>
        <p>Trân trọng,<br><strong>MegaMart - Phòng mua hàng</strong></p>
      </div>`;

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: po.supplier.email,
      subject: `[MegaMart] Đơn đặt hàng ${po.code}`,
      html,
    });

    return { success: true, to: po.supplier.email, code: po.code };
  }

  async cancelPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    if (po.status === 'COMPLETED') {
      throw new BadRequestException('Không thể hủy PO đã nhập đủ');
    }
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('PO đã bị hủy');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
    });
  }

  // ============== SUPPLIER PORTAL (role NCC, chỉ thấy PO của mình) ==============

  async getSupplierProfile(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, code: true, email: true, phone: true, contactName: true },
    });
    if (!supplier) throw new NotFoundException('Không tìm thấy nhà cung cấp');
    const [openPos, totalPos] = await Promise.all([
      this.prisma.purchaseOrder.count({
        where: { supplierId, status: { in: ['SENT', 'PARTIAL'] } },
      }),
      this.prisma.purchaseOrder.count({ where: { supplierId } }),
    ]);
    return { ...supplier, openPurchaseOrders: openPos, totalPurchaseOrders: totalPos };
  }

  async findSupplierPurchaseOrders(
    supplierId: string,
    query: { status?: string; page?: number; limit?: number },
  ) {
    const take = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const currentPage = Math.max(1, Number(query.page) || 1);
    const skip = (currentPage - 1) * take;

    const where: any = { supplierId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: data.map((po) => ({ ...po, totalAmount: po.totalAmount ? Number(po.totalAmount) : 0 })),
      meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findSupplierPurchaseOrder(supplierId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, supplierId },
      include: {
        supplier: { select: { id: true, name: true, code: true, address: true } },
        warehouse: { select: { id: true, name: true, code: true, address: true } },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { id: true, name: true, images: { take: 1 } } },
              },
            },
          },
        },
      },
    });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    return {
      ...po,
      totalAmount: po.totalAmount ? Number(po.totalAmount) : 0,
      items: po.items.map((item: any) => ({
        ...item,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      })),
    };
  }

  async confirmPurchaseOrder(supplierId: string, id: string, body: { expectedDate?: string; note?: string }) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, supplierId } });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    if (po.status !== 'SENT') {
      throw new BadRequestException('Chỉ xác nhận được PO vừa được gửi');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        confirmedAt: new Date(),
        confirmedNote: body?.note,
        ...(body?.expectedDate ? { expectedDate: new Date(body.expectedDate) } : {}),
      },
    });
  }

  // ============== SHARED SHIPMENT PROGRESS (xe giao, share admin <-> NCC) ==============

  async updateShipmentProgress(po: any, progress: number) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
    return this.prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        shipmentProgress: pct,
        shipmentStatus: pct >= 100 ? 'ARRIVED' : pct > 0 ? 'TRANSIT' : 'IDLE',
        shipmentUpdatedAt: new Date(),
      },
    });
  }

  async updateSupplierShipment(supplierId: string, id: string, progress: number) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id, supplierId } });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    if (po.status !== 'SENT' && po.status !== 'PARTIAL') {
      throw new BadRequestException('Chỉ cập nhật hành trình cho PO đang giao');
    }
    return this.updateShipmentProgress(po, progress);
  }

  async updateAdminShipment(id: string, progress: number) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Không tìm thấy PO');
    if (po.status !== 'SENT' && po.status !== 'PARTIAL') {
      throw new BadRequestException('Chỉ cập nhật hành trình cho PO đang giao');
    }
    return this.updateShipmentProgress(po, progress);
  }

  // ============== QC PHIẾU NHẬP (Nấc 2) ==============

  /**
   * Ghi nhận kết quả QC cho phiếu nhập PENDING: từng dòng đạt/lỗi bao nhiêu,
   * ghi chú kiểm hàng, vị trí kệ + pallet xếp hàng. Chưa cộng tồn ở bước này.
   */
  async updateMovementQc(id: string, dto: any) {
    const movement = await this.findStockMovementById(id);
    if (movement.status !== 'PENDING') {
      throw new BadRequestException('Chỉ QC được phiếu đang chờ duyệt');
    }
    if ((movement.type as any) !== 'IMPORT') {
      throw new BadRequestException('QC chỉ áp dụng cho phiếu nhập kho');
    }

    const byVariant = new Map((dto.items || []).map((i: any) => [i.variantId, i]));
    let allPassed = true;
    let allFailed = true;

    for (const item of movement.items as any[]) {
      const qc = byVariant.get(item.variantId) as any;
      if (!qc) continue;
      const passed = Number(qc.qcPassedQty ?? item.quantity);
      const failed = Number(qc.qcFailedQty ?? 0);
      if (!Number.isInteger(passed) || passed < 0 || !Number.isInteger(failed) || failed < 0) {
        throw new BadRequestException(`Số lượng QC của SKU ${item.variant?.sku} phải là số nguyên >= 0`);
      }
      if (passed + failed > item.quantity) {
        throw new BadRequestException(
          `SKU ${item.variant?.sku}: đạt (${passed}) + lỗi (${failed}) vượt số thực nhận (${item.quantity})`
        );
      }
      if (qc.palletId) {
        const pallet = await this.prisma.pallet.findUnique({ where: { id: qc.palletId } });
        if (!pallet || pallet.warehouseId !== movement.warehouseId) {
          throw new BadRequestException(`Pallet không thuộc kho ${movement.warehouse?.name || ''}`);
        }
      }
      const serials = this.normalizeSerials(qc.serials);
      await this.prisma.stockMovementItem.updateMany({
        where: { stockMovementId: id, variantId: item.variantId },
        data: {
          qcPassedQty: passed,
          qcFailedQty: failed,
          qcNote: qc.qcNote ?? undefined,
          putawayLocation: qc.putawayLocation ?? undefined,
          palletId: qc.palletId ?? undefined,
          lotCode: (qc.lotCode || '').trim() || undefined,
          mfgDate: this.parseDateOnly(qc.mfgDate, `NSX (SKU ${item.variant?.sku || item.variantId})`),
          expiryDate: this.parseDateOnly(qc.expiryDate, `HSD (SKU ${item.variant?.sku || item.variantId})`),
          serials: serials.length > 0 ? serials : undefined,
        },
      });
      const exp = this.parseDateOnly(qc.expiryDate, 'HSD');
      const mfg = this.parseDateOnly(qc.mfgDate, 'NSX');
      if (exp && mfg && exp <= mfg) {
        throw new BadRequestException(
          `SKU ${item.variant?.sku || item.variantId}: HSD phải sau NSX`
        );
      }
      if (!(passed === item.quantity && failed === 0)) allPassed = false;
      if (passed !== 0) allFailed = false;
    }

    const qcStatus = allPassed ? 'PASSED' : allFailed ? 'FAILED' : 'PARTIAL';
    await this.prisma.stockMovement.update({ where: { id }, data: { qcStatus } });
    return this.findStockMovementById(id);
  }

  // ============== PALLET (Nấc 2, gọn nhẹ) ==============

  async findAllPallets(warehouseId?: string) {
    return this.prisma.pallet.findMany({
      where: warehouseId ? { warehouseId } : {},
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        boxes: {
          select: {
            id: true,
            boxCode: true,
            level: true,
            quantity: true,
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { id: true, name: true, images: { take: 1 } } },
              },
            },
          },
        },
        _count: { select: { movementItems: true, inventories: true, boxes: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createPallet(dto: any) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } });
    if (!warehouse || !warehouse.isActive) {
      throw new BadRequestException('Kho không tồn tại hoặc đã ngưng');
    }
    try {
      return await this.prisma.pallet.create({
        data: {
          code: dto.code,
          warehouseId: dto.warehouseId,
          location: dto.location,
          notes: dto.notes,
          maxLevels: dto.maxLevels ?? undefined,
          maxWeight: dto.maxWeight ?? undefined,
          maxVolume: dto.maxVolume ?? undefined,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException(`Mã pallet "${dto.code}" đã tồn tại`);
      }
      throw e;
    }
  }

  async updatePallet(id: string, dto: any) {
    const pallet = await this.prisma.pallet.findUnique({ where: { id } });
    if (!pallet) throw new NotFoundException('Không tìm thấy pallet');
    const data: any = {};
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.maxWeight !== undefined) data.maxWeight = dto.maxWeight == null ? null : Number(dto.maxWeight);
    if (dto.maxVolume !== undefined) data.maxVolume = dto.maxVolume == null ? null : Number(dto.maxVolume);
    if (dto.qcStatus !== undefined) data.qcStatus = dto.qcStatus;
    if (dto.qcNote !== undefined) data.qcNote = dto.qcNote;
    if (dto.status !== undefined) {
      if (!['ACTIVE', 'EMPTY', 'LOCKED'].includes(dto.status)) {
        throw new BadRequestException('Trạng thái pallet không hợp lệ');
      }
      data.status = dto.status;
    }
    return this.prisma.pallet.update({ where: { id }, data });
  }

  async getPalletById(id: string) {
    const pallet = await this.prisma.pallet.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        boxes: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { id: true, name: true, images: { take: 1 } } },
              },
            },
          },
          orderBy: [{ level: 'desc' }, { boxCode: 'asc' }],
        },
        _count: { select: { movementItems: true, inventories: true } },
      },
    });
    if (!pallet) throw new NotFoundException('Không tìm thấy pallet');
    const boxes = (pallet as any).boxes || [];
    const boxVolume = (b: any) =>
      b.volume ?? (b.length && b.width && b.height ? (b.length * b.width * b.height) / 1e9 : 0);
    const totalWeight = boxes.reduce(
      (s: number, b: any) => s + Number(b.netWeight ?? 0) + Number(b.tareWeight ?? 0), 0,
    );
    const totalVolume = boxes.reduce((s: number, b: any) => s + Number(boxVolume(b) ?? 0), 0);
    const maxWeight = (pallet as any).maxWeight ?? 500;
    const maxVolume = (pallet as any).maxVolume ?? 1.8;
    const levelsUsed = new Set(boxes.map((b: any) => b.level)).size;
    const skuCount = new Set(boxes.map((b: any) => b.variantId).filter(Boolean)).size;
    return {
      ...pallet,
      stats: {
        boxCount: boxes.length,
        totalWeight: Math.round(totalWeight * 10) / 10,
        weightPercent: maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 1000) / 10 : 0,
        totalVolume: Math.round(totalVolume * 100) / 100,
        volumePercent: maxVolume > 0 ? Math.round((totalVolume / maxVolume) * 1000) / 10 : 0,
        levelsUsed,
        maxLevels: (pallet as any).maxLevels ?? 4,
        skuCount,
      },
    };
  }

  /**
   * Di dời thùng sang pallet khác (cập nhật trực tiếp, chưa sinh phiếu kiểm toán).
   * Validate: pallet đích tồn tại, không LOCKED, tầng hợp lệ, không vượt tải.
   */
  async transferPalletBox(boxId: string, toPalletId: string, targetLevel: number, userId?: string) {
    const box = await this.prisma.palletBox.findUnique({ where: { id: boxId } });
    if (!box) throw new NotFoundException('Không tìm thấy thùng');
    const src = await this.prisma.pallet.findUnique({ where: { id: box.palletId } });
    if (src?.status === 'LOCKED') throw new BadRequestException('Pallet nguồn đang khóa, không di dời được');
    const dest = await this.prisma.pallet.findUnique({
      where: { id: toPalletId },
      include: { boxes: { select: { id: true, boxCode: true, netWeight: true, tareWeight: true } } },
    });
    if (!dest) throw new NotFoundException('Không tìm thấy pallet đích');
    if (dest.status === 'LOCKED') throw new BadRequestException('Pallet đích đang khóa');
    if (src && src.warehouseId !== dest.warehouseId) {
      throw new BadRequestException('Không di dời thùng giữa 2 kho khác nhau (cần lập phiếu chuyển kho)');
    }
    const level = Number(targetLevel);
    if (!Number.isInteger(level) || level < 1 || level > dest.maxLevels) {
      throw new BadRequestException(`Tầng đích phải từ 1 đến ${dest.maxLevels}`);
    }
    if (dest.boxes.some((b) => b.boxCode === box.boxCode && b.id !== box.id)) {
      throw new BadRequestException(`Pallet đích đã có thùng mã "${box.boxCode}"`);
    }
    const boxWeight = (b: any) => Number(b.netWeight ?? 0) + Number(b.tareWeight ?? 0);
    if (boxWeight(box) > 0 && dest.maxWeight) {
      // Loại chính thùng đang chuyển khi di dời nội bộ cùng pallet
      const othersWeight = dest.boxes.filter((b) => b.id !== box.id).reduce((s, b) => s + boxWeight(b), 0);
      if (othersWeight + boxWeight(box) > dest.maxWeight) {
        throw new BadRequestException(`Vượt tải trọng pallet đích (${othersWeight + boxWeight(box)}/${dest.maxWeight} kg)`);
      }
    }
    const fromPalletId = box.palletId;
    const updated = await this.prisma.palletBox.update({
      where: { id: boxId },
      data: { palletId: toPalletId, level },
    });
    await this.auditLogService.log(
      AuditAction.PALLET_BOX_TRANSFER,
      AuditEntity.PALLET,
      userId,
      toPalletId,
      { boxId, boxCode: box.boxCode, fromPalletId, toPalletId, level },
    );
    return updated;
  }

  /** Lịch sử thao tác của pallet (đọc từ nhật ký hệ thống). */
  async getPalletHistory(palletId: string, limit = 20) {
    return this.prisma.auditLog.findMany({
      where: { entity: AuditEntity.PALLET, entityId: palletId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, Number(limit) || 20)),
    });
  }

  // ============== PALLET BOX (thùng theo tầng) ==============

  async createPalletBox(palletId: string, dto: any, userId?: string) {
    const pallet = await this.prisma.pallet.findUnique({
      where: { id: palletId },
      include: { boxes: { select: { id: true, boxCode: true } } },
    });
    if (!pallet) throw new NotFoundException('Không tìm thấy pallet');
    if (pallet.status === 'LOCKED') {
      throw new BadRequestException('Pallet đang khóa, không thêm thùng được');
    }
    const level = Number(dto.level) || 1;
    if (level < 1 || level > pallet.maxLevels) {
      throw new BadRequestException(`Tầng phải từ 1 đến ${pallet.maxLevels}`);
    }
    if (dto.variantId) {
      const variant = await this.prisma.variant.findUnique({ where: { id: dto.variantId } });
      if (!variant) throw new BadRequestException('Biến thể không tồn tại');
    }
    // Tự sinh mã theo số thứ tự lớn nhất hiện có (tránh trùng khi đã xóa thùng giữa chừng)
    const maxNo = pallet.boxes.reduce((m, b) => {
      const n = parseInt((b.boxCode.match(/\d+$/) || ['0'])[0], 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    const boxCode =
      dto.boxCode?.trim() ||
      `${pallet.code}-T${level}-B${String(maxNo + 1).padStart(2, '0')}`;
    const numOrNull = (v: any) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    try {
      const created = await this.prisma.palletBox.create({
        data: {
          palletId,
          boxCode,
          level,
          variantId: dto.variantId || undefined,
          quantity: Math.max(0, Number(dto.quantity) || 0),
          notes: dto.notes,
          tareWeight: numOrNull(dto.tareWeight) ?? undefined,
          netWeight: numOrNull(dto.netWeight) ?? undefined,
          length: numOrNull(dto.length) ?? undefined,
          width: numOrNull(dto.width) ?? undefined,
          height: numOrNull(dto.height) ?? undefined,
          volume: numOrNull(dto.volume) ?? undefined,
          barcode: dto.barcode || undefined,
          poNumber: dto.poNumber || undefined,
          exportPurpose: dto.exportPurpose || undefined,
          exportTicketCode: dto.exportTicketCode || undefined,
          sealedBy: dto.sealedBy || undefined,
          slotIndex: dto.slotIndex !== undefined && dto.slotIndex !== null ? Number(dto.slotIndex) : undefined,
        },
        include: {
          variant: {
            select: { id: true, sku: true, product: { select: { id: true, name: true } } },
          },
        },
      });
      await this.auditLogService.log(
        AuditAction.PALLET_BOX_CREATE,
        AuditEntity.PALLET,
        userId,
        palletId,
        { boxId: created.id, boxCode: created.boxCode, level: created.level },
      );
      return created;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException(`Mã thùng "${boxCode}" đã tồn tại trên pallet này`);
      }
      throw e;
    }
  }

  async updatePalletBox(palletId: string, boxId: string, dto: any) {
    const box = await this.prisma.palletBox.findFirst({ where: { id: boxId, palletId } });
    if (!box) throw new NotFoundException('Không tìm thấy thùng');
    const data: any = {};
    if (dto.level !== undefined) {
      const level = Number(dto.level);
      const pallet = await this.prisma.pallet.findUnique({ where: { id: palletId } });
      if (!Number.isInteger(level) || level < 1 || (pallet && level > pallet.maxLevels)) {
        throw new BadRequestException(`Tầng phải từ 1 đến ${pallet?.maxLevels ?? '?'}`);
      }
      data.level = level;
    }
    if (dto.quantity !== undefined) {
      const qty = Number(dto.quantity);
      if (!Number.isInteger(qty) || qty < 0) {
        throw new BadRequestException('Số lượng thùng phải là số nguyên >= 0');
      }
      data.quantity = qty;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    for (const key of ['tareWeight','netWeight','length','width','height','volume'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] == null || dto[key] === '' ? null : Number(dto[key]);
    }
    for (const key of ['barcode','poNumber','exportPurpose','exportTicketCode','sealedBy'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] || null;
    }
    if (dto.slotIndex !== undefined) data.slotIndex = dto.slotIndex == null ? null : Number(dto.slotIndex);
    if (dto.variantId !== undefined) {
      if (dto.variantId) {
        const variant = await this.prisma.variant.findUnique({ where: { id: dto.variantId } });
        if (!variant) throw new BadRequestException('Biến thể không tồn tại');
        data.variantId = dto.variantId;
      } else {
        data.variantId = null;
      }
    }
    return this.prisma.palletBox.update({ where: { id: boxId }, data });
  }

  async deletePalletBox(palletId: string, boxId: string, userId?: string) {
    const box = await this.prisma.palletBox.findFirst({ where: { id: boxId, palletId } });
    if (!box) throw new NotFoundException('Không tìm thấy thùng');
    await this.prisma.palletBox.delete({ where: { id: boxId } });
    await this.auditLogService.log(
      AuditAction.PALLET_BOX_DELETE,
      AuditEntity.PALLET,
      userId,
      palletId,
      { boxId, boxCode: box.boxCode },
    );
    return { success: true };
  }

  // ============== LOT (Nấc 3) ==============

  async createLot(dto: any) {
    const variant = await this.prisma.variant.findUnique({ where: { id: dto.variantId } });
    if (!variant) throw new BadRequestException('Biến thể không tồn tại');
    const qty = Math.max(0, Number(dto.quantity) || 0);
    const code = (dto.code || '').trim() || (await this.nextLotCode(this.prisma));
    if (dto.code) {
      const dup = await this.prisma.lot.findUnique({ where: { code } });
      if (dup) throw new BadRequestException(`Mã lô "${code}" đã tồn tại`);
    }
    return this.prisma.lot.create({
      data: {
        code,
        variantId: dto.variantId,
        warehouseId: dto.warehouseId || undefined,
        supplierId: dto.supplierId || undefined,
        quantity: qty,
        initialQty: qty,
        mfgDate: this.parseDateOnly(dto.mfgDate, 'NSX'),
        expiryDate: this.parseDateOnly(dto.expiryDate, 'HSD'),
        notes: dto.notes,
      },
      include: {
        variant: { select: { id: true, sku: true, product: { select: { id: true, name: true } } } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findAllLots(query: any) {
    const { variantId, warehouseId, status, expiry, search } = query;
    const take = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const currentPage = Math.max(1, Number(query.page) || 1);
    const skip = (currentPage - 1) * take;

    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { variant: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (expiry === 'expired') {
      where.expiryDate = { lt: new Date() };
      where.quantity = { gt: 0 };
    } else if (expiry === 'expiring') {
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      where.expiryDate = { gte: new Date(), lte: in30 };
      where.quantity = { gt: 0 };
    }

    const [data, total] = await Promise.all([
      this.prisma.lot.findMany({
        where,
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              product: { select: { id: true, name: true, images: { take: 1 } } },
            },
          },
          warehouse: { select: { id: true, name: true, code: true } },
          _count: { select: { serials: true } },
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.lot.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findLotById(id: string) {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: {
        variant: {
          select: { id: true, sku: true, product: { select: { id: true, name: true } } },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        supplier: { select: { id: true, name: true, code: true } },
        serials: { take: 200, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lot) throw new NotFoundException('Không tìm thấy lô');
    return lot;
  }

  async updateLot(id: string, dto: any) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException('Không tìm thấy lô');
    const data: any = {};
    if (dto.quantity !== undefined) {
      const qty = Number(dto.quantity);
      if (!Number.isInteger(qty) || qty < 0) {
        throw new BadRequestException('Tồn lô phải là số nguyên >= 0');
      }
      data.quantity = qty;
      if (qty === 0 && lot.status === 'ACTIVE') data.status = 'EXHAUSTED';
    }
    if (dto.mfgDate !== undefined) data.mfgDate = this.parseDateOnly(dto.mfgDate, 'NSX');
    if (dto.expiryDate !== undefined) data.expiryDate = this.parseDateOnly(dto.expiryDate, 'HSD');
    if (data.expiryDate && data.mfgDate && data.expiryDate <= data.mfgDate) {
      throw new BadRequestException('HSD phải sau NSX');
    }
    if (dto.status !== undefined) {
      if (!['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'BLOCKED'].includes(dto.status)) {
        throw new BadRequestException('Trạng thái lô không hợp lệ');
      }
      data.status = dto.status;
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.lot.update({ where: { id }, data });
  }

  /** Tổng quan HSD để gắn banner cảnh báo: quá hạn còn tồn + sắp hết trong 30 ngày. */
  async getExpiryAlerts() {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const [expired, expiring] = await Promise.all([
      this.prisma.lot.findMany({
        where: { expiryDate: { lt: now }, quantity: { gt: 0 }, status: { not: 'BLOCKED' } },
        select: {
          id: true,
          code: true,
          quantity: true,
          expiryDate: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { expiryDate: 'asc' },
        take: 100,
      }),
      this.prisma.lot.findMany({
        where: { expiryDate: { gte: now, lte: in30 }, quantity: { gt: 0 }, status: { not: 'BLOCKED' } },
        select: {
          id: true,
          code: true,
          quantity: true,
          expiryDate: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
          warehouse: { select: { code: true, name: true } },
        },
        orderBy: { expiryDate: 'asc' },
        take: 100,
      }),
    ]);
    return {
      expiredCount: expired.length,
      expiringCount: expiring.length,
      expired,
      expiring,
    };
  }

  // ============== SERIAL (Nấc 3) ==============

  async createSerials(dto: any) {
    const variant = await this.prisma.variant.findUnique({ where: { id: dto.variantId } });
    if (!variant) throw new BadRequestException('Biến thể không tồn tại');
    let lotId: string | undefined;
    if (dto.lotId) {
      const lot = await this.prisma.lot.findUnique({ where: { id: dto.lotId } });
      if (!lot) throw new BadRequestException('Lô không tồn tại');
      if (lot.variantId !== dto.variantId) {
        throw new BadRequestException('Lô thuộc biến thể khác');
      }
      lotId = lot.id;
    }
    const list = this.normalizeSerials(dto.serials);
    if (list.length === 0) throw new BadRequestException('Danh sách serial trống');
    const result = await this.prisma.serialNumber.createMany({
      data: list.map((serial) => ({
        serial,
        variantId: dto.variantId,
        lotId,
        status: 'IN_STOCK',
        notes: dto.notes,
      })),
      skipDuplicates: true,
    });
    return { created: result.count, skipped: list.length - result.count };
  }

  async findAllSerials(query: any) {
    const { variantId, lotId, status, search } = query;
    const take = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const currentPage = Math.max(1, Number(query.page) || 1);
    const skip = (currentPage - 1) * take;

    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (lotId) where.lotId = lotId;
    if (status) where.status = status;
    if (search) where.serial = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.serialNumber.findMany({
        where,
        include: {
          variant: { select: { id: true, sku: true, product: { select: { id: true, name: true } } } },
          lot: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.serialNumber.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: currentPage, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async updateSerial(id: string, dto: any) {
    const serial = await this.prisma.serialNumber.findUnique({ where: { id } });
    if (!serial) throw new NotFoundException('Không tìm thấy serial');
    const data: any = {};
    if (dto.status !== undefined) {
      if (!['IN_STOCK', 'SOLD', 'DEFECTIVE', 'RETURNED'].includes(dto.status)) {
        throw new BadRequestException('Trạng thái serial không hợp lệ');
      }
      data.status = dto.status;
    }
    if (dto.orderId !== undefined) data.orderId = dto.orderId || null;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.serialNumber.update({ where: { id }, data });
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

    // Hàng lẻ chưa xếp pallet + số pallet trong kho (để vẽ sơ đồ kho)
    const [looseItems, palletCount] = await Promise.all([
      this.prisma.warehouseInventory.count({
        where: warehouseId ? { warehouseId, palletId: null } : { palletId: null },
      }),
      this.prisma.pallet.count({
        where: warehouseId ? { warehouseId } : {},
      }),
    ]);

    return {
      totalItems,
      lowStockCount,
      totalValue,
      looseItems,
      palletCount,
    };
  }
}
