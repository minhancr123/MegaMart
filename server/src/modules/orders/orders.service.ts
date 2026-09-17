import { Injectable, HttpException, HttpStatus, NotFoundException, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { WalletService } from '../wallet/wallet.service';
import { RefundRouterService } from '../refund/refund-router.service';
import { ShippersService } from '../shippers/shippers.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { VoucherService } from '../vouchers/voucher.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { AuditLogService, AuditAction, AuditEntity } from '../audit-log/audit-log.service';
import { formatPrice } from 'src/utils/price.util';
import {
  validateTransition,
  shouldReleaseReservation,
  shouldRestoreOnHand,
  canUserCancel,
  getStatusLabel,
  PRE_FULFILLMENT_STATUSES
} from './order-status.helper';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly shippingService: ShippingService,
    // Optional để không vỡ khi module chưa kịp import trong test cũ
    @Optional() @Inject(forwardRef(() => WalletService)) private readonly walletService?: WalletService,
    @Optional() @Inject(forwardRef(() => RefundRouterService)) private readonly refundRouter?: RefundRouterService,
    @Optional() @Inject(forwardRef(() => ShippersService)) private readonly shippersService?: ShippersService,
    @Optional() @Inject(forwardRef(() => LoyaltyService)) private readonly loyaltyService?: LoyaltyService,
    @Optional() @Inject(forwardRef(() => VoucherService)) private readonly voucherService?: VoucherService,
  ) { }

  // Generate unique order code (Format: ORD + 6 chữ số ngẫu nhiên chuẩn SePay)
  /**
   * Gán serial IN_STOCK cũ nhất cho đơn (best-effort: hàng legacy không có
   * serial thì thôi, không chặn đặt hàng).
   */
  private async assignSerialsToOrder(
    tx: any,
    orderId: string,
    items: Array<{ variantId: string; quantity: number }>,
  ) {
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) continue;
      const serials = await tx.serialNumber.findMany({
        where: { variantId: item.variantId, status: 'IN_STOCK' },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: item.quantity,
        select: { id: true },
      });
      if (serials.length === 0) continue;
      await tx.serialNumber.updateMany({
        where: { id: { in: serials.map((s: any) => s.id) } },
        data: { status: 'SOLD', orderId } as any,
      });
    }
  }

  /** Nhả serial đã gán cho đơn về lại kho (khi hủy/hoàn tồn). */
  private async releaseOrderSerials(tx: any, orderId: string) {
    await tx.serialNumber.updateMany({
      where: { orderId, status: 'SOLD' },
      data: { status: 'IN_STOCK', orderId: null } as any,
    });
  }

  /**
   * Xả hàng đang giữ về kho. GREATEST(..., 0) kẹp sàn để reservedQuantity
   * không bao giờ âm dù dữ liệu cũ có lệch.
   */
  private async releaseReservation(tx: any, variantId: string, qty: number) {
    await tx.$executeRaw`
      UPDATE "Variant"
      SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${Number(qty)}),
          "updatedAt" = NOW()
      WHERE "id" = ${variantId}
    `;
  }

  /** Đính kèm serial của đơn vào response chi tiết (đơn + admin tra bảo hành). */
  private async withOrderSerials(order: any): Promise<OrderResponseDto> {
    const serials = await this.prisma.serialNumber.findMany({
      where: { orderId: order.id },
      select: {
        id: true,
        serial: true,
        variantId: true,
        status: true,
        lot: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { ...this.formatOrderResponse(order), serials } as any;
  }

  private generateOrderCode(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 chữ số: 100000 -> 999999
    return `ORD${randomNum}`;
  }

  // Create new order
  async createOrder(createOrderDto: CreateOrderDto, userId?: string): Promise<OrderResponseDto> {
    const { cartId, shipping, paymentMethod, totals, voucherCode } = createOrderDto;
    const useWalletRaw = Math.max(0, Math.round(Number((createOrderDto as any).useWalletAmount || 0)));

    // Get cart with items
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      throw new HttpException(
        { success: false, message: 'Giỏ hàng trống hoặc không tồn tại' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Không check tồn ở đây nữa: việc giữ hàng làm atomic ngay trong
    // transaction bên dưới để chống oversell khi checkout đồng thời.

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const discount = Math.max(0, Math.round(totals.discount || 0));
      const totalRounded = Math.round(totals.total);
      const effectiveOwner = userId || (cart as any).userId;
      let useWallet = useWalletRaw;
      if (useWallet > 0) {
        if (!effectiveOwner) {
          throw new HttpException({ success: false, message: 'Khách vãng lai không dùng được ví MegaMart' }, HttpStatus.BAD_REQUEST);
        }
        if (!this.walletService) {
          throw new HttpException({ success: false, message: 'Ví chưa khả dụng, thử lại sau' }, HttpStatus.BAD_REQUEST);
        }
        useWallet = Math.min(useWallet, totalRounded);
      }
      const remaining = totalRounded - useWallet;
      const paymentCreates: any[] = [];
      if (useWallet > 0) {
        paymentCreates.push({ provider: 'WALLET', amount: BigInt(useWallet), currency: 'VND', status: PaymentStatus.PAID });
      }
      if (remaining > 0) {
        paymentCreates.push({ provider: paymentMethod, amount: BigInt(remaining), currency: 'VND', status: PaymentStatus.PENDING });
      }
      if (paymentCreates.length === 0) {
        paymentCreates.push({ provider: paymentMethod, amount: BigInt(totalRounded), currency: 'VND', status: PaymentStatus.PENDING });
      }
      const newOrder = await tx.order.create({
        data: {
          code: this.generateOrderCode(),
          userId: userId || cart.userId,
          status: OrderStatus.PENDING,
          total: BigInt(totalRounded),
          discountAmount: BigInt(discount),
          voucherCode: voucherCode || null,
          vatAmount: BigInt(Math.round(totals.tax)),
          shippingFee: BigInt(Math.max(0, Math.round(totals.shippingFee || 0))),
          shippingAddress: shipping as any,
          billingAddress: shipping as any,
          items: {
            create: cart.items.map(item => ({
              variantId: item.variantId,
              price: item.variant.price,
              quantity: item.quantity
            }))
          },
          payments: {
            create: paymentCreates,
          }
        } as any,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          },
          payments: true
        }
      });
      // Trừ ví trong cùng transaction tạo đơn (atomic với giữ hàng)
      if (useWallet > 0 && effectiveOwner) {
        await (this.walletService as any).debit(
          effectiveOwner,
          useWallet,
          newOrder.id,
          'PAYMENT',
          `Thanh toán đơn ${newOrder.code} bằng ví (${useWallet}₫)`,
          tx,
        );
      }

      // Gán shipper cửa hàng ngay khi đơn được tạo để khách thấy người phụ trách.
      // Nếu chưa có shipper active thì bỏ qua, admin có thể phân công sau.
      await this.assignRandomShipperIfNeeded(newOrder.id, tx, effectiveOwner || 'SYSTEM');

      // Tích điểm loyalty chào mừng (nếu chưa có) hoặc điểm từ đơn hàng PAID ngay nếu cần.
      // Ở đây ta để awardOrderPoints xử lý dựa trên status thật của đơn.
      if (newOrder.status === OrderStatus.PAID) {
        await this.loyaltyService?.awardOrderPoints(newOrder.id, tx);
      }

      // Giữ hàng (reserve): tăng reservedQuantity, KHÔNG trừ On Hand.
      // Điều kiện ("stock" - "reservedQuantity") >= qty nằm ngay trong
      // câu UPDATE nên chống oversell khi nhiều đơn checkout cùng lúc:
      // update 0 dòng nào -> hết hàng khả dụng -> báo lỗi.
      // Sắp xếp theo variantId để các transaction khóa dòng theo cùng thứ
      // tự, tránh deadlock khi 2 giỏ checkout ngược thứ tự nhau.
      const sortedCartItems = [...cart.items].sort((a: any, b: any) =>
        String(a.variantId).localeCompare(String(b.variantId))
      );
      for (const item of sortedCartItems) {
        const qty = Number(item.quantity);
        const held = await tx.$executeRaw`
          UPDATE "Variant"
          SET "reservedQuantity" = "reservedQuantity" + ${qty},
              "updatedAt" = NOW()
          WHERE "id" = ${item.variantId}
            AND ("stock" - "reservedQuantity") >= ${qty}
        `;
        if (Number(held) !== 1) {
          throw new HttpException(
            {
              success: false,
              message: `Sản phẩm "${(item as any).variant?.product?.name || item.variantId}" không đủ số lượng khả dụng trong kho`
            },
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Gán serial IN_STOCK cũ nhất cho đơn (best-effort: hàng legacy
      // không có serial thì thôi, không chặn đặt hàng)
      await this.assignSerialsToOrder(
        tx,
        newOrder.id,
        cart.items.map((item: any) => ({ variantId: item.variantId, quantity: item.quantity }))
      );

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      // Nếu đơn có voucher, ghi nhận tiêu thụ thật trong DB
      if (voucherCode && effectiveOwner && this.voucherService) {
        await this.voucherService.consume(voucherCode, effectiveOwner, newOrder.id, totals.subtotal, tx).catch(e => {
          this.logger.error(`Consume voucher ${voucherCode} failed: ${e.message}`);
          // Vẫn cho tạo đơn nếu consume fail? Thường nên fail cả transaction
          throw e;
        });
      }

      return newOrder;
    });

    // Log creation
    const effectiveUserId = userId || cart.userId;
    if (effectiveUserId) {
      await this.auditLogService.log(
        AuditAction.ORDER_CREATE,
        AuditEntity.ORDER,
        effectiveUserId,
        order.id,
        { code: order.code, total: order.total.toString() }
      );
    }

    return this.formatOrderResponse(order);
  }

  // Get all orders by user
  async getOrdersByUser(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true
                  }
                }
              }
            }
          }
        },
        payments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedShipper: { select: { id: true, name: true, avatarUrl: true, shipperProfile: true } }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return orders.map(order => this.formatOrderResponse(order));
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true
                  }
                }
              }
            }
          }
        },
        payments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedShipper: { select: { id: true, name: true, avatarUrl: true, shipperProfile: true } }
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.withOrderSerials(order);
  }

  // Get order by code
  async getOrderByCode(code: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { code },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true
                  }
                }
              }
            }
          }
        },
        payments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedShipper: { select: { id: true, name: true, avatarUrl: true, shipperProfile: true } }
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.withOrderSerials(order);
  }

  // Update order status
  async updateOrderStatus(
    orderId: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
    opts: { skipPaymentCheck?: boolean } = {},
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const newStatus = updateOrderDto.status;

    if (!newStatus) {
      throw new HttpException(
        { success: false, message: 'Trạng thái mới là bắt buộc' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Check payment status for non-COD orders
    const payment = order.payments?.[0];

    // Allow update if:
    // 1. Cancelling or Failing order
    // 2. Marking as PAID (confirming payment)
    const isAllowedUpdate =
      newStatus === OrderStatus.CANCELED ||
      newStatus === OrderStatus.FAILED ||
      newStatus === OrderStatus.PAID;

    if (!isAllowedUpdate && !opts.skipPaymentCheck && payment && payment.status === PaymentStatus.PENDING) {
      const isCod = payment.provider === 'COD' || payment.provider === 'OTHER';
      if (!isCod) {
        throw new HttpException(
          {
            success: false,
            message: 'Đơn hàng chưa hoàn tất thanh toán. Vui lòng cập nhật trạng thái đã thanh toán (PAID) trước khi xử lý.'
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    const currentStatus = order.status;

    // Validate state transition
    validateTransition(currentStatus, newStatus);

    // Use transaction to update order and create history
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          },
          payments: true
        }
      });

      // If status is PAID, also update payment status
      if (newStatus === OrderStatus.PAID) {
        await tx.payment.updateMany({
          where: { orderId: orderId },
          data: {
            status: PaymentStatus.PAID
          }
        });

        // Refresh payment info in returned object
        if (updated.payments) {
          updated.payments.forEach(p => p.status = PaymentStatus.PAID);
        }
      }

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedBy: updateOrderDto.changedBy || null,
          reason: updateOrderDto.reason || null,
          note: updateOrderDto.note || null
        }
      });

      // Khi đơn bắt đầu vào luồng xử lý/giao hàng, tự gán shipper active ít đơn nhất.
      if ([OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPING].includes(newStatus as any)) {
        const assignedId = await this.assignRandomShipperIfNeeded(orderId, tx, userId || updateOrderDto.changedBy || 'SYSTEM');
        if (assignedId) (updated as any).assignedShipperId = assignedId;
      }

      // Sắp xếp theo variantId để tránh deadlock giữa các transaction.
      const sortedItems = [...order.items].sort((a: any, b: any) =>
        String(a.variantId).localeCompare(String(b.variantId))
      );
      // Xuất kho khi giao hàng: trừ On Hand + xả Reserved cùng lúc
      // (Available = stock - reserved nên không đổi ở bước này).
      if (newStatus === OrderStatus.SHIPPING) {
        for (const item of sortedItems) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } }
          });
          await this.releaseReservation(tx, item.variantId, item.quantity);
        }
      } else if (shouldReleaseReservation(currentStatus, newStatus)) {
        // Hủy/thất bại khi chưa xuất kho: chỉ xả hàng đang giữ.
        for (const item of sortedItems) {
          await this.releaseReservation(tx, item.variantId, item.quantity);
        }
        // Nhả serial đã gán cho đơn về lại kho
        await this.releaseOrderSerials(tx, orderId);
      } else if (shouldRestoreOnHand(currentStatus, newStatus)) {
        // Hủy/thất bại sau xuất kho hoặc hoàn tiền: cộng lại On Hand.
        for (const item of order.items) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
        }
        // Nhả serial đã gán cho đơn về lại kho
        await this.releaseOrderSerials(tx, orderId);
      }

      // Khi đơn hoàn tất / giao thành công, cộng điểm loyalty
      if ([OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(newStatus as any)) {
        await this.loyaltyService?.awardOrderPoints(orderId, tx);
      }

      return updated;
    });

    // Log status change
    if (userId) {
      await this.auditLogService.log(
        AuditAction.ORDER_STATUS_CHANGE,
        AuditEntity.ORDER,
        userId,
        orderId,
        { from: currentStatus, to: newStatus, note: updateOrderDto.note }
      );
    }

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Tạo đơn vận chuyển GHN cho đơn hàng (admin bấm tay, đơn CONFIRMED/PROCESSING).
   */
  async createGhnShipment(
    orderId: string,
    opts: {
      weight?: number;
      note?: string;
      requiredNote?: string;
      provinceId?: number;
      districtId?: number;
      wardCode?: string;
    } = {},
    adminId?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.shippingOrderCode) {
      throw new HttpException(
        { success: false, message: `Đơn đã có vận đơn GHN ${order.shippingOrderCode}` },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PROCESSING) {
      throw new HttpException(
        { success: false, message: 'Chỉ tạo đơn GHN cho đơn hàng đã xác nhận/đang xử lý' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Admin có thể bổ sung mã GHN cho đơn cũ thiếu ngay trong modal.
    const shippingAddress = {
      ...((order.shippingAddress as any) || {}),
      ...(opts.provinceId != null ? { provinceId: Number(opts.provinceId) } : {}),
      ...(opts.districtId != null ? { districtId: Number(opts.districtId) } : {}),
      ...(opts.wardCode != null ? { wardCode: String(opts.wardCode) } : {}),
    };
    const created = await this.shippingService.createGhnOrder(
      {
        id: order.id,
        code: order.code,
        total: order.total,
        shippingAddress,
        payments: order.payments.map((p) => ({ provider: String(p.provider), status: String(p.status) })),
        items: order.items.map((i) => ({
          quantity: i.quantity,
          price: i.price,
          variant: i.variant ? { product: { name: i.variant.product?.name } } : null,
        })),
      },
      opts,
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shippingCarrier: 'GHN',
        shippingAddress: shippingAddress as any,
        shippingOrderCode: created.orderCode,
        shippingFeeReal: BigInt(Math.round(created.fee)),
        shippingStatus: 'ready_to_pick',
        expectedDeliveryDate: created.expectedDelivery ? new Date(created.expectedDelivery) : null,
        shippingMetadata: { created: created.metadata } as any,
      },
    });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: adminId || null,
        reason: `Tạo đơn GHN ${created.orderCode}`,
      },
    });

    return this.getOrderByCode(order.code);
  }

  /**
   * Hủy đơn vận chuyển trên GHN (dọn cước staging). Giữ lại mã để đối chiếu.
   */
  async cancelGhnShipment(orderId: string, adminId?: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (!order.shippingOrderCode) {
      throw new HttpException(
        { success: false, message: 'Đơn chưa có vận đơn GHN' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const cancelledCode = order.shippingOrderCode;
    await this.shippingService.cancelGhnOrder([cancelledCode]);
    // Xóa mã để tạo lại vận đơn mới được; mã cũ lưu trong metadata đối chiếu.
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shippingOrderCode: null,
        shippingStatus: 'cancel',
        shippingMetadata: {
          ...(typeof order.shippingMetadata === 'object' && order.shippingMetadata !== null
            ? (order.shippingMetadata as any)
            : {}),
          cancelledCodes: [...(((order.shippingMetadata as any)?.cancelledCodes as string[]) || []), cancelledCode],
        } as any,
      },
    });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: adminId || null,
        reason: `Hủy đơn GHN ${order.shippingOrderCode}`,
      },
    });
    return this.getOrderByCode(order.code);
  }

  /**
   * Đồng bộ trạng thái từ webhook GHN (có idempotency qua ShipmentEvent).
   * - transporting/sorting/delivering/... -> tiến tới SHIPPING
   * - delivered -> DELIVERED (+ mark COD PAID)
   * - delivery_fail -> giữ SHIPPING, ghi INCIDENT để chờ giao lại
   * - lost/damage -> ghi INCIDENT + chuyển SHIPPING->FAILED (hoàn kho)
   * - return nhóm -> ghi event, không tự REFUNDED (admin duyệt hoàn tiền)
   * Không bao giờ tự hủy đơn.
   */
  async applyGhnWebhookStatus(payload: {
    clientCode?: string;
    ghnCode?: string;
    status: string;
    expectedDelivery?: string | number | null;
    occurredAt?: string | number | null;
    raw: any;
  }): Promise<void> {
    const status = String(payload.status || '').toLowerCase();
    if (!status) return;
    // Tìm đơn: ưu tiên mã shop, fallback mã vận đơn GHN.
    let order = payload.clientCode
      ? await this.prisma.order.findUnique({ where: { code: payload.clientCode } })
      : null;
    if (!order && payload.ghnCode) {
      order = await this.prisma.order.findFirst({ where: { shippingOrderCode: payload.ghnCode } });
    }
    if (!order) {
      this.logger?.warn?.(`GHN webhook cho mã lạ: ${payload.clientCode || payload.ghnCode}`);
      return;
    }

    let expectedDeliveryDate: Date | undefined;
    const ed = payload.expectedDelivery;
    if (ed != null && ed !== '') {
      const num = typeof ed === 'number' ? ed : Number(ed);
      if (!isNaN(num) && num > 0) {
        expectedDeliveryDate = new Date(num < 1e12 ? num * 1000 : num);
      } else {
        const d = new Date(String(ed));
        if (!isNaN(d.getTime())) expectedDeliveryDate = d;
      }
    }

    // occurredAt cho idempotency: ưu tiên payload, fallback field thời gian trong raw GHN.
    let occurredAt: Date | null = null;
    const rawData = (payload.raw as any)?.data ?? payload.raw ?? {};
    const timeCandidates = [
      payload.occurredAt,
      rawData?.UpdatedDate, rawData?.updated_date,
      rawData?.CreatedDate, rawData?.created_date,
      rawData?.Time, rawData?.time,
    ];
    for (const t of timeCandidates) {
      if (t == null || t === '') continue;
      const num = typeof t === 'number' ? t : Number(t);
      if (!isNaN(num) && num > 0) {
        occurredAt = new Date(num < 1e12 ? num * 1000 : num);
        break;
      }
      const d = new Date(String(t));
      if (!isNaN(d.getTime())) {
        occurredAt = d;
        break;
      }
    }

    // Idempotency qua ShipmentEvent (bọc try/catch để webhook vẫn chạy
    // khi DB chưa `db push` bảng mới).
    try {
      const dupWhere: any = { orderId: order.id, status };
      if (payload.ghnCode) dupWhere.ghnCode = String(payload.ghnCode);
      if (occurredAt) dupWhere.occurredAt = occurredAt;
      const existing = await (this.prisma as any).shipmentEvent.findFirst({ where: dupWhere });
      if (existing && occurredAt) {
        return;
      }

      const INCIDENT_STATUSES = ['delivery_fail', 'lost', 'damage', 'exception'];
      const RETURN_STATUSES = ['waiting_to_return', 'return', 'return_transporting', 'return_sorting', 'returning', 'return_fail', 'returned'];
      const kind = INCIDENT_STATUSES.includes(status) || RETURN_STATUSES.includes(status) ? 'INCIDENT' : 'TRACKING';

      // GHN hay bắn lại webhook cũ (retry) và bắn muộn trạng thái cũ sau khi đã giao.
      // Chặn 2 trường hợp để timeline/badge không bị spam và không tụt lùi:
      // (kind suy ra 1-1 từ status nên chỉ cần so status).
      const effectiveGhnCode = payload.ghnCode ? String(payload.ghnCode) : (order.shippingOrderCode ?? null);
      const latest = await (this.prisma as any).shipmentEvent.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: 'desc' },
      });
      const sameJourney = !effectiveGhnCode || !latest?.ghnCode || String(latest.ghnCode) === effectiveGhnCode;
      // 1. Trùng liên tiếp cùng trạng thái trên cùng hành trình -> retry, bỏ qua.
      if (latest && latest.status === status && sameJourney) {
        return;
      }
      // 2. Trạng thái đầu/giữa hành trình đến muộn sau khi đã giao -> bỏ qua.
      // Không chỉ soi event mới nhất (admin có thể ghi chú sau khi giao), mà kiểm tra
      // trạng thái đơn + toàn bộ lịch sử đã từng giao.
      const EARLY_STATUSES = new Set([
        'ready_to_pick', 'picking', 'picked', 'storing', 'transporting', 'sorting',
        'delivering', 'money_collect_picking', 'money_collect_delivering',
      ]);
      if (EARLY_STATUSES.has(status) && sameJourney) {
        const deliveredBefore =
          order.status === OrderStatus.DELIVERED ||
          order.status === OrderStatus.COMPLETED ||
          String(order.shippingStatus || '').toLowerCase() === 'delivered' ||
          await (this.prisma as any).shipmentEvent.findFirst({
            where: {
              orderId: order.id,
              OR: [{ kind: 'POD' }, { status: 'delivered' }, { status: 'pod' }],
            },
            select: { id: true },
          });
        if (deliveredBefore) {
          return;
        }
      }

      await (this.prisma as any).shipmentEvent.create({
        data: {
          orderId: order.id,
          ghnCode: payload.ghnCode ? String(payload.ghnCode) : (order.shippingOrderCode ?? null),
          status,
          kind,
          occurredAt,
          raw: payload.raw as any,
        },
      });
    } catch (e) {
      this.logger?.warn?.(`ShipmentEvent write skipped (${order.code}): ${(e as Error).message}`);
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        shippingStatus: status,
        expectedDeliveryDate,
        shippingMetadata: { ...(typeof order.shippingMetadata === 'object' && order.shippingMetadata !== null ? (order.shippingMetadata as any) : {}), lastWebhook: payload.raw } as any,
      },
    });

    // Webhook do admin tạo đơn mà ra nên được bypass guard thanh toán.
    const moveTo = async (s: OrderStatus, reason?: string) => {
      try {
        await this.updateOrderStatus(order!.id, { status: s, reason } as any, undefined, { skipPaymentCheck: true });
        order!.status = s;
      } catch (e) {
        this.logger?.warn?.(`GHN auto-transition ${order!.code} -> ${s} thất bại: ${(e as Error).message}`);
      }
    };

    // Đi từng nấc để qua được VALID_TRANSITIONS (CONFIRMED->PROCESSING->SHIPPING->DELIVERED).
    if (['picking', 'picked', 'storing', 'transporting', 'sorting', 'delivering', 'money_collect_picking', 'money_collect_delivering'].includes(status)) {
      if (order.status === OrderStatus.CONFIRMED) await moveTo(OrderStatus.PROCESSING);
      if (order.status === OrderStatus.PROCESSING) await moveTo(OrderStatus.SHIPPING);
    } else if (status === 'delivered') {
      if (order.status === OrderStatus.CONFIRMED) await moveTo(OrderStatus.PROCESSING);
      if (order.status === OrderStatus.PROCESSING) await moveTo(OrderStatus.SHIPPING);
      if (order.status === OrderStatus.SHIPPING) {
        await moveTo(OrderStatus.DELIVERED);
        const full = await this.prisma.order.findUnique({
          where: { id: order.id },
          include: { payments: true },
        });
        const isCodUnpaid = (full?.payments || []).some(
          (p) => String(p.status) !== 'PAID' && ['COD', 'OTHER'].includes(String(p.provider)),
        );
        if (isCodUnpaid) {
          await this.prisma.payment.updateMany({
            where: { orderId: order.id },
            data: { status: PaymentStatus.PAID },
          });
        }
      }
    } else if (status === 'delivery_fail') {
      // Giữ SHIPPING để giao lại, chỉ ghi INCIDENT (đã ghi ở trên).
      if (order.status === OrderStatus.CONFIRMED) await moveTo(OrderStatus.PROCESSING);
      if (order.status === OrderStatus.PROCESSING) await moveTo(OrderStatus.SHIPPING);
    } else if (['lost', 'damage'].includes(status)) {
      if (order.status === OrderStatus.SHIPPING) {
        await moveTo(OrderStatus.FAILED, `GHN báo ${status === 'lost' ? 'thất lạc' : 'hư hỏng'} (${order.shippingOrderCode || ''})`);
      }
    }
    // Nhóm return: chỉ ghi event, admin quyết hoàn tiền thủ công.
  }

  /** Ghi chú vận hành của admin lên timeline (giao lại, liên hệ khách...). */
  async addShipmentNote(orderId: string, message: string, userId?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const text = (message || '').trim();
    if (!text) throw new HttpException({ success: false, message: 'Nội dung ghi chú là bắt buộc' }, HttpStatus.BAD_REQUEST);
    return (this.prisma as any).shipmentEvent.create({
      data: {
        orderId,
        ghnCode: order.shippingOrderCode ?? null,
        status: 'note',
        kind: 'NOTE',
        message: text.slice(0, 2000),
        createdBy: userId || null,
      },
    });
  }

  /**
   * Shipper/admin chụp ảnh POD xác nhận đã giao. Upload Cloudinary ở controller,
   * service chỉ nhận URLs. Nếu đơn đang SHIPPING -> tiến DELIVERED (+ mark COD PAID).
   */
  async addDeliveryProof(
    orderId: string,
    dto: { photoUrls: string[]; note?: string },
    userId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const urls = (dto.photoUrls || []).map((u) => String(u).trim()).filter(Boolean).slice(0, 5);
    if (urls.length === 0) {
      throw new HttpException({ success: false, message: 'Cần ít nhất 1 ảnh xác nhận giao hàng' }, HttpStatus.BAD_REQUEST);
    }
    if (order.status !== OrderStatus.SHIPPING && order.status !== OrderStatus.DELIVERED) {
      throw new HttpException(
        { success: false, message: 'Chỉ chụp ảnh xác nhận cho đơn đang giao hoặc đã giao' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const proof = await (this.prisma as any).deliveryProof.create({
      data: {
        orderId,
        photoUrls: urls,
        note: dto.note?.slice(0, 2000) || null,
        capturedBy: userId || null,
      },
    });
    await (this.prisma as any).shipmentEvent.create({
      data: {
        orderId,
        ghnCode: order.shippingOrderCode ?? null,
        status: 'pod',
        kind: 'POD',
        message: dto.note?.slice(0, 2000) || `Đã chụp ${urls.length} ảnh xác nhận giao hàng`,
        createdBy: userId || null,
      },
    });
    if (order.status === OrderStatus.SHIPPING) {
      try {
        await this.updateOrderStatus(orderId, { status: OrderStatus.DELIVERED } as any, userId, { skipPaymentCheck: true });
      } catch (e) {
        this.logger?.warn?.(`POD auto DELIVERED ${order.code} thất bại: ${(e as Error).message}`);
      }
      const isCodUnpaid = (order.payments || []).some(
        (p) => String(p.status) !== 'PAID' && ['COD', 'OTHER'].includes(String(p.provider)),
      );
      if (isCodUnpaid) {
        await this.prisma.payment.updateMany({ where: { orderId }, data: { status: PaymentStatus.PAID } });
      }
    }
    return proof;
  }

  /** Timeline gộp: GHN events + POD + lịch sử trạng thái đơn. */
  async getShipmentTimeline(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const [events, proofs, history] = await Promise.all([
      (this.prisma as any).shipmentEvent.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      (this.prisma as any).deliveryProof.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);
    return { events, proofs, history };
  }

  private async assignRandomShipperIfNeeded(orderId: string, tx?: any, actorId?: string) {
    if (!this.shippersService) return null;
    const client = tx || this.prisma;
    const order = await client.order.findUnique({ where: { id: orderId }, select: { id: true, code: true, status: true, assignedShipperId: true } });
    if (!order || order.assignedShipperId) return order?.assignedShipperId || null;
    const shipper = await this.shippersService.getLeastBusyActiveShipper(client);
    if (!shipper) {
      this.logger.warn(`Không có shipper active để phân công đơn ${order?.code || orderId}`);
      return null;
    }
    await client.order.update({ where: { id: orderId }, data: { assignedShipperId: shipper.id } as any });
    await client.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: actorId || 'SYSTEM',
        reason: `Tự động phân công shipper ${shipper.name || shipper.email}`,
      },
    }).catch((e: any) => this.logger.warn(`Không ghi được lịch sử phân công shipper: ${e?.message}`));
    return shipper.id;
  }

  /**
   * Hàng/vận đơn cho app shipper: admin xem toàn bộ, shipper chỉ xem đơn được phân công.
   */
  async getDeliveryQueue(user?: { userId?: string; role?: string }) {
    const where: any = {
      OR: [
        { status: OrderStatus.SHIPPING },
        { shippingOrderCode: { not: null } },
      ],
      NOT: { status: { in: [OrderStatus.CANCELED, OrderStatus.FAILED] } },
    };
    if (user?.role === 'SHIPPER') {
      where.assignedShipperId = user.userId;
    }
    const orders = await this.prisma.order.findMany({
      where,
      select: {
        id: true,
        code: true,
        status: true,
        total: true,
        shippingOrderCode: true,
        shippingStatus: true,
        expectedDeliveryDate: true,
        shippingAddress: true,
        createdAt: true,
        assignedShipperId: true,
        assignedShipper: {
          select: { id: true, name: true, avatarUrl: true, shipperProfile: true },
        },
        payments: { select: { provider: true, status: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return orders.map((o: any) => ({
      ...o,
      total: o.total != null ? o.total.toString() : null,
      assignedShipper: this.shippersService?.toPublicShipper(o.assignedShipper) || null,
    }));
  }

  /**
   * Hoàn tiền đa kênh: COD đã giao cho phép hoàn vào ví, BANK_TRANSFER qua SePay,
   * VNPay/MoMo/guest qua thủ công. Pending chiếm hạn mức chống hoàn vượt.
   */
  async requestRefund(
    orderId: string,
    dto: { reason: string; method?: string; bankInfo?: any; amount?: number },
    userId?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    const reason = (dto.reason || '').trim();
    if (!reason) throw new HttpException({ success: false, message: 'Lý do hoàn tiền là bắt buộc' }, HttpStatus.BAD_REQUEST);
    if (!([OrderStatus.DELIVERED, OrderStatus.COMPLETED, OrderStatus.FAILED, OrderStatus.CANCELED] as readonly OrderStatus[]).includes(order.status)) {
      throw new HttpException({ success: false, message: 'Đơn ở trạng thái này chưa thể yêu cầu hoàn tiền (chờ giao xong hoặc ghi nhận sự cố)' }, HttpStatus.BAD_REQUEST);
    }
    const paidPayments = (order.payments || []).filter((p) => String(p.status) === 'PAID');
    const paidTotal = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const providers = (order.payments || []).map((p: any) => String(p.provider));
    const isCodOrder = providers.includes('COD');
    const isCodDelivered = isCodOrder && ([OrderStatus.DELIVERED, OrderStatus.COMPLETED] as readonly OrderStatus[]).includes(order.status);
    // COD đã giao: tiền mặt đã thu qua shipper -> hạn mức = tổng đơn (cho hoàn vào ví)
    const maxRefundable = paidTotal > 0 ? paidTotal : isCodDelivered ? Number((order as any).total || 0) : 0;
    if (maxRefundable <= 0) {
      throw new HttpException(
        { success: false, message: 'Đơn chưa ghi nhận thanh toán thành công nên không có tiền để hoàn (COD chưa thu).' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const amount = dto.amount != null ? Math.max(0, Math.round(Number(dto.amount))) : maxRefundable;
    if (!amount || amount > maxRefundable) {
      throw new HttpException({ success: false, message: `Số tiền hoàn không hợp lệ (tối đa ${maxRefundable}₫)` }, HttpStatus.BAD_REQUEST);
    }
    // Pending chiếm hạn mức: còn lại = max - (COMPLETED + PENDING + APPROVED)
    const existing = await (this.prisma as any).refundRequest.findMany({ where: { orderId } });
    const occupied = (existing || [])
      .filter((r: any) => ['PENDING', 'APPROVED', 'COMPLETED'].includes(String(r.status)))
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const remainingQuota = maxRefundable - occupied;
    if (amount > remainingQuota) {
      throw new HttpException(
        { success: false, message: `Vượt hạn mức hoàn (còn lại ${Math.max(0, remainingQuota)}₫, đã giữ ${occupied}₫)` },
        HttpStatus.BAD_REQUEST,
      );
    }
    // Kênh sơ bộ + idempotency key
    const methodUpper = String(dto.method || 'MANUAL').toUpperCase();
    let channel: string;
    if (!(order as any).userId) channel = 'MANUAL';
    else if (methodUpper === 'WALLET') channel = 'WALLET';
    else if (providers.includes('BANK_TRANSFER')) channel = 'SEPAY';
    else if (providers.includes('WALLET') || isCodOrder) channel = 'WALLET';
    else channel = 'MANUAL';
    const seq = Date.now().toString(36);
    let idempotencyKey = `refund-${(order as any).code}-${seq}`.slice(0, 100);
    return (this.prisma as any).refundRequest.create({
      data: {
        orderId,
        amount: BigInt(amount),
        reason: reason.slice(0, 2000),
        method: String(dto.method || 'MANUAL').slice(0, 30),
        channel,
        idempotencyKey,
        bankInfo: dto.bankInfo ?? undefined,
        requestedBy: userId || null,
      },
    });
  }

  async listRefundRequests(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return (this.prisma as any).refundRequest.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }

  /** Admin duyệt (APPROVED) / từ chối (REJECTED) / hoàn tất (COMPLETED -> Order REFUNDED + Payment REFUNDED). */
  async reviewRefund(requestId: string, dto: { action: 'approve' | 'reject' | 'complete'; note?: string }, adminId?: string) {
    const req = await (this.prisma as any).refundRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
    if (dto.action === 'approve') {
      if (req.status !== 'PENDING') throw new HttpException({ success: false, message: 'Chỉ duyệt yêu cầu đang chờ' }, HttpStatus.BAD_REQUEST);
      return (this.prisma as any).refundRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedBy: adminId || null, reviewedNote: dto.note?.slice(0, 2000) || null },
      });
    }
    if (dto.action === 'reject') {
      if (req.status !== 'PENDING') throw new HttpException({ success: false, message: 'Chỉ từ chối yêu cầu đang chờ' }, HttpStatus.BAD_REQUEST);
      return (this.prisma as any).refundRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', reviewedBy: adminId || null, reviewedNote: dto.note?.slice(0, 2000) || null },
      });
    }
    // complete: đi qua RefundRouter (WALLET/SEPAY/MANUAL). Chỉ COMPLETED mới cộng sổ REFUNDED.
    if (req.status !== 'APPROVED') throw new HttpException({ success: false, message: 'Chỉ hoàn tất yêu cầu đã duyệt' }, HttpStatus.BAD_REQUEST);
    const order = await this.prisma.order.findUnique({ where: { id: req.orderId }, include: { payments: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    // Nếu có router (đã cài RefundModule): ủy quyền xử lý kênh thực tế
    if (this.refundRouter) {
      const result = await (this.refundRouter as any).processRefund(req, order);
      // Fallback MANUAL (SePay 422/offline): giữ APPROVED + failureReason, KHÔNG sang REFUNDED
      if (result?.needsManualFallback || result?.status === 'APPROVED') {
        return (this.prisma as any).refundRequest.findUnique({ where: { id: requestId } });
      }
      if (result?.status !== 'COMPLETED') {
        throw new HttpException(
          { success: false, message: result?.failureReason || 'Hoàn tiền thất bại, giữ nguyên để đối soát' },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    await this.prisma.payment.updateMany({ where: { orderId: req.orderId, status: PaymentStatus.PAID }, data: { status: PaymentStatus.REFUNDED } });
    try {
      await this.updateOrderStatus(req.orderId, { status: OrderStatus.REFUNDED, reason: `Hoàn tiền ${req.amount}₫: ${req.reason}` } as any, adminId, { skipPaymentCheck: true });
    } catch (e) {
      this.logger?.warn?.(`Refund complete ${req.id} -> REFUNDED thất bại: ${(e as Error).message}`);
      throw new HttpException({ success: false, message: `Không chuyển đơn sang hoàn tiền được: ${(e as Error).message}` }, HttpStatus.BAD_REQUEST);
    }
    return (this.prisma as any).refundRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', reviewedBy: adminId || null, reviewedNote: dto.note?.slice(0, 2000) || req.reviewedNote },
    });
  }

  // Update payment method
  async updatePaymentMethod(orderId: string, newPaymentMethod: string, userId?: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Only allow payment method change for PENDING or CONFIRMED orders
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new HttpException(
        { success: false, message: 'Chỉ có thể thay đổi phương thức thanh toán cho đơn hàng đang chờ xử lý hoặc đã xác nhận' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Check if payment exists
    if (!order.payments || order.payments.length === 0) {
      throw new HttpException(
        { success: false, message: 'Không tìm thấy thông tin thanh toán' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Update payment provider
    await this.prisma.payment.update({
      where: { id: order.payments[0].id },
      data: {
        provider: newPaymentMethod as any
      }
    });

    // Fetch updated order with full details
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        },
        payments: true
      }
    });

    // Log payment method change
    if (userId) {
      await this.auditLogService.log(
        AuditAction.ORDER_STATUS_CHANGE,
        AuditEntity.ORDER,
        userId,
        orderId,
        { action: 'payment_method_change', from: order.payments[0].provider, to: newPaymentMethod }
      );
    }

    return this.formatOrderResponse(updatedOrder);
  }

  // Cancel order
  async cancelOrder(orderId: string, userId?: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Check if user owns this order
    if (userId && order.userId !== userId) {
      throw new HttpException(
        { success: false, message: 'Bạn không có quyền hủy đơn hàng này' },
        HttpStatus.FORBIDDEN
      );
    }

    // Check if order can be cancelled
    if (order.status === OrderStatus.CANCELED) {
      throw new HttpException(
        { success: false, message: 'Đơn hàng đã bị hủy trước đó' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Đơn FAILED đã xả reservation ở bước vào FAILED — hủy nữa sẽ làm
    // reservedQuantity bị âm. Đơn đã xuất kho thì không hủy tay.
    if (!(PRE_FULFILLMENT_STATUSES as readonly OrderStatus[]).includes(order.status)) {
      throw new HttpException(
        { success: false, message: `Không thể hủy đơn hàng ở trạng thái "${getStatusLabel(order.status)}". Vui lòng liên hệ hỗ trợ.` },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!canUserCancel(order.status)) {
      throw new HttpException(
        { success: false, message: `Không thể hủy đơn hàng ở trạng thái "${getStatusLabel(order.status)}". Vui lòng liên hệ hỗ trợ.` },
        HttpStatus.BAD_REQUEST
      );
    }

    // Cancel order and restore stock
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      // Optimistic locking: chỉ hủy khi trạng thái chưa bị đổi bởi luồng
      // khác (vd webhook thanh toán vừa đánh PAID) kể từ lúc đọc order.
      const locked = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status: OrderStatus.CANCELED
        }
      });
      if (locked.count !== 1) {
        throw new HttpException(
          { success: false, message: 'Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại và thử lại' },
          HttpStatus.CONFLICT
        );
      }
      const updated = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          },
          payments: true
        }
      });

      // Đơn hủy tay luôn ở trạng thái chưa xuất kho (canUserCancel):
      // chỉ xả hàng đang giữ, On Hand giữ nguyên.
      const sortedCancelItems = [...order.items].sort((a: any, b: any) =>
        String(a.variantId).localeCompare(String(b.variantId))
      );
      for (const item of sortedCancelItems) {
        await this.releaseReservation(tx, item.variantId, item.quantity);
      }

      // Nhả serial đã gán cho đơn về lại kho
      await this.releaseOrderSerials(tx, orderId);

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELED,
          changedBy: userId || null,
          reason: 'Người dùng hủy đơn hàng'
        }
      });

      // Update payment status — giữ WALLET PAID để hoàn riêng, còn lại FAILED
      const walletPaid = ((updated as any).payments || []).filter(
        (p: any) => String(p.provider) === 'WALLET' && String(p.status) === 'PAID',
      );
      await tx.payment.updateMany({
        where: { orderId: orderId, NOT: { provider: 'WALLET' } },
        data: {
          status: PaymentStatus.FAILED
        }
      });
      // Tự hoàn ví ngay (ORDER_CANCEL_REFUND) nếu đơn đã trừ ví
      if (walletPaid.length > 0 && this.walletService && (updated as any).userId) {
        for (const wp of walletPaid) {
          const wAmt = Number(wp.amount || 0);
          if (wAmt > 0) {
            await (this.walletService as any).credit(
              (updated as any).userId,
              wAmt,
              `cancel-${orderId}-${wp.id}`.slice(0, 100),
              'ORDER_CANCEL_REFUND',
              `Hủy đơn ${(updated as any).code}: hoàn ${wAmt}₫ về ví`,
              orderId,
              tx,
            );
          }
        }
        await tx.payment.updateMany({
          where: { orderId, provider: 'WALLET' as any },
          data: { status: PaymentStatus.REFUNDED },
        });
      } else {
        await tx.payment.updateMany({
          where: { orderId: orderId, provider: 'WALLET' as any },
          data: { status: PaymentStatus.FAILED },
        });
      }

      return updated;
    });

    // Log cancellation
    if (userId) {
      await this.auditLogService.log(
        AuditAction.ORDER_CANCEL,
        AuditEntity.ORDER,
        userId,
        orderId,
        { code: order.code }
      );
    }

    return this.formatOrderResponse(cancelledOrder);
  }

  // Get all orders (admin)
  async getAllOrders(page: number = 1, limit: number = 20): Promise<{ orders: OrderResponseDto[], total: number, totalPages: number }> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          },
          payments: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          assignedShipper: { select: { id: true, name: true, avatarUrl: true, shipperProfile: true } }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.prisma.order.count()
    ]);

    return {
      orders: orders.map(order => this.formatOrderResponse(order)),
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Format order response
  private formatOrderResponse(order: any): OrderResponseDto {
    return {
      id: order.id,
      code: order.code,
      userId: order.userId,
      status: order.status,
      total: formatPrice(order.total),
      discountAmount: formatPrice(order.discountAmount || 0n),
      voucherCode: order.voucherCode || null,
      vatAmount: formatPrice(order.vatAmount),
      shippingFee: formatPrice(order.shippingFee),
      shippingCarrier: order.shippingCarrier ?? null,
      shippingOrderCode: order.shippingOrderCode ?? null,
      shippingStatus: order.shippingStatus ?? null,
      expectedDeliveryDate: order.expectedDeliveryDate ?? null,
      shippingFeeReal: order.shippingFeeReal == null ? null : formatPrice(order.shippingFeeReal),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user || null,
      assignedShipperId: order.assignedShipperId || null,
      assignedShipper: this.shippersService?.toPublicShipper(order.assignedShipper) || null,
      items: order.items?.map((item: any) => ({
        id: item.id,
        variantId: item.variantId,
        price: formatPrice(item.price),
        quantity: item.quantity,
        variant: item.variant ? {
          ...item.variant,
          price: formatPrice(item.variant.price)
        } : null
      })) || [],
      payments: order.payments?.map((payment: any) => ({
        ...payment,
        amount: formatPrice(payment.amount)
      })) || []
    };
  }
}
