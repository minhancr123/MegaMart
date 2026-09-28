import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PaymentService } from "./payment.service";
import type { Request } from "express";
import * as crypto from "crypto";
import { SkipThrottle } from "@nestjs/throttler";

@ApiTags("payment")
@Controller("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("vnpay/:orderId")
  @ApiOperation({ summary: "Create VNPay payment URL" })
  @ApiResponse({ status: 200, description: "Payment URL created successfully" })
  async createVNPayPayment(
    @Param("orderId") orderId: string,
    @Req() req: Request,
  ) {
    try {
      const ipAddr =
        (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "127.0.0.1";
      const paymentUrl = await this.paymentService.createVNPayPaymentUrl(
        orderId,
        ipAddr,
      );

      return {
        success: true,
        data: { paymentUrl },
        message: "Tạo URL thanh toán thành công",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi tạo URL thanh toán",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("vnpay-return")
  @ApiOperation({ summary: "VNPay payment callback" })
  @ApiResponse({ status: 200, description: "Payment processed successfully" })
  async vnpayReturn(@Query() query: any) {
    try {
      const result = await this.paymentService.handleVNPayCallback(query);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi xử lý callback thanh toán",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("cod/:orderId")
  @ApiOperation({ summary: "Process COD payment" })
  @ApiResponse({
    status: 200,
    description: "COD payment processed successfully",
  })
  async processCOD(@Param("orderId") orderId: string) {
    try {
      const result = await this.paymentService.processCODPayment(orderId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi xử lý thanh toán COD",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @SkipThrottle()
  @Post("webhook")
  @ApiOperation({ summary: "Handle bank transfer webhook" })
  @ApiResponse({ status: 200, description: "Webhook received successfully" })
  async handleWebhook(@Body() data: any, @Req() req: Request, @Res() res: any) {
    const startTime = Date.now();

    try {
      // SePay test request doesn't send data sometimes or in different formats.
      // 1. Validation Logic...
      const secret = process.env.SEPAY_WEBHOOK_SECRET;
      const signature = (req.headers["x-sepay-signature"] || "") as string;
      const timestamp = (req.headers["x-sepay-timestamp"] || "") as string;
      const authHeader = req.headers["authorization"] || "";
      const apiKey = process.env.SEPAY_API_KEY;

      // Allow test requests from SePay UI (which might skip security headers) if explicitly in dev mode or with specific flag
      const isTestRequest =
        !data ||
        Object.keys(data).length === 0 ||
        data.is_test === true ||
        data.test === true;

      if (isTestRequest) {
        console.log("[Webhook] Received SePay test/empty request");
        return res.status(HttpStatus.OK).json({ success: true });
      }

      if (secret && signature) {
        const payload = JSON.stringify(data);
        const expected =
          "sha256=" +
          crypto
            .createHmac("sha256", secret)
            .update(timestamp + "." + payload)
            .digest("hex");

        if (signature !== expected) {
          console.warn(
            "[Webhook] Invalid SePay webhook signature! Received:",
            signature,
            "Expected:",
            expected,
          );
          return res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Invalid signature",
          });
        }
      } else if (apiKey && authHeader) {
        const expectedAuth = `Apikey ${apiKey}`;
        const valid =
          authHeader.length === expectedAuth.length &&
          crypto.timingSafeEqual(
            Buffer.from(authHeader),
            Buffer.from(expectedAuth),
          );

        if (!valid) {
          console.warn("[Webhook] Invalid SePay API key!");
          return res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: "Unauthorized",
          });
        }
      }

      // Log webhook data for debugging (truncated for large payloads)
      const logData = JSON.stringify(data);
      console.log(
        "[Webhook] Received:",
        logData.length > 500 ? logData.substring(0, 500) + "..." : logData,
      );

      // EARLY RESPONSE PATTERN: Respond 200 OK immediately (< 100ms)
      // Process asynchronously in background to meet SePay's 5-second timeout requirement
      // NOTE: SePay only counts success with EXACT body {"success": true} - no extra fields
      res.status(HttpStatus.OK).json({
        success: true,
      });

      // Async processing (fire-and-forget)
      this.processWebhookAsync(data).catch((err) => {
        console.error("[Webhook] Async processing failed:", err);
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Webhook] Error after ${duration}ms:`, error);

      // Only send error response if headers not sent yet
      if (!res.headersSent) {
        if (error instanceof HttpException) {
          return res.status(error.getStatus()).json({
            success: false,
            message: error.message,
          });
        }
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Webhook processing failed",
          error: error.message,
        });
      }
    }
  }

  // Async webhook processing - runs after HTTP response sent
  private async processWebhookAsync(data: any): Promise<void> {
    try {
      await this.paymentService.processBankTransferWebhook(data);
      console.log("[Webhook] Async processing completed successfully");
    } catch (error) {
      console.error("[Webhook] Async processing error:", error);
      // Could add to dead letter queue or retry mechanism here
    }
  }

  @Get("order/:orderId")
  @ApiOperation({ summary: "Get payment by order ID" })
  @ApiResponse({ status: 200, description: "Payment retrieved successfully" })
  async getPaymentByOrderId(@Param("orderId") orderId: string) {
    try {
      const payments = await this.paymentService.getPaymentByOrderId(orderId);
      return {
        success: true,
        data: payments,
        message: "Lấy thông tin thanh toán thành công",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy thông tin thanh toán",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
