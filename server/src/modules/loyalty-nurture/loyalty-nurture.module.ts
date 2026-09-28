import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { LoyaltyNurtureAdminService } from "./loyalty-nurture.service";
import { LoyaltyNurtureController } from "./loyalty-nurture.controller";

@Module({
  imports: [EmailModule],
  controllers: [LoyaltyNurtureController],
  providers: [LoyaltyNurtureAdminService],
  exports: [LoyaltyNurtureAdminService],
})
export class LoyaltyNurtureModule {}
