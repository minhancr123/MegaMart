import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  Query,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Roles } from "src/decorators/roles.decorator";
import { RolesGuard } from "src/guards/roles.guard";
import { UserRole } from "@prisma/client";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiIAmATeapotResponse,
  ApiConsumes,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { UpdatePaymentMethodDto } from "./dto/update-payment-method.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { PaymentService } from "../payment/payment.service";
import { CloudinaryService } from "../images/cloudinary.service";

@ApiTags("orders")
@Controller("orders")
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentService: PaymentService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create new order" })
  @ApiResponse({
    status: 201,
    description: "Order created successfully",
    type: OrderResponseDto,
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    try {
      const userId = req.user?.userId || req.user?.sub || createOrderDto.userId;
      const order = await this.ordersService.createOrder(
        createOrderDto,
        userId,
      );
      return {
        success: true,
        data: order,
        message: "Đặt hàng thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi tạo đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user orders" })
  @ApiResponse({ status: 200, description: "Orders retrieved successfully" })
  async getUserOrders(@Request() req) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const orders = await this.ordersService.getOrdersByUser(userId);
      return {
        success: true,
        data: orders,
        message: "Lấy danh sách đơn hàng thành công",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy danh sách đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("user/:userId")
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get orders by user ID" })
  @ApiResponse({
    status: 200,
    description: "User orders retrieved successfully",
  })
  async getOrdersByUserId(@Param("userId") userId: string, @Request() req) {
    try {
      const actorId = req.user?.userId || req.user?.id;
      if (req.user?.role !== UserRole.ADMIN && actorId !== userId) {
        throw new HttpException(
          {
            success: false,
            message: "Bạn không có quyền xem đơn hàng của người khác",
          },
          HttpStatus.FORBIDDEN,
        );
      }
      const orders = await this.ordersService.getOrdersByUser(userId);
      return {
        success: true,
        data: orders,
        message: "Lấy danh sách đơn hàng thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy danh sách đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("all")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all orders (Admin only)" })
  @ApiResponse({
    status: 200,
    description: "All orders retrieved successfully",
  })
  async getAllOrders(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const result = await this.ordersService.getAllOrders(pageNum, limitNum);
      return {
        success: true,
        data: result.orders,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: pageNum,
        message: "Lấy danh sách tất cả đơn hàng thành công",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy danh sách đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("code/:code")
  @ApiOperation({ summary: "Get order by code" })
  @ApiResponse({
    status: 200,
    description: "Order retrieved successfully",
    type: OrderResponseDto,
  })
  async getOrderByCode(@Param("code") code: string) {
    try {
      const order = await this.ordersService.getOrderByCode(code);
      return {
        success: true,
        data: order,
        message: "Lấy thông tin đơn hàng thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy thông tin đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("delivery-queue")
  @Roles(UserRole.ADMIN, UserRole.SHIPPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hàng chờ giao cho app shipper (đơn SHIPPING)" })
  async getDeliveryQueue(@Request() req) {
    const data = await this.ordersService.getDeliveryQueue(req.user);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id/shipment-timeline")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Timeline vận chuyển của đơn hàng" })
  async getShipmentTimeline(@Param("id") id: string, @Request() req) {
    await this.assertOrderAccess(id, req);
    const data = await this.ordersService.getShipmentTimeline(id);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order by ID" })
  @ApiResponse({
    status: 200,
    description: "Order retrieved successfully",
    type: OrderResponseDto,
  })
  async getOrderById(@Param("id") id: string, @Request() req) {
    try {
      const order = await this.assertOrderAccess(id, req);
      return {
        success: true,
        data: order,
        message: "Lấy thông tin đơn hàng thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy thông tin đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(":id/ghn-shipment")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Tạo đơn vận chuyển GHN (admin)" })
  async createGhnShipment(
    @Param("id") id: string,
    @Body()
    body: {
      weight?: number;
      note?: string;
      requiredNote?: string;
      provinceId?: number;
      districtId?: number;
      wardCode?: string;
    },
    @Request() req,
  ) {
    try {
      const order = await this.ordersService.createGhnShipment(
        id,
        body || {},
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data: order, message: "Tạo đơn GHN thành công" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi tạo đơn GHN",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/print-ghn")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lấy link in vận đơn GHN A5 (admin)" })
  async printGhnShipment(@Param("id") id: string, @Request() req) {
    try {
      const data = await this.ordersService.printGhnShipment(
        id,
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data, message: "Đã tạo link in vận đơn GHN" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi in vận đơn GHN",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/handover-shipper")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Bàn giao đơn đã in vận đơn cho shipper (admin)" })
  async handoverToShipper(
    @Param("id") id: string,
    @Body() body: { shipperId?: string },
    @Request() req,
  ) {
    try {
      const order = await this.ordersService.handoverToShipper(
        id,
        body?.shipperId,
        req.user?.userId || req.user?.sub,
      );
      return {
        success: true,
        data: order,
        message: "Đã bàn giao đơn cho shipper",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi bàn giao shipper",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/reassign-shipper")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Phân công lại shipper ngẫu nhiên (admin)" })
  async reassignShipper(@Param("id") id: string, @Request() req) {
    try {
      const result = await this.ordersService.reassignShipper(
        id,
        req.user?.userId || req.user?.sub,
      );
      return { ...result, message: "Đã phân công lại shipper" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi phân công lại shipper",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(":id/ghn-shipment")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Hủy đơn vận chuyển GHN (admin)" })
  async cancelGhnShipment(@Param("id") id: string, @Request() req) {
    try {
      const order = await this.ordersService.cancelGhnShipment(
        id,
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data: order, message: "Hủy đơn GHN thành công" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi hủy đơn GHN",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertAdmin(req: any) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException(
        {
          success: false,
          message: "Chỉ quản trị viên được thao tác vận chuyển GHN",
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertStaff(req: any) {
    if (req.user?.role !== "ADMIN" && req.user?.role !== "SHIPPER") {
      throw new HttpException(
        {
          success: false,
          message: "Chỉ nhân viên giao hàng hoặc quản trị viên được thao tác",
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertOrderAccess(orderId: string, req: any) {
    const order = await this.ordersService.getOrderById(orderId);
    if (req.user?.role === "ADMIN") return order;
    if (req.user?.role === "SHIPPER") {
      const data: any = (order as any)?.data ?? order;
      const userId = req.user?.userId || req.user?.sub || req.user?.id;
      if (data?.assignedShipperId !== userId) {
        throw new HttpException(
          {
            success: false,
            message: "Shipper chỉ được thao tác đơn được phân công",
          },
          HttpStatus.FORBIDDEN,
        );
      }
      return order;
    }
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const data: any = (order as any)?.data ?? order;
    // Đơn vãng lai không gắn userId không được chia sẻ qua các route theo orderId.
    if (!data?.userId || data.userId !== userId) {
      throw new HttpException(
        { success: false, message: "Bạn không có quyền xem đơn hàng này" },
        HttpStatus.FORBIDDEN,
      );
    }
    return order;
  }

  @Post(":id/shipment-note")
  @Roles(UserRole.ADMIN, UserRole.SHIPPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Admin/Shipper ghi chú vận hành lên timeline (giao lại, liên hệ khách...)",
  })
  async addShipmentNote(
    @Param("id") id: string,
    @Body() body: { message: string },
    @Request() req,
  ) {
    try {
      await this.assertOrderAccess(id, req);
      const data = await this.ordersService.addShipmentNote(
        id,
        body?.message || "",
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data, message: "Đã ghi chú" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi ghi chú",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(":id/shipper-location")
  @Roles(UserRole.ADMIN, UserRole.SHIPPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Shipper cập nhật vị trí GPS hiện tại của đơn" })
  async updateShipperLocation(
    @Param("id") id: string,
    @Body() body: { lat: number; lng: number; accuracy?: number },
    @Request() req,
  ) {
    try {
      await this.assertOrderAccess(id, req);
      const data = await this.ordersService.updateShipperLocation(
        id,
        body,
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data, message: "Đã cập nhật vị trí shipper" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message:
            (error as Error).message || "Lỗi khi cập nhật vị trí shipper",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/delivery-proof")
  @Roles(UserRole.ADMIN, UserRole.SHIPPER)
  @ApiBearerAuth()
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary:
      "Shipper/Admin chụp ảnh xác nhận đã giao (tối đa 5 ảnh, tự lên DELIVERED)",
  })
  @UseInterceptors(FilesInterceptor("photos", 5))
  async addDeliveryProof(
    @Param("id") id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: { note?: string; photoUrls?: string | string[] },
    @Request() req,
  ) {
    try {
      await this.assertOrderAccess(id, req);
      const urls: string[] = [];
      if (files?.length) {
        const uploaded = await this.cloudinary.uploadMultipleImages(
          files as any,
          "pod",
        );
        for (const u of uploaded) urls.push(u.url);
      }
      const pasted = Array.isArray(body?.photoUrls)
        ? body.photoUrls
        : body?.photoUrls
          ? [body.photoUrls]
          : [];
      for (const u of pasted) if (String(u).trim()) urls.push(String(u).trim());
      const data = await this.ordersService.addDeliveryProof(
        id,
        { photoUrls: urls, note: body?.note },
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data, message: "Đã lưu ảnh xác nhận giao hàng" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi lưu ảnh POD",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/refund-requests")
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Tạo yêu cầu hoàn tiền (chỉ khi đã có thanh toán PAID)",
  })
  async requestRefund(
    @Param("id") id: string,
    @Body()
    body: { reason: string; method?: string; bankInfo?: any; amount?: number },
    @Request() req,
  ) {
    try {
      await this.assertOrderAccess(id, req);
      const data = await this.ordersService.requestRefund(
        id,
        body || ({} as any),
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data, message: "Đã tạo yêu cầu hoàn tiền" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi tạo yêu cầu hoàn tiền",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(":id/refund-requests")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Danh sách yêu cầu hoàn tiền của đơn" })
  async listRefundRequests(@Param("id") id: string, @Request() req) {
    await this.assertOrderAccess(id, req);
    const data = await this.ordersService.listRefundRequests(id);
    return { success: true, data };
  }

  @Patch("refund-requests/:requestId/review")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin duyệt/từ chối/hoàn tất yêu cầu hoàn tiền" })
  async reviewRefund(
    @Param("requestId") requestId: string,
    @Body() body: { action: "approve" | "reject" | "complete"; note?: string },
    @Request() req,
  ) {
    try {
      const data = await this.ordersService.reviewRefund(
        requestId,
        body || ({} as any),
        req.user?.userId || req.user?.sub,
      );
      return { success: true, data, message: "Đã cập nhật yêu cầu hoàn tiền" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: (error as Error).message || "Lỗi khi duyệt hoàn tiền",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/confirm-receipt")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Khách xác nhận đã nhận hàng (DELIVERED -> COMPLETED)" })
  async confirmReceipt(@Param("id") id: string, @Request() req) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      const data = await this.ordersService.confirmReceipt(
        id,
        userId,
        req.user?.role,
      );
      return {
        success: true,
        data,
        message: "Cảm ơn bạn đã xác nhận! Đơn hàng đã hoàn tất.",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi xác nhận nhận hàng",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(":id/status")
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update order status" })
  @ApiResponse({
    status: 200,
    description: "Order status updated successfully",
  })
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req,
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      const order = await this.ordersService.updateOrderStatus(
        id,
        updateOrderDto,
        userId,
      );
      return {
        success: true,
        data: order,
        message: "Cập nhật trạng thái đơn hàng thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi cập nhật trạng thái đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id/payment-method")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update order payment method" })
  @ApiResponse({
    status: 200,
    description: "Payment method updated successfully",
  })
  async updatePaymentMethod(
    @Param("id") id: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
    @Request() req,
  ) {
    try {
      const userId = req.user?.userId || req.user?.sub;
      const order = await this.ordersService.updatePaymentMethod(
        id,
        updatePaymentMethodDto.paymentMethod,
        userId,
      );

      // If changing to VNPAY, create payment URL
      let paymentUrl: string | null = null;
      if (updatePaymentMethodDto.paymentMethod === "VNPAY") {
        const ipAddr =
          req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          "127.0.0.1";
        paymentUrl = await this.paymentService.createVNPayPaymentUrl(
          id,
          ipAddr as string,
        );
      }

      return {
        success: true,
        data: {
          order,
          paymentUrl,
        },
        message: "Cập nhật phương thức thanh toán thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi cập nhật phương thức thanh toán",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel order" })
  @ApiResponse({ status: 200, description: "Order cancelled successfully" })
  async cancelOrder(@Param("id") id: string, @Request() req) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const order = await this.ordersService.cancelOrder(id, userId);
      return {
        success: true,
        data: order,
        message: "Hủy đơn hàng thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi hủy đơn hàng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
