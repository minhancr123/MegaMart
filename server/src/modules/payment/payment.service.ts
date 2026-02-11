import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as querystring from 'qs';

@Injectable()
export class PaymentService {
  private vnpayUrl: string;
  private vnpayTmnCode: string;
  private vnpayHashSecret: string;
  private vnpayReturnUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    // VNPay configuration
    this.vnpayUrl = this.configService.get('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnpayTmnCode = this.configService.get('VNPAY_TMN_CODE') || '';
    this.vnpayHashSecret = this.configService.get('VNPAY_HASH_SECRET') || '';
    this.vnpayReturnUrl = this.configService.get('VNPAY_RETURN_URL') || 'http://localhost:3000/payment/vnpay-return';
  }

  // Create payment URL for VNPay
  async createVNPayPaymentUrl(orderId: string, ipAddr: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true }
    });

    if (!order) {
      throw new HttpException(
        { success: false, message: 'Không tìm thấy đơn hàng' },
        HttpStatus.NOT_FOUND
      );
    }

    const createDate = this.formatDate(new Date());
    const amount = Number(order.total) * 100; // VNPay requires amount in smallest currency unit

    let vnpParams: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpayTmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.code,
      vnp_OrderInfo: `Thanh toan don hang ${order.code}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl: this.vnpayReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
    };

    // Sort params
    vnpParams = this.sortObject(vnpParams);

    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnpayHashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnpParams['vnp_SecureHash'] = signed;

    const paymentUrl = this.vnpayUrl + '?' + querystring.stringify(vnpParams, { encode: false });

    return paymentUrl;
  }

  // Handle VNPay callback
  async handleVNPayCallback(vnpParams: any): Promise<any> {
    const secureHash = vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnpayHashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      throw new HttpException(
        { success: false, message: 'Chữ ký không hợp lệ' },
        HttpStatus.BAD_REQUEST
      );
    }

    const orderCode = vnpParams['vnp_TxnRef'];
    const responseCode = vnpParams['vnp_ResponseCode'];

    const order = await this.prisma.order.findUnique({
      where: { code: orderCode },
      include: { payments: true }
    });

    if (!order) {
      throw new HttpException(
        { success: false, message: 'Không tìm thấy đơn hàng' },
        HttpStatus.NOT_FOUND
      );
    }

    // Update payment and order status
    if (responseCode === '00') {
      // Payment successful
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            status: PaymentStatus.PAID,
            raw: vnpParams
          }
        }),
        this.prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID }
        })
      ]);

      return {
        success: true,
        message: 'Thanh toán thành công',
        orderCode: orderCode
      };
    } else {
      // Payment failed
      await this.prisma.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.FAILED,
          raw: vnpParams
        }
      });

      return {
        success: false,
        message: 'Thanh toán thất bại',
        orderCode: orderCode
      };
    }
  }

  // Process COD payment
  async processCODPayment(orderId: string): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true }
    });

    if (!order) {
      throw new HttpException(
        { success: false, message: 'Không tìm thấy đơn hàng' },
        HttpStatus.NOT_FOUND
      );
    }

    // For COD, payment is marked as pending until delivery
    await this.prisma.payment.updateMany({
      where: { orderId: order.id, provider: PaymentProvider.OTHER },
      data: {
        status: PaymentStatus.PENDING
      }
    });

    return {
      success: true,
      message: 'Đơn hàng đã được tạo. Bạn sẽ thanh toán khi nhận hàng.',
      order
    };
  }

  // Handle Bank Transfer Webhook (Generic)
  async processBankTransferWebhook(data: any): Promise<any> {
    // 1. Normalize Input
    // Support multiple formats:
    // Case A: { content: "...", amount: 100000, ... } (Simple/Custom)
    // Case B: { transactions: [{ description: "...", amount: 100000, ... }] } (Casso/SePay often send array)

    let transactions: any[] = [];

    if (Array.isArray(data)) {
      transactions = data;
    } else if (data.transactions && Array.isArray(data.transactions)) {
      transactions = data.transactions;
    } else if (data.data && Array.isArray(data.data)) {
      transactions = data.data;
    } else {
      transactions = [data];
    }

    const results: any[] = [];

    for (const tx of transactions) {
      try {
        // Extract content and amount
        // Handle various field names (description, content, amount, value, etc.)
        const content = tx.description || tx.content || tx.remark || "";
        const amount = Number(tx.amount || tx.value || 0);

        if (!content) continue;

        // 2. Find Order Code in Content
        // Regex to find "ORD-[A-Z0-9-]+"
        const match = content.match(/ORD-[A-Z0-9-]+/i);

        if (!match) {
          console.log('No order code found in content:', content);
          continue;
        }

        const orderCode = match[0].toUpperCase();
        console.log('Found order code:', orderCode);

        const order = await this.prisma.order.findUnique({
          where: { code: orderCode },
          include: { payments: true }
        });

        if (!order) {
          console.log('Order not found:', orderCode);
          continue;
        }

        // 3. Verify Order Status
        if (order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELED) {
          console.log('Order already finalized:', order.status);
          continue;
        }

        // 4. Verify Amount (Allow small difference? No, strict for now)
        // Note: order.total is BigInt.
        const orderTotal = Number(order.total);
        if (amount < orderTotal) {
          console.log(`Insufficient amount. Received: ${amount}, Expected: ${orderTotal}`);
          // Optional: Mark as partially paid or log warning
          continue;
        }

        // 5. Update Order
        await this.prisma.$transaction([
          // Update Order Status
          this.prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PAID }
          }),
          // Update Payment Status
          this.prisma.payment.updateMany({
            where: { orderId: order.id },
            data: {
              status: PaymentStatus.PAID,
              raw: JSON.stringify(tx)
            }
          }),
          // Create History
          this.prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.PAID,
              reason: `Auto-confirmed by Webhook (Amount: ${amount})`,
              changedBy: 'SYSTEM'
            }
          })
        ]);

        results.push({ orderCode, status: 'UPDATED_TO_PAID' });

      } catch (err) {
        console.error('Error processing transaction:', err);
      }
    }

    return results;
  }

  // Get payment by order ID
  async getPaymentByOrderId(orderId: string): Promise<any> {
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });

    return payments;
  }

  // Helper functions
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
}
