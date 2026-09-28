import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { VoucherService } from "./voucher.service";
import { CreateVoucherDto } from "./dto/create-voucher.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";

@ApiTags("vouchers")
@Controller("vouchers")
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get("public")
  async getPublicVouchers() {
    const vouchers = await this.voucherService.getPublicVouchers();
    return { success: true, data: vouchers };
  }

  @Post()
  async create(@Body() dto: CreateVoucherDto) {
    const voucher = await this.voucherService.create(dto);
    return { success: true, data: voucher };
  }

  @Get("my-vouchers")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  async myVouchers(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub ?? req.user?.id;
    const vouchers = await this.voucherService.getUserAvailableVouchers(userId);
    return { success: true, data: vouchers };
  }

  @Get("assigned/:userId")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  async assigned(@Param("userId") userId: string) {
    const vouchers = await this.voucherService.getAssignedVouchers(userId);
    return { success: true, data: vouchers };
  }

  @Get(":code/validate")
  async validate(
    @Param("code") code: string,
    @Query("userId") userId?: string,
    @Query("subtotal") subtotal?: string,
  ) {
    const numericSubtotal = subtotal ? Number(subtotal) : undefined;
    if (subtotal && Number.isNaN(numericSubtotal))
      throw new BadRequestException("subtotal không hợp lệ");
    const result = await this.voucherService.validate(
      code,
      userId,
      numericSubtotal,
    );
    return { success: true, data: result };
  }
}
