import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";
import { LoyaltyNurtureAdminService } from "./loyalty-nurture.service";
import { RejectQueueDto } from "./dto/queue.dto";

@ApiTags("admin-loyalty-nurture")
@ApiBearerAuth("JWT-auth")
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/loyalty-nurture")
export class LoyaltyNurtureController {
  constructor(private readonly nurture: LoyaltyNurtureAdminService) {}

  @Get("queue")
  @ApiOperation({ summary: "Danh sách hàng chờ duyệt (ADMIN)" })
  @ApiResponse({ status: 200, description: "Hàng chờ PENDING/APPROVED/..." })
  list(@Query("status") status?: string) {
    return this.nurture.listQueue(status);
  }

  @Post("queue/:id/approve")
  @ApiOperation({
    summary: "Duyệt: bật voucher + gửi mail cho khách (ADMIN)",
  })
  @ApiResponse({ status: 200, description: "Đã duyệt" })
  approve(@Param("id") id: string, @Req() req: any) {
    return this.nurture.approve(id, actorId(req));
  }

  @Post("queue/:id/reject")
  @ApiOperation({ summary: "Từ chối hàng chờ (ADMIN)" })
  @ApiResponse({ status: 200, description: "Đã từ chối" })
  reject(
    @Param("id") id: string,
    @Req() req: any,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }))
    dto: RejectQueueDto,
  ) {
    return this.nurture.reject(id, actorId(req), dto?.note);
  }
}

/** JwtStrategy gắn { userId, ... } — không có .id. */
function actorId(req: any): string {
  const id = req.user?.userId ?? req.user?.id;
  if (!id) throw new UnauthorizedException();
  return id;
}
