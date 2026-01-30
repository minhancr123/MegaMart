import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateAuditLogDto, QueryAuditLogDto } from './dto/audit-log.dto';

export enum AuditAction {
  // Auth
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  
  // User
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  
  // Product
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  
  // Order
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_UPDATE = 'ORDER_UPDATE',
  ORDER_STATUS_CHANGE = 'ORDER_STATUS_CHANGE',
  ORDER_CANCEL = 'ORDER_CANCEL',
  
  // Category
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
  
  // Banner
  BANNER_CREATE = 'BANNER_CREATE',
  BANNER_UPDATE = 'BANNER_UPDATE',
  BANNER_DELETE = 'BANNER_DELETE',
  
  // FlashSale
  FLASHSALE_CREATE = 'FLASHSALE_CREATE',
  FLASHSALE_UPDATE = 'FLASHSALE_UPDATE',
  FLASHSALE_DELETE = 'FLASHSALE_DELETE',
  
  // Posts
  POST_CREATE = 'POST_CREATE',
  POST_UPDATE = 'POST_UPDATE',
  POST_DELETE = 'POST_DELETE',
  POST_PUBLISH = 'POST_PUBLISH',
  
  // Settings
  SETTINGS_UPDATE = 'SETTINGS_UPDATE',
}

export enum AuditEntity {
  USER = 'USER',
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  CATEGORY = 'CATEGORY',
  BANNER = 'BANNER',
  FLASHSALE = 'FLASHSALE',
  POST = 'POST',
  SETTINGS = 'SETTINGS',
  AUTH = 'AUTH',
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async create(createAuditLogDto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: createAuditLogDto.userId!,
        action: createAuditLogDto.action,
        entity: createAuditLogDto.entity,
        entityId: createAuditLogDto.entityId ?? '',
        oldData: createAuditLogDto.detail, // Store detail as oldData for backward compatibility
        ipAddress: createAuditLogDto.ipAddress,
      },
    });
  }

  async log(
    action: AuditAction,
    entity: AuditEntity,
    userId?: string,
    entityId?: string,
    detail?: any,
    ipAddress?: string,
  ) {
    return this.create({
      action,
      entity,
      userId,
      entityId,
      detail: detail ? JSON.stringify(detail) : undefined,
      ipAddress,
    });
  }

  async findAll(query: QueryAuditLogDto) {
    const { userId, action, entity, entityId, startDate, endDate, page = 1, limit = 20 } = query;
    
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    
    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get action counts
    const actionCounts = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    
    // Get daily activity
    const dailyLogs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });
    
    // Group by day
    const dailyActivity: Record<string, number> = {};
    dailyLogs.forEach(log => {
      const day = log.createdAt.toISOString().split('T')[0];
      dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    });
    
    return {
      topActions: actionCounts.map(a => ({
        action: a.action,
        count: a._count.id,
      })),
      dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({
        date,
        count,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async cleanup(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    
    return { deleted: result.count };
  }
}
