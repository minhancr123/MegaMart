import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";
import { VoucherGovernanceService } from "./voucher-governance.service";

@ApiTags("admin-voucher-governance")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/vouchers/governance")
export class VoucherGovernanceController {
  constructor(private readonly gov: VoucherGovernanceService) {}

  @Get("proposals")
  @ApiOperation({ summary: "Danh sách đề xuất governance (ADMIN)" })
  @ApiResponse({ status: 200, description: "Proposals + cờ applied" })
  list() {
    return this.gov.listProposals();
  }

  @Post("proposals/:id/apply")
  @ApiOperation({
    summary: "Áp dụng 1 đề xuất vào voucher, 1 lần duy nhất (ADMIN)",
  })
  @ApiResponse({ status: 200, description: "Kết quả apply" })
  apply(@Param("id") id: string, @Req() req: any) {
    // JwtStrategy gắn { userId, ... } — không có .id.
    const adminId = req.user?.userId ?? req.user?.id;
    if (!adminId) throw new UnauthorizedException();
    return this.gov.applyProposal(id, adminId);
  }
}
