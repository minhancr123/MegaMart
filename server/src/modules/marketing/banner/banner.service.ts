import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { AuditLogService, AuditAction, AuditEntity } from 'src/modules/audit-log/audit-log.service';

@Injectable()
export class BannerService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { active: true };
    
    return this.prisma.banner.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findActive() {
    return this.prisma.banner.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }

    return banner;
  }

  async create(createBannerDto: CreateBannerDto) {
    // Get max displayOrder
    const maxOrder = await this.prisma.banner.aggregate({
      _max: { displayOrder: true },
    });

    const banner = await this.prisma.banner.create({
      data: {
        ...createBannerDto,
        displayOrder: createBannerDto.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
        startDate: createBannerDto.startDate ? new Date(createBannerDto.startDate) : null,
        endDate: createBannerDto.endDate ? new Date(createBannerDto.endDate) : null,
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.BANNER_CREATE,
      AuditEntity.BANNER,
      undefined, // Will be set from request context if available
      banner.id,
      { title: banner.title, imageUrl: banner.imageUrl },
    );

    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto) {
    const oldBanner = await this.findOne(id); // Check if exists

    const updatedBanner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...updateBannerDto,
        startDate: updateBannerDto.startDate ? new Date(updateBannerDto.startDate) : undefined,
        endDate: updateBannerDto.endDate ? new Date(updateBannerDto.endDate) : undefined,
      },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.BANNER_UPDATE,
      AuditEntity.BANNER,
      undefined,
      id,
      { 
        before: { title: oldBanner.title, active: oldBanner.active },
        after: { title: updatedBanner.title, active: updatedBanner.active },
      },
    );

    return updatedBanner;
  }

  async updateOrder(bannerIds: string[]) {
    // Update display order based on array order
    const updates = bannerIds.map((id, index) =>
      this.prisma.banner.update({
        where: { id },
        data: { displayOrder: index },
      })
    );

    return this.prisma.$transaction(updates);
  }

  async toggleActive(id: string) {
    const banner = await this.findOne(id);
    
    return this.prisma.banner.update({
      where: { id },
      data: { active: !banner.active },
    });
  }

  async delete(id: string) {
    const banner = await this.findOne(id); // Check if exists

    await this.prisma.banner.delete({
      where: { id },
    });

    // Log audit
    await this.auditLogService.log(
      AuditAction.BANNER_DELETE,
      AuditEntity.BANNER,
      undefined,
      id,
      { title: banner.title },
    );

    return { message: 'Banner deleted successfully' };
  }
}
