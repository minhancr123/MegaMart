import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prismaClient/prisma.module';
import { ShippersService } from './shippers.service';
import { ShippersController } from './shippers.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ShippersController],
  providers: [ShippersService],
  exports: [ShippersService],
})
export class ShippersModule {}
