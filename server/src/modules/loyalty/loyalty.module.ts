import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "src/prismaClient/prisma.module";
import { LoyaltyService } from "./loyalty.service";
import { LoyaltyController } from "./loyalty.controller";

@Module({
  imports: [PrismaModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
