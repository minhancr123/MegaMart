import {
  Controller,
  Get,
  Query,
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
import { RecommendationService } from "./recommendation.service";

@ApiTags("recommendations")
@ApiBearerAuth("JWT-auth")
@Controller("recommendations")
export class RecommendationController {
  constructor(private readonly recs: RecommendationService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Gợi ý cá nhân của tôi (do agent tính sẵn mỗi 6h)",
  })
  @ApiResponse({ status: 200, description: "Danh sách gợi ý theo score" })
  listMine(@Req() req: any, @Query("take") take?: string) {
    // JwtStrategy gắn req.user = { userId, email, role, name } (KHÔNG có .id).
    // Dùng .id khi undefined sẽ khiến Prisma bỏ filter → lộ recs của user khác.
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) throw new UnauthorizedException();
    const n = take !== undefined ? Number.parseInt(take, 10) : 20;
    return this.recs.listForUser(userId, Number.isSafeInteger(n) ? n : 20);
  }
}
