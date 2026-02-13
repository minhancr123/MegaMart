import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from 'src/prismaClient/prisma.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
