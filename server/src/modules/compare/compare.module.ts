import { Module } from '@nestjs/common';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Module({
  controllers: [CompareController],
  providers: [CompareService, PrismaService],
  exports: [CompareService],
})
export class CompareModule {}
