import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prismaClient/prisma.module";
import { LoyaltyModule } from "../loyalty/loyalty.module";
import { EmailModule } from "../email/email.module";
import { CrmController } from "./crm.controller";
import { CrmService } from "./crm.service";

@Module({
  imports: [PrismaModule, LoyaltyModule, EmailModule],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
