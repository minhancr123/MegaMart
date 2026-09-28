import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
  Inject,
  forwardRef,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ShippingService } from "./shipping.service";
import { OrdersService } from "../orders/orders.service";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";

@ApiTags("shipping")
@Controller("shipping")
@ApiBearerAuth()
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get("master-data/provinces")
  @ApiOperation({ summary: "Danh sách tỉnh/thành GHN" })
  async getProvinces() {
    return { success: true, data: await this.shippingService.getProvinces() };
  }

  @UseGuards(JwtAuthGuard)
  @Get("master-data/districts")
  @ApiOperation({ summary: "Danh sách quận/huyện GHN theo tỉnh" })
  async getDistricts(@Query("provinceId") provinceId: string) {
    return {
      success: true,
      data: await this.shippingService.getDistricts(Number(provinceId)),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("master-data/wards")
  @ApiOperation({ summary: "Danh sách phường/xã GHN theo quận" })
  async getWards(@Query("districtId") districtId: string) {
    return {
      success: true,
      data: await this.shippingService.getWards(Number(districtId)),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("calculate-fee")
  @ApiOperation({ summary: "Tính phí ship GHN" })
  async calculateFee(
    @Body()
    dto: {
      toDistrictId: number;
      toWardCode: string;
      weight?: number;
      insuranceValue?: number;
      serviceTypeId?: number;
    },
  ) {
    return {
      success: true,
      data: await this.shippingService.calculateFee(dto),
    };
  }

  @SkipThrottle()
  @Post("ghn-webhook")
  @ApiOperation({
    summary: "Webhook GHN đẩy trạng thái vận đơn (xác thực query token)",
  })
  async ghnWebhook(@Body() body: any, @Query("token") token?: string) {
    const secret = process.env.GHN_WEBHOOK_SECRET || "";
    // Luôn 200 để GHN không retry dồn dập; sai secret thì chỉ log + bỏ qua.
    if (!secret || token !== secret) {
      return { success: false, message: "Unauthorized webhook" };
    }
    try {
      const data = body?.data ?? body ?? {};
      await this.ordersService.applyGhnWebhookStatus({
        clientCode:
          data.ClientOrderCode ||
          data.client_order_code ||
          data.clientOrderCode ||
          undefined,
        ghnCode: data.OrderCode || data.order_code || undefined,
        status: String(data.Status || data.status || ""),
        expectedDelivery:
          data.LeadTime || data.leadtime || data.ExpectedDeliveryTime || null,
        occurredAt:
          data.Time ||
          data.time ||
          data.UpdatedDate ||
          data.updated_date ||
          null,
        raw: body,
      });
    } catch (error) {
      console.error("GHN webhook apply failed:", (error as Error).message);
    }
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post("simulate-webhook")
  @ApiOperation({
    summary: "Giả lập bắn Webhook GHN cho đơn hàng (Admin test)",
  })
  async simulateWebhook(
    @Body() dto: { orderCode?: string; ghnCode?: string; status: string },
    @Request() req: any,
  ) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException(
        { success: false, message: "Chỉ quản trị viên được giả lập webhook" },
        HttpStatus.FORBIDDEN,
      );
    }
    const status = String(dto.status || "").toLowerCase();
    const payload = {
      OrderCode: dto.ghnCode,
      ClientOrderCode: dto.orderCode,
      Status: status,
      Time: new Date().toISOString(),
    };
    await this.ordersService.applyGhnWebhookStatus({
      clientCode: dto.orderCode,
      ghnCode: dto.ghnCode,
      status,
      occurredAt: new Date().toISOString(),
      raw: payload,
    });
    return {
      success: true,
      message: `Đã giả lập Webhook GHN trạng thái "${status}"`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("track/:orderCode")
  @ApiOperation({
    summary: "Tra cứu hành trình đơn hàng trên GHN (đơn của chính user)",
  })
  async trackOrder(@Param("orderCode") orderCode: string, @Request() req: any) {
    // Luôn HTTP 200 để axiosClient frontend không reject khi chưa có vận đơn
    const data = await this.shippingService.trackOrderForUser(orderCode, {
      userId: req.user?.userId || req.user?.sub,
      role: req.user?.role,
    });
    if (data?.found && data.status) {
      try {
        await this.ordersService.applyGhnWebhookStatus({
          clientCode: orderCode,
          ghnCode: data.trackingCode,
          status: data.status,
          expectedDelivery: data.expectedDelivery,
          raw: { source: "poll", status: data.status },
        });
      } catch {}
    }
    return { success: true, data };
  }
}
