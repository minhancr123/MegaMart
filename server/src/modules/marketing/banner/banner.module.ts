import { Module } from '@nestjs/common';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { AuditLogModule } from 'src/modules/audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [BannerController],
  providers: [BannerService, PrismaService],
  exports: [BannerService],
})
export class BannerModule {}
