import { Controller, Post, Get, Body, Param, Query, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import type { Request } from 'express';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('vnpay/:orderId')
  @ApiOperation({ summary: 'Create VNPay payment URL' })
  @ApiResponse({ status: 200, description: 'Payment URL created successfully' })
  async createVNPayPayment(@Param('orderId') orderId: string, @Req() req: Request) {
    try {
      const ipAddr = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
      const paymentUrl = await this.paymentService.createVNPayPaymentUrl(orderId, ipAddr);

      return {
        success: true,
        data: { paymentUrl },
        message: 'Tạo URL thanh toán thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi tạo URL thanh toán', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('vnpay-return')
  @ApiOperation({ summary: 'VNPay payment callback' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async vnpayReturn(@Query() query: any) {
    try {
      const result = await this.paymentService.handleVNPayCallback(query);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi xử lý callback thanh toán', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cod/:orderId')
  @ApiOperation({ summary: 'Process COD payment' })
  @ApiResponse({ status: 200, description: 'COD payment processed successfully' })
  async processCOD(@Param('orderId') orderId: string) {
    try {
      const result = await this.paymentService.processCODPayment(orderId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: 'Lỗi khi xử lý thanh toán COD', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle bank transfer webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() data: any) {
    try {
      // Log webhook data for debugging
      console.log('Received webhook data:', JSON.stringify(data, null, 2));

      // Handle standard webhook structure (e.g. from SePay, Casso, or custom)
      // Expected structure varies but usually contains content (description) and amount
      const result = await this.paymentService.processBankTransferWebhook(data);

      return {
        success: true,
        message: 'Webhook processed',
        data: result
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      // Always return 200 to webhook sender to acknowledge receipt, unless it's a critical system failure
      // (Some services retry if not 200)
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      };
    }
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentByOrderId(@Param('orderId') orderId: string) {
    try {
      const payments = await this.paymentService.getPaymentByOrderId(orderId);
      return {
        success: true,
        data: payments,
        message: 'Lấy thông tin thanh toán thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy thông tin thanh toán', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
