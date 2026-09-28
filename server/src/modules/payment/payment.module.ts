import { Module, forwardRef } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { PrismaModule } from "src/prismaClient/prisma.module";
import { ConfigModule } from "@nestjs/config";
import { LoyaltyModule } from "../loyalty/loyalty.module";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => LoyaltyModule),
    EmailModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
