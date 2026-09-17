import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  async getSummary(@Request() req: any) {
    const userId = req.user.userId || req.user.id;
    return this.loyaltyService.getLoyaltySummary(userId);
  }

  @Post('redeem')
  async redeem(@Request() req: any, @Body('templateId') templateId: string) {
    const userId = req.user.userId || req.user.id;
    return this.loyaltyService.redeemVoucher(userId, templateId);
  }
}
