import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { WalletService } from "./wallet.service";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";

@ApiTags("wallet")
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /** GET /api/wallet/me — số dư + lịch sử biến động của user đang đăng nhập. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMe(@Request() req: any) {
    const userId = req?.user?.userId || req?.user?.id || req?.user?.sub;
    return this.walletService.getWalletByUserId(userId);
  }
}
