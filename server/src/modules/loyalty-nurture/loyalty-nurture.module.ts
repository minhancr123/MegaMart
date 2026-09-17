import { Module } from '@nestjs/common';
import { LoyaltyNurtureAdminService } from './loyalty-nurture.service';
import { LoyaltyNurtureController } from './loyalty-nurture.controller';

@Module({
  controllers: [LoyaltyNurtureController],
  providers: [LoyaltyNurtureAdminService],
  exports: [LoyaltyNurtureAdminService],
})
export class LoyaltyNurtureModule {}
