import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "src/prismaClient/prisma.service";
import { ShippingService } from "../shipping/shipping.service";
import { WalletService } from "../wallet/wallet.service";
import { RefundRouterService } from "../refund/refund-router.service";
import { ShippersService } from "../shippers/shippers.service";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { VoucherService } from "../vouchers/voucher.service";
import { EmailService } from "../email/email.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  AuditLogService,
  AuditAction,
  AuditEntity,
} from "../audit-log/audit-log.service";
import { formatPrice, getEffectivePrice } from "src/utils/price.util";
import {
  validateTransition,
  shouldReleaseReservation,
  shouldRestoreOnHand,
  canUserCancel,
  getStatusLabel,
  PRE_FULFILLMENT_STATUSES,
} from "./order-status.helper";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly shippingService: ShippingService,
    // Optional để không vỡ khi module chưa kịp import trong test cũ
    @Optional()
    @Inject(forwardRef(() => WalletService))
    private readonly walletService?: WalletService,
    @Optional()
    @Inject(forwardRef(() => RefundRouterService))
    private readonly refundRouter?: RefundRouterService,
    @Optional()
    @Inject(forwardRef(() => ShippersService))
    private readonly shippersService?: ShippersService,
    @Optional()
    @Inject(forwardRef(() => LoyaltyService))
    private readonly loyaltyService?: LoyaltyService,
    @Optional()
    @Inject(forwardRef(() => VoucherService))
    private readonly voucherService?: VoucherService,
    @Optional()
    @Inject(forwardRef(() => EmailService))
    private readonly emailService?: EmailService,
  ) {}

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
        where: { variantId: item.variantId, status: "IN_STOCK" },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: item.quantity,
        select: { id: true },
      });
      if (serials.length === 0) continue;
      await tx.serialNumber.updateMany({
        where: { id: { in: serials.map((s: any) => s.id) } },
        data: { status: "SOLD", orderId } as any,
      });
    }
  }

  /** Nhả serial đã gán cho đơn về lại kho (khi hủy/hoàn tồn). */
  private async releaseOrderSerials(tx: any, orderId: string) {
    await tx.serialNumber.updateMany({
      where: { orderId, status: "SOLD" },
      data: { status: "IN_STOCK", orderId: null } as any,
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
      orderBy: { createdAt: "asc" },
    });
    return { ...this.formatOrderResponse(order), serials } as any;
  }

  private generateOrderCode(): string {
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 chữ số: 100000 -> 999999
    return `ORD${randomNum}`;
  }

  // Create new order
  async createOrder(
    createOrderDto: CreateOrderDto,
    userId?: string,
  ): Promise<OrderResponseDto> {
    const { cartId, shipping, paymentMethod, totals, voucherCode } =
      createOrderDto;
    if (userId) {
      const buyer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (buyer && ["SHIPPER", "SUPPLIER"].includes(String(buyer.role))) {
        throw new HttpException(
          {
            success: false,
            message:
              "Tài khoản Shipper/Nhà cung cấp không được phép đặt mua hàng",
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }
    const useWalletRaw = Math.max(
      0,
      Math.round(Number((createOrderDto as any).useWalletAmount || 0)),
    );

    // Get cart with items
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new HttpException(
        { success: false, message: "Giỏ hàng trống hoặc không tồn tại" },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Không check tồn ở đây nữa: việc giữ hàng làm atomic ngay trong
    // transaction bên dưới để chống oversell khi checkout đồng thời.

    // Create order in transaction with extended timeout (15s instead of default 5s)
    const order = await this.prisma.$transaction(
      async (tx) => {
        // Create order
        // Tính lại tiền hàng + VAT từ giá hiệu lực tại thời điểm đặt (sale hết
        // hạn thì về giá gốc), tránh lệch khi sale đổi giữa lúc xem và lúc chốt.
        const serverSubtotal = cart.items.reduce(
          (sum, item) =>
            sum +
            getEffectivePrice(item.variant as any) * Number(item.quantity || 0),
          0,
        );
        const serverTax = Math.round(serverSubtotal * 0.1);
        const serverShipping = Math.max(0, Math.round(totals.shippingFee || 0));
        // Giảm giá do client gửi lên nhưng kẹp không vượt quá giá trị đơn để
        // chống request giả mạo (voucher đã validate lúc áp mã ở checkout).
        const discount = Math.min(
          Math.max(0, Math.round(totals.discount || 0)),
          serverSubtotal + serverTax + serverShipping,
        );
        const totalRounded = Math.max(
          0,
          serverSubtotal + serverTax + serverShipping - discount,
        );
        const effectiveOwner = userId || (cart as any).userId;
        if (voucherCode && !effectiveOwner) {
          throw new HttpException(
            {
              success: false,
              message: "Vui lòng đăng nhập để sử dụng mã khuyến mãi",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        let useWallet = useWalletRaw;
        if (useWallet > 0) {
          if (!effectiveOwner) {
            throw new HttpException(
              {
                success: false,
                message: "Khách vãng lai không dùng được ví MegaMart",
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          if (!this.walletService) {
            throw new HttpException(
              { success: false, message: "Ví chưa khả dụng, thử lại sau" },
              HttpStatus.BAD_REQUEST,
            );
          }
          useWallet = Math.min(useWallet, totalRounded);
        }
        const remaining = totalRounded - useWallet;
        const paymentCreates: any[] = [];
        if (useWallet > 0) {
          paymentCreates.push({
            provider: "WALLET",
            amount: BigInt(useWallet),
            currency: "VND",
            status: PaymentStatus.PAID,
          });
        }
        if (remaining > 0) {
          paymentCreates.push({
            provider: paymentMethod,
            amount: BigInt(remaining),
            currency: "VND",
            status: PaymentStatus.PENDING,
          });
        }
        if (paymentCreates.length === 0) {
          paymentCreates.push({
            provider: paymentMethod,
            amount: BigInt(totalRounded),
            currency: "VND",
            status: PaymentStatus.PENDING,
          });
        }
        const newOrder = await tx.order.create({
          data: {
            code: this.generateOrderCode(),
            userId: userId || cart.userId,
            status: remaining === 0 ? OrderStatus.PAID : OrderStatus.PENDING,
            total: BigInt(totalRounded),
            discountAmount: BigInt(discount),
            voucherCode: voucherCode || null,
            vatAmount: BigInt(serverTax),
            shippingFee: BigInt(serverShipping),
            shippingAddress: shipping as any,
            billingAddress: shipping as any,
            items: {
              create: cart.items.map((item) => ({
                variantId: item.variantId,
                // Lưu đơn giá thực trả (sale còn hạn mới tính, hết hạn về giá gốc).
                price: BigInt(
                  Math.round(getEffectivePrice(item.variant as any) || 0),
                ),
                quantity: item.quantity,
              })),
            },
            payments: {
              create: paymentCreates,
            },
          } as any,
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            payments: true,
          },
        });
        // Trừ ví trong cùng transaction tạo đơn (atomic với giữ hàng)
        if (useWallet > 0 && effectiveOwner) {
          await (this.walletService as any).debit(
            effectiveOwner,
            useWallet,
            newOrder.id,
            "PAYMENT",
            `Thanh toán đơn ${newOrder.code} bằng ví (${useWallet}₫)`,
            tx,
          );
        }

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
          String(a.variantId).localeCompare(String(b.variantId)),
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
                message: `Sản phẩm "${(item as any).variant?.product?.name || item.variantId}" không đủ số lượng khả dụng trong kho`,
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        // Gán serial IN_STOCK cũ nhất cho đơn (best-effort: hàng legacy
        // không có serial thì thôi, không chặn đặt hàng)
        await this.assignSerialsToOrder(
          tx,
          newOrder.id,
          cart.items.map((item: any) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        );

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // Nếu đơn có voucher, ghi nhận tiêu thụ thật trong DB
        if (voucherCode && effectiveOwner && this.voucherService) {
          await this.voucherService
            .consume(
              voucherCode,
              effectiveOwner,
              newOrder.id,
              serverSubtotal,
              tx,
            )
            .catch((e) => {
              this.logger.error(
                `Consume voucher ${voucherCode} failed: ${e.message}`,
              );
              // Vẫn cho tạo đơn nếu consume fail? Thường nên fail cả transaction
              throw e;
            });
        }

        return newOrder;
      },
      {
        maxWait: 5000, // Chờ tối đa 5s để lấy connection từ pool
        timeout: 15000, // Cho phép transaction chạy tối đa 15s (thay vì mặc định 5s)
      },
    );

    // Log creation
    const effectiveUserId = userId || cart.userId;
    if (effectiveUserId) {
      await this.auditLogService.log(
        AuditAction.ORDER_CREATE,
        AuditEntity.ORDER,
        effectiveUserId,
        order.id,
        { code: order.code, total: order.total.toString() },
      );
    }

    // Đơn trả đủ bằng ví sinh ra đã PAID ngay: gửi hóa đơn luôn (dedup bên trong).
    if (order.status === OrderStatus.PAID) {
      void this.emailService?.sendInvoice(order.id).catch(() => {});
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
                    images: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedShipper: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            shipperProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return orders.map((order) => this.formatOrderResponse(order));
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
                    images: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedShipper: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            shipperProfile: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Không tìm thấy đơn hàng");
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
                    images: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedShipper: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            shipperProfile: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Không tìm thấy đơn hàng");
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
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Không tìm thấy đơn hàng");
    }

    const newStatus = updateOrderDto.status;

    if (!newStatus) {
      throw new HttpException(
        { success: false, message: "Trạng thái mới là bắt buộc" },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check payment status for non-COD orders (mix-payment)
    const hasPendingOnlinePayment = (order.payments || []).some(
      (p) =>
        !["COD", "OTHER", "WALLET"].includes(String(p.provider)) &&
        p.status === PaymentStatus.PENDING,
    );

    // Allow update if:
    // 1. Cancelling or Failing order
    // 2. Marking as PAID (confirming payment manually)
    const isAllowedUpdate =
      newStatus === OrderStatus.CANCELED ||
      newStatus === OrderStatus.FAILED ||
      newStatus === OrderStatus.PAID;

    if (!isAllowedUpdate && !opts.skipPaymentCheck && hasPendingOnlinePayment) {
      throw new HttpException(
        {
          success: false,
          message:
            "Đơn hàng chưa hoàn tất thanh toán online. Vui lòng cập nhật trạng thái đã thanh toán (PAID) trước khi xử lý.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const currentStatus = order.status;

    // Validate state transition
    validateTransition(currentStatus, newStatus);

    // Use transaction to update order and create history
    let codCollected = false;
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      // If status is PAID, also update payment status
      if (newStatus === OrderStatus.PAID) {
        await tx.payment.updateMany({
          where: { orderId: orderId },
          data: {
            status: PaymentStatus.PAID,
          },
        });

        // Refresh payment info in returned object
        if (updated.payments) {
          updated.payments.forEach((p) => (p.status = PaymentStatus.PAID));
        }
      }

      // Đơn vừa giao xong: COD thu tiền mặt được đánh PAID ngay trong
      // transaction — dù shipper chụp POD, GHN báo delivered hay admin bấm tay.
      if (newStatus === OrderStatus.DELIVERED) {
        const marked = await tx.payment.updateMany({
          where: {
            orderId: orderId,
            status: PaymentStatus.PENDING,
            provider: { in: ["COD", "OTHER"] as any },
          },
          data: { status: PaymentStatus.PAID },
        });
        codCollected = marked.count > 0;
        if (codCollected && updated.payments) {
          updated.payments.forEach((p) => {
            if (
              String(p.status) !== "PAID" &&
              ["COD", "OTHER"].includes(String(p.provider))
            ) {
              p.status = PaymentStatus.PAID;
            }
          });
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
          note: updateOrderDto.note || null,
        },
      });

      // Khi đơn bắt đầu vào luồng xử lý/giao hàng, tự gán shipper active ít đơn nhất.
      if (
        newStatus === OrderStatus.PROCESSING ||
        newStatus === OrderStatus.SHIPPING
      ) {
        const assignedId = await this.assignRandomShipperIfNeeded(
          orderId,
          tx,
          userId || updateOrderDto.changedBy || "SYSTEM",
        );
        if (assignedId) (updated as any).assignedShipperId = assignedId;
      }

      // Sắp xếp theo variantId để tránh deadlock giữa các transaction.
      const sortedItems = [...order.items].sort((a: any, b: any) =>
        String(a.variantId).localeCompare(String(b.variantId)),
      );
      // Xuất kho khi giao hàng: trừ On Hand + xả Reserved cùng lúc
      // (Available = stock - reserved nên không đổi ở bước này).
      if (newStatus === OrderStatus.SHIPPING) {
        for (const item of sortedItems) {
          await tx.variant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
          await this.releaseReservation(tx, item.variantId, item.quantity);
        }
        await tx.order.update({
          where: { id: orderId },
          data: { shippingStatus: "delivering" },
        });
        (updated as any).shippingStatus = "delivering";
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
                increment: item.quantity,
              },
            },
          });
        }
        // Nhả serial đã gán cho đơn về lại kho
        await this.releaseOrderSerials(tx, orderId);
      }

      // Đơn hủy/thất bại/hoàn tiền: hoàn voucher đã dùng (nếu có) để khách
      // đặt lại được. release() idempotent nên gọi lại cũng an toàn.
      if (
        newStatus === OrderStatus.CANCELED ||
        newStatus === OrderStatus.FAILED ||
        newStatus === OrderStatus.REFUNDED
      ) {
        await this.voucherService?.release(orderId, tx);
      }

      // Đơn giao thành công: đồng bộ shippingStatus để badge/timeline hiện
      // "Giao thành công" — đường POD nội bộ không có webhook GHN delivered.
      if (newStatus === OrderStatus.DELIVERED) {
        await tx.order.update({
          where: { id: orderId },
          data: { shippingStatus: "delivered" },
        });
        (updated as any).shippingStatus = "delivered";
      }

      // Khi đơn hoàn tất / giao thành công, cộng điểm loyalty
      if (
        [OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(
          newStatus as any,
        )
      ) {
        await this.loyaltyService?.awardOrderPoints(orderId, tx);
      }

      return updated;
    });

    // Ghi event "Đang giao hàng" sau commit để timeline phản ánh ngay khi chuyển
    // trạng thái, không phải chờ GHN webhook (GHN ngoài thực tế có thể vẫn ở
    // ready_to_pick hoặc bắn retry muộn làm timeline tụt lùi). Viết best-effort
    // ngoài transaction để lỗi ghi timeline không bao giờ poison/kéo sập
    // transaction đổi trạng thái (lỗi 25P02 của Postgres).
    if (newStatus === OrderStatus.SHIPPING) {
      try {
        const dup = await (this.prisma as any).shipmentEvent.findFirst({
          where: { orderId, status: "delivering" },
          select: { id: true },
        });
        if (!dup) {
          await (this.prisma as any).shipmentEvent.create({
            data: {
              orderId,
              ghnCode: (updatedOrder as any).shippingOrderCode ?? null,
              status: "delivering",
              kind: "TRACKING",
              message:
                updateOrderDto.reason ||
                updateOrderDto.note ||
                "Đang giao hàng (bàn giao vận chuyển)",
              occurredAt: new Date(),
              raw: { synthetic: true, action: "STATUS_TO_SHIPPING" },
              createdBy: userId || updateOrderDto.changedBy || "SYSTEM",
            },
          });
        }
      } catch (e) {
        this.logger?.warn?.(
          `Synthetic delivering event skipped (${order.code}): ${(e as Error).message}`,
        );
      }
    }

    let ghnJustCreated = false;
    if (
      newStatus === OrderStatus.CONFIRMED &&
      !(order as any).shippingOrderCode
    ) {
      try {
        // Tự tạo vận đơn GHN. Nếu thất bại (do thiếu địa chỉ GHN), vẫn cho phép
        // lên CONFIRMED để admin bổ sung địa chỉ và bấm tạo lại sau.
        await this.createGhnShipment(
          orderId,
          { note: updateOrderDto.note },
          userId || updateOrderDto.changedBy,
        );
        ghnJustCreated = true;
      } catch (e) {
        this.logger.warn(
          `Tự tạo vận đơn GHN cho đơn ${order.code} thất bại (admin có thể tạo lại thủ công): ${(e as Error).message}`,
        );
      }
    }
    // createGhnShipment đã ghi mã GHN xuống DB: đọc lại để response trả về
    // có mã vận đơn ngay, admin khỏi phải F5.
    let responseOrder: any = updatedOrder;
    if (ghnJustCreated) {
      const refreshed = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          shippingOrderCode: true,
          shippingStatus: true,
          expectedDeliveryDate: true,
        },
      });
      if (refreshed) {
        responseOrder = { ...updatedOrder, ...refreshed };
      }
    }

    // Log status change
    if (userId) {
      await this.auditLogService.log(
        AuditAction.ORDER_STATUS_CHANGE,
        AuditEntity.ORDER,
        userId,
        orderId,
        { from: currentStatus, to: newStatus, note: updateOrderDto.note },
      );
    }

    // Ghi nhận thu COD để kế toán đối soát ai/khi nào thu tiền.
    if (codCollected) {
      await this.prisma.orderStatusHistory
        .create({
          data: {
            orderId,
            fromStatus: OrderStatus.DELIVERED,
            toStatus: OrderStatus.DELIVERED,
            changedBy: userId || (updateOrderDto as any).changedBy || "SYSTEM",
            reason: "Thu COD thành công khi giao hàng",
          },
        })
        .catch((e: any) =>
          this.logger?.warn?.(`Không ghi được lịch sử thu COD: ${e?.message}`),
        );
    }

    // Gửi hóa đơn/biên lai nền khi đơn vừa được thanh toán hoặc vừa giao
    // xong (COD thu tiền). Dedup nằm trong EmailService nên gọi lại an toàn.
    if (newStatus === OrderStatus.PAID) {
      void this.emailService?.sendInvoice(orderId).catch(() => {});
    } else if (newStatus === OrderStatus.DELIVERED) {
      void this.emailService
        ?.sendInvoice(orderId, { receipt: true })
        .catch(() => {});
    } else if (newStatus === OrderStatus.SHIPPING) {
      void this.emailService?.sendShipmentUpdate(orderId, "shipped").catch(() => {});
    }

    // Đơn thất bại/hủy/hoàn tiền cũng phải có dòng trên timeline vận chuyển.
    if (
      newStatus === OrderStatus.FAILED ||
      newStatus === OrderStatus.REFUNDED ||
      newStatus === OrderStatus.CANCELED
    ) {
      const label =
        newStatus === OrderStatus.FAILED
          ? "Giao hàng thất bại"
          : newStatus === OrderStatus.REFUNDED
            ? "Đơn hàng đã hoàn tiền"
            : "Đơn hàng đã hủy";
      await (this.prisma as any).shipmentEvent
        .create({
          data: {
            orderId,
            ghnCode: (responseOrder as any)?.shippingOrderCode ?? null,
            status: String(newStatus).toLowerCase(),
            kind: "TRACKING",
            message: updateOrderDto.reason
              ? `${label}: ${updateOrderDto.reason}`
              : label,
            createdBy: userId || (updateOrderDto as any).changedBy || null,
          },
        })
        .catch((e: any) =>
          this.logger?.warn?.(`Không ghi được event ${newStatus}: ${e?.message}`),
        );
    }

    return this.formatOrderResponse(responseOrder);
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
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    if (order.shippingOrderCode) {
      throw new HttpException(
        {
          success: false,
          message: `Đơn đã có vận đơn GHN ${order.shippingOrderCode}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING
    ) {
      throw new HttpException(
        {
          success: false,
          message: "Chỉ tạo đơn GHN cho đơn hàng đã xác nhận/đang xử lý",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Admin có thể bổ sung mã GHN cho đơn cũ thiếu ngay trong modal.
    const shippingAddress = {
      ...((order.shippingAddress as any) || {}),
      ...(opts.provinceId != null
        ? { provinceId: Number(opts.provinceId) }
        : {}),
      ...(opts.districtId != null
        ? { districtId: Number(opts.districtId) }
        : {}),
      ...(opts.wardCode != null ? { wardCode: String(opts.wardCode) } : {}),
    };
    const created = await this.shippingService.createGhnOrder(
      {
        id: order.id,
        code: order.code,
        total: order.total,
        shippingAddress,
        payments: order.payments.map((p) => ({
          provider: String(p.provider),
          status: String(p.status),
          amount: p.amount,
        })),
        items: order.items.map((i) => ({
          quantity: i.quantity,
          price: i.price,
          variant: i.variant
            ? { product: { name: i.variant.product?.name } }
            : null,
        })),
      },
      opts,
    );

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shippingCarrier: "GHN",
        shippingAddress: shippingAddress,
        shippingOrderCode: created.orderCode,
        shippingFeeReal: BigInt(Math.round(created.fee)),
        shippingStatus: "ready_to_pick",
        expectedDeliveryDate: created.expectedDelivery
          ? new Date(created.expectedDelivery)
          : null,
        shippingMetadata: {
          ...(typeof order.shippingMetadata === "object" &&
          order.shippingMetadata !== null
            ? (order.shippingMetadata as any)
            : {}),
          created: created.metadata,
        } as any,
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
  async cancelGhnShipment(
    orderId: string,
    adminId?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    if (!order.shippingOrderCode) {
      throw new HttpException(
        { success: false, message: "Đơn chưa có vận đơn GHN" },
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
        shippingStatus: "cancel",
        shippingMetadata: {
          ...(typeof order.shippingMetadata === "object" &&
          order.shippingMetadata !== null
            ? (order.shippingMetadata as any)
            : {}),
          cancelledCodes: [
            ...(((order.shippingMetadata as any)?.cancelledCodes as string[]) ||
              []),
            cancelledCode,
          ],
        },
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
   * Lấy link in vận đơn GHN và đánh dấu đã in trong metadata.
   */
  async printGhnShipment(orderId: string, adminId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    if (!order.shippingOrderCode) {
      throw new HttpException(
        { success: false, message: "Đơn chưa có mã vận đơn GHN để in" },
        HttpStatus.BAD_REQUEST,
      );
    }

    const print = await this.shippingService.printGhnOrder(
      order.shippingOrderCode,
    );
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shippingMetadata: {
          ...(typeof order.shippingMetadata === "object" &&
          order.shippingMetadata !== null
            ? (order.shippingMetadata as any)
            : {}),
          printed: true,
          printedAt: new Date().toISOString(),
          lastPrintToken: print.token,
        },
      },
    });
    await this.prisma.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: adminId || null,
        reason: `In vận đơn GHN ${order.shippingOrderCode}`,
      },
    });
    return print;
  }

  /**
   * Admin bàn giao cho shipper -> đơn chuyển sang đang giao hàng.
   * - Có vận đơn GHN: yêu cầu đã in vận đơn (giữ nguyên luồng cũ).
   * - Giao nội bộ bằng shipper nhà (không có mã GHN): cho bàn giao thẳng.
   */
  async handoverToShipper(
    orderId: string,
    shipperId?: string,
    adminId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const useGhn = !!order.shippingOrderCode;
    if (useGhn) {
      const metadata =
        typeof order.shippingMetadata === "object" &&
        order.shippingMetadata !== null
          ? (order.shippingMetadata as any)
          : {};
      if (!metadata.printed) {
        throw new HttpException(
          {
            success: false,
            message: "Vui lòng in vận đơn GHN trước khi bàn giao shipper",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (shipperId) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { assignedShipperId: shipperId } as any,
      });
      const picked = await this.prisma.user.findUnique({
        where: { id: shipperId },
        select: { name: true, email: true },
      });
      await (this.prisma as any).shipmentEvent
        .create({
          data: {
            orderId,
            status: "assign_shipper",
            kind: "TRACKING",
            message: `Admin chỉ định shipper ${picked?.name || picked?.email || ""}`.trim(),
            createdBy: adminId || null,
          },
        })
        .catch((e: any) =>
          this.logger?.warn?.(`Không ghi được event chỉ định shipper: ${e?.message}`),
        );
    }
    return this.updateOrderStatus(
      orderId,
      {
        status: OrderStatus.SHIPPING,
        reason: useGhn
          ? "Đã in vận đơn và bàn giao shipper"
          : "Bàn giao shipper nhà (giao nội bộ, không qua GHN)",
      } as any,
      adminId,
      { skipPaymentCheck: true },
    );
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
    const status = String(payload.status || "").toLowerCase();
    if (!status) return;
    // Tìm đơn: ưu tiên mã shop, fallback mã vận đơn GHN.
    let order = payload.clientCode
      ? await this.prisma.order.findUnique({
          where: { code: payload.clientCode },
        })
      : null;
    if (!order && payload.ghnCode) {
      order = await this.prisma.order.findFirst({
        where: { shippingOrderCode: payload.ghnCode },
      });
    }
    if (!order) {
      this.logger?.warn?.(
        `GHN webhook cho mã lạ: ${payload.clientCode || payload.ghnCode}`,
      );
      return;
    }

    let expectedDeliveryDate: Date | undefined;
    const ed = payload.expectedDelivery;
    if (ed != null && ed !== "") {
      const num = typeof ed === "number" ? ed : Number(ed);
      if (!isNaN(num) && num > 0) {
        expectedDeliveryDate = new Date(num < 1e12 ? num * 1000 : num);
      } else {
        const d = new Date(String(ed));
        if (!isNaN(d.getTime())) expectedDeliveryDate = d;
      }
    }

    // occurredAt cho idempotency: ưu tiên payload, fallback field thời gian trong raw GHN.
    let occurredAt: Date | null = null;
    const rawData = payload.raw?.data ?? payload.raw ?? {};
    const timeCandidates = [
      payload.occurredAt,
      rawData?.UpdatedDate,
      rawData?.updated_date,
      rawData?.CreatedDate,
      rawData?.created_date,
      rawData?.Time,
      rawData?.time,
    ];
    for (const t of timeCandidates) {
      if (t == null || t === "") continue;
      const num = typeof t === "number" ? t : Number(t);
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
      const existing = await (this.prisma as any).shipmentEvent.findFirst({
        where: dupWhere,
      });
      if (existing && occurredAt) {
        return;
      }

      const INCIDENT_STATUSES = [
        "delivery_fail",
        "lost",
        "damage",
        "exception",
      ];
      const RETURN_STATUSES = [
        "waiting_to_return",
        "return",
        "return_transporting",
        "return_sorting",
        "returning",
        "return_fail",
        "returned",
      ];
      const kind =
        INCIDENT_STATUSES.includes(status) || RETURN_STATUSES.includes(status)
          ? "INCIDENT"
          : "TRACKING";

      // GHN hay bắn lại webhook cũ (retry) và bắn muộn trạng thái cũ sau khi đã giao.
      // Chặn 2 trường hợp để timeline/badge không bị spam và không tụt lùi:
      // (kind suy ra 1-1 từ status nên chỉ cần so status).
      const effectiveGhnCode = payload.ghnCode
        ? String(payload.ghnCode)
        : (order.shippingOrderCode ?? null);
      // So dedup với event vận chuyển gần nhất (bỏ qua ghi chú tay và vị trí
      // shipper vì chúng xen giữa làm đứt chuỗi "trùng liên tiếp" ở rule 1).
      const latest = await (this.prisma as any).shipmentEvent.findFirst({
        where: {
          orderId: order.id,
          status: { notIn: ["note", "shipper_location"] },
        },
        orderBy: { createdAt: "desc" },
      });
      const sameJourney =
        !effectiveGhnCode ||
        !latest?.ghnCode ||
        String(latest.ghnCode) === effectiveGhnCode;
      // Event tổng hợp "delivering" do chuyển SHIPPING tạo ra: webhook delivering
      // thật từ GHN tới sau thì enrich vào record đó, không tạo dòng mới.
      let skipCreate = false;
      // 1. Trùng liên tiếp cùng trạng thái trên cùng hành trình -> retry, bỏ qua.
      if (latest && latest.status === status && sameJourney) {
        if (status === "delivering" && latest.raw?.synthetic === true) {
          try {
            // Merge raw để giữ cờ synthetic (webhook delivering kế tiếp còn nhận
            // diện được mà không tạo trùng).
            const prevRaw = latest.raw;
            const incomingRaw = (payload as any).raw;
            const mergedRaw =
              prevRaw &&
              typeof prevRaw === "object" &&
              incomingRaw &&
              typeof incomingRaw === "object"
                ? { ...prevRaw, ...incomingRaw }
                : (incomingRaw ?? prevRaw);
            await (this.prisma as any).shipmentEvent.update({
              where: { id: latest.id },
              data: {
                occurredAt: occurredAt ?? latest.occurredAt ?? new Date(),
                ghnCode: effectiveGhnCode ?? latest.ghnCode ?? null,
                raw: mergedRaw,
              },
            });
            // Rơi tiếp xuống cập nhật expectedDeliveryDate/metadata, nhưng bỏ qua
            // bước tạo event mới để timeline không có 2 dòng "Đang giao hàng".
            skipCreate = true;
          } catch {
            return;
          }
        } else {
          return;
        }
      }
      // 1b. Webhook giai đoạn trước giao hàng đến sau khi đơn đã vào luồng giao
      // hàng -> stale/retry, bỏ qua để timeline không tụt lùi (vd GHN bắn lại
      // ready_to_pick sau khi đã delivering).
      if (
        [
          "ready_to_pick",
          "picking",
          "money_collect_picking",
          "picked",
          "storing",
          "transporting",
          "sorting",
        ].includes(status) &&
        sameJourney
      ) {
        const journeyFilter =
          effectiveGhnCode != null
            ? { ghnCode: String(effectiveGhnCode) }
            : { ghnCode: null };
        const alreadyShipping =
          (
            [
              OrderStatus.SHIPPING,
              OrderStatus.DELIVERED,
              OrderStatus.COMPLETED,
            ] as OrderStatus[]
          ).includes(order.status) ||
          (await (this.prisma as any).shipmentEvent.findFirst({
            where: {
              orderId: order.id,
              status: "delivering",
              ...journeyFilter,
            },
            select: { id: true },
          }));
        if (alreadyShipping) {
          return;
        }
      }
      // 2. Trạng thái đầu/giữa hành trình đến muộn sau khi đã giao -> bỏ qua.
      // Không chỉ soi event mới nhất (admin có thể ghi chú sau khi giao), mà kiểm tra
      // trạng thái đơn + toàn bộ lịch sử đã từng giao.
      const EARLY_STATUSES = new Set([
        "ready_to_pick",
        "picking",
        "picked",
        "storing",
        "transporting",
        "sorting",
        "delivering",
        "money_collect_picking",
        "money_collect_delivering",
      ]);
      if (EARLY_STATUSES.has(status) && sameJourney) {
        const deliveredBefore =
          order.status === OrderStatus.DELIVERED ||
          order.status === OrderStatus.COMPLETED ||
          String(order.shippingStatus || "").toLowerCase() === "delivered" ||
          (await (this.prisma as any).shipmentEvent.findFirst({
            where: {
              orderId: order.id,
              OR: [{ kind: "POD" }, { status: "delivered" }, { status: "pod" }],
            },
            select: { id: true },
          }));
        if (deliveredBefore) {
          return;
        }
      }

      if (!skipCreate) {
        await (this.prisma as any).shipmentEvent.create({
          data: {
            orderId: order.id,
            ghnCode: payload.ghnCode
              ? String(payload.ghnCode)
              : (order.shippingOrderCode ?? null),
            status,
            kind,
            occurredAt,
            raw: payload.raw,
          },
        });
      }
    } catch (e) {
      this.logger?.warn?.(
        `ShipmentEvent write skipped (${order.code}): ${(e as Error).message}`,
      );
    }

    // Tránh badge GHN báo "delivered" trong khi đơn chưa DELIVERED bởi shipper nhà.
    const safeShippingStatus =
      status === "delivered" &&
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.COMPLETED
        ? order.shippingStatus
        : status;
    // Đọc lại metadata mới nhất để không ghi đè dữ liệu luồng khác vừa ghi
    // (GPS shipper, cờ mail...) bằng snapshot cũ đọc từ đầu hàm.
    const freshMeta = await this.prisma.order.findUnique({
      where: { id: order.id },
      select: { shippingMetadata: true },
    });
    const freshMetadata =
      typeof freshMeta?.shippingMetadata === "object" &&
      freshMeta?.shippingMetadata !== null
        ? (freshMeta.shippingMetadata as any)
        : {};
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        shippingStatus: safeShippingStatus,
        expectedDeliveryDate,
        shippingMetadata: {
          ...freshMetadata,
          lastWebhook: payload.raw,
        },
      },
    });

    // Giao thất bại: báo khách ngay để hẹn lại (dedup theo lý do bên trong).
    if (status === "delivery_fail") {
      const rawData = payload.raw?.data ?? payload.raw ?? {};
      const reason =
        rawData?.Reason ||
        rawData?.Description ||
        rawData?.reason ||
        rawData?.Note ||
        undefined;
      void this.emailService
        ?.sendShipmentUpdate(order.id, "failed", {
          reason: typeof reason === "string" ? reason : undefined,
        })
        .catch(() => {});
    }

    // Chế độ mặc định: shipper nhà làm chuẩn trạng thái đơn. Webhook GHN
    // chỉ ghi timeline tham khảo ở trên, không tự đổi order.status,
    // không tự đánh COD PAID. Bật GHN_WEBHOOK_STATUS_SYNC=true để về
    // hành vi cũ (GHN tự đẩy trạng thái đơn).
    if (process.env.GHN_WEBHOOK_STATUS_SYNC !== "true") {
      this.logger?.log?.(
        `[GHN Webhook] Timeline-only mode: recorded event ${status} for ${order.code}, skipped order status sync`,
      );
      return;
    }

    // Webhook do admin tạo đơn mà ra nên được bypass guard thanh toán.
    const moveTo = async (s: OrderStatus, reason?: string) => {
      try {
        await this.updateOrderStatus(
          order.id,
          { status: s, reason } as any,
          undefined,
          { skipPaymentCheck: true },
        );
        order.status = s;
      } catch (e) {
        this.logger?.warn?.(
          `GHN auto-transition ${order.code} -> ${s} thất bại: ${(e as Error).message}`,
        );
      }
    };

    // Đi từng nấc để qua được VALID_TRANSITIONS (CONFIRMED->PROCESSING->SHIPPING->DELIVERED).
    if (
      [
        "picking",
        "picked",
        "storing",
        "transporting",
        "sorting",
        "delivering",
        "money_collect_picking",
        "money_collect_delivering",
      ].includes(status)
    ) {
      if (order.status === OrderStatus.CONFIRMED)
        await moveTo(OrderStatus.PROCESSING);
      if (order.status === OrderStatus.PROCESSING)
        await moveTo(OrderStatus.SHIPPING);
    } else if (status === "delivered") {
      // COD đánh PAID nằm trong updateOrderStatus (chỉ khi DELIVERED thật).
      if (order.status === OrderStatus.CONFIRMED)
        await moveTo(OrderStatus.PROCESSING);
      if (order.status === OrderStatus.PROCESSING)
        await moveTo(OrderStatus.SHIPPING);
      if (order.status === OrderStatus.SHIPPING) {
        await moveTo(OrderStatus.DELIVERED);
      }
    } else if (status === "delivery_fail") {
      // Giữ SHIPPING để giao lại, chỉ ghi INCIDENT (đã ghi ở trên).
      if (order.status === OrderStatus.CONFIRMED)
        await moveTo(OrderStatus.PROCESSING);
      if (order.status === OrderStatus.PROCESSING)
        await moveTo(OrderStatus.SHIPPING);
    } else if (["lost", "damage"].includes(status)) {
      if (order.status === OrderStatus.SHIPPING) {
        await moveTo(
          OrderStatus.FAILED,
          `GHN báo ${status === "lost" ? "thất lạc" : "hư hỏng"} (${order.shippingOrderCode || ""})`,
        );
      }
    }
    // Nhóm return: chỉ ghi event, admin quyết hoàn tiền thủ công.
  }

  /**
   * Khách tự xác nhận đã nhận hàng: DELIVERED -> COMPLETED.
   * Chỉ chính chủ đơn (hoặc ADMIN) được gọi.
   */
  async confirmReceipt(orderId: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const uid = userId;
    if (role !== "ADMIN" && (!uid || (order as any).userId !== uid)) {
      throw new HttpException(
        { success: false, message: "Bạn không có quyền xác nhận đơn này" },
        HttpStatus.FORBIDDEN,
      );
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new HttpException(
        { success: false, message: "Chỉ xác nhận được đơn đã giao (DELIVERED)" },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.updateOrderStatus(
      orderId,
      { status: OrderStatus.COMPLETED, reason: "Khách hàng xác nhận đã nhận hàng" } as any,
      uid,
    );
    await (this.prisma as any).shipmentEvent
      .create({
        data: {
          orderId,
          status: "customer_confirmed",
          kind: "TRACKING",
          message: "Khách hàng xác nhận đã nhận hàng",
          createdBy: uid || null,
        },
      })
      .catch((e: any) =>
        this.logger?.warn?.(`Không ghi được event xác nhận nhận hàng: ${e?.message}`),
      );
    return updated;
  }

  /** Ghi chú vận hành của admin lên timeline (giao lại, liên hệ khách...). */
  async addShipmentNote(orderId: string, message: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const text = (message || "").trim();
    if (!text)
      throw new HttpException(
        { success: false, message: "Nội dung ghi chú là bắt buộc" },
        HttpStatus.BAD_REQUEST,
      );
    return (this.prisma as any).shipmentEvent.create({
      data: {
        orderId,
        ghnCode: order.shippingOrderCode ?? null,
        status: "note",
        kind: "NOTE",
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
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const urls = (dto.photoUrls || [])
      .map((u) => String(u).trim())
      .filter(Boolean)
      .slice(0, 5);
    if (urls.length === 0) {
      throw new HttpException(
        { success: false, message: "Cần ít nhất 1 ảnh xác nhận giao hàng" },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      order.status !== OrderStatus.SHIPPING &&
      order.status !== OrderStatus.DELIVERED
    ) {
      throw new HttpException(
        {
          success: false,
          message: "Chỉ chụp ảnh xác nhận cho đơn đang giao hoặc đã giao",
        },
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
        status: "pod",
        kind: "POD",
        message:
          dto.note?.slice(0, 2000) ||
          `Đã chụp ${urls.length} ảnh xác nhận giao hàng`,
        createdBy: userId || null,
      },
    });
    // Chuyển DELIVERED qua updateOrderStatus: COD tự đánh PAID + ghi lịch sử
    // thu tiền ngay trong transaction ở đó (an toàn hơn đánh rời bên ngoài).
    if (order.status === OrderStatus.SHIPPING) {
      try {
        await this.updateOrderStatus(
          orderId,
          { status: OrderStatus.DELIVERED } as any,
          userId,
          { skipPaymentCheck: true },
        );
      } catch (e) {
        this.logger?.warn?.(
          `POD auto DELIVERED ${order.code} thất bại: ${(e as Error).message}`,
        );
      }
    }
    // Đơn đã DELIVERED (chụp bổ sung, hoặc giao từ trước khi có đồng bộ
    // shippingStatus): đảm bảo phía giao hàng hiển thị "Giao thành công".
    if (
      order.status === OrderStatus.DELIVERED &&
      String((order as any).shippingStatus || "").toLowerCase() !== "delivered"
    ) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { shippingStatus: "delivered" },
      });
    }
    return proof;
  }

  /** Timeline gộp: GHN events + POD + lịch sử trạng thái đơn. */
  async getShipmentTimeline(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const [events, proofs, history] = await Promise.all([
      (this.prisma as any).shipmentEvent.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      (this.prisma as any).deliveryProof.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.orderStatusHistory.findMany({
        where: { orderId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return { events, proofs, history };
  }

  /**
   * Admin chủ động phân công lại shipper cho đơn (nếu shipper cũ bận/sự cố).
   */
  async reassignShipper(orderId: string, adminId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, assignedShipperId: true },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const prevShipperId = (order as any).assignedShipperId || null;
    // Phân lại hoàn toàn ngẫu nhiên (chọn shipper khác hoặc cùng shipper nếu ít người)
    // Để force shipper khác, có thể thêm logic lọc exclude.
    await this.prisma.order.update({
      where: { id: orderId },
      data: { assignedShipperId: null } as any,
    });
    const nextId = await this.assignRandomShipperIfNeeded(
      orderId,
      this.prisma,
      adminId,
    );
    if (!nextId && prevShipperId) {
      // Không còn shipper rảnh: trả lại người cũ để đơn không bị mồ côi.
      await this.prisma.order.update({
        where: { id: orderId },
        data: { assignedShipperId: prevShipperId } as any,
      });
      throw new HttpException(
        {
          success: false,
          message: "Hiện không có shipper khả dụng, giữ nguyên người cũ",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return { success: true, shipperId: nextId };
  }

  private async assignRandomShipperIfNeeded(
    orderId: string,
    tx?: any,
    actorId?: string,
  ) {
    if (!this.shippersService) return null;
    const client = tx || this.prisma;
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: { id: true, code: true, status: true, assignedShipperId: true },
    });
    if (!order || order.assignedShipperId)
      return order?.assignedShipperId || null;
    const shipper =
      await this.shippersService.getLeastBusyActiveShipper(client);
    if (!shipper) {
      this.logger.warn(
        `Không có shipper active để phân công đơn ${order?.code || orderId}`,
      );
      return null;
    }
    await client.order.update({
      where: { id: orderId },
      data: { assignedShipperId: shipper.id } as any,
    });
    await client.orderStatusHistory
      .create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          changedBy: actorId || "SYSTEM",
          reason: `Tự động phân công shipper ${shipper.name || shipper.email}`,
        },
      })
      .catch((e: any) =>
        this.logger.warn(
          `Không ghi được lịch sử phân công shipper: ${e?.message}`,
        ),
      );
    // Hiện lên timeline vận chuyển để khách/shipper biết ai giao.
    await (client.shipmentEvent || this.prisma.shipmentEvent)
      .create({
        data: {
          orderId,
          status: "assign_shipper",
          kind: "TRACKING",
          message: `Đã phân công shipper ${shipper.name || shipper.email || ""}`.trim(),
          createdBy: actorId || "SYSTEM",
        },
      })
      .catch((e: any) =>
        this.logger.warn(`Không ghi được event phân công shipper: ${e?.message}`),
      );
    return shipper.id;
  }

  /**
   * Hàng/vận đơn cho app shipper: admin xem toàn bộ, shipper chỉ xem đơn được phân công.
   */
  async getDeliveryQueue(user?: { userId?: string; role?: string }) {
    const where: any = {
      // userId rỗng thì không khớp ai (Prisma bỏ qua undefined sẽ lộ hết đơn)
      assignedShipperId: user?.userId || "__NONE__",
      NOT: {
        status: OrderStatus.CANCELED,
      },
    };
    // Admin xem được toàn bộ hàng chờ (userId JWT luôn tồn tại nên
    // không thể dùng !user.userId để nhận diện admin).
    if (user?.role === "ADMIN") {
      delete where.assignedShipperId;
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
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            shipperProfile: true,
          },
        },
        payments: { select: { provider: true, status: true, amount: true } },
        deliveryProofs: {
          select: {
            id: true,
            photoUrls: true,
            note: true,
            capturedBy: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            variant: {
              select: {
                id: true,
                sku: true,
                attributes: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: {
                      select: { url: true },
                      orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return orders.map((o: any) => ({
      ...o,
      total: o.total != null ? o.total.toString() : null,
      // Ảnh POD shipper đã chụp (shipper/page hiển thị sau khi giao xong)
      proofs: (o.deliveryProofs || []).map((p: any) => ({
        id: p.id,
        photoUrls: Array.isArray(p.photoUrls) ? p.photoUrls : [],
        note: p.note ?? null,
        capturedBy: p.capturedBy ?? null,
        createdAt: p.createdAt,
      })),
      deliveryProofs: undefined,
      payments: (o.payments || []).map((p: any) => ({
        ...p,
        amount: p.amount != null ? p.amount.toString() : null,
      })),
      assignedShipper:
        this.shippersService?.toPublicShipper(o.assignedShipper) || null,
      // Danh sách món gọn cho shipper (ảnh + tên + SL), BigInt ép string.
      items: (o.items || []).map((it: any) => ({
        id: it.id,
        quantity: it.quantity,
        price: it.price != null ? it.price.toString() : null,
        sku: it.variant?.sku || null,
        attributes: it.variant?.attributes || null,
        productName: it.variant?.product?.name || "Sản phẩm không xác định",
        imageUrl: it.variant?.product?.images?.[0]?.url || null,
      })),
    }));
  }

  /**
   * Shipper cập nhật vị trí GPS hiện tại để admin/user theo dõi trên timeline/map.
   */
  async updateShipperLocation(
    orderId: string,
    dto: { lat: number; lng: number; accuracy?: number },
    userId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const lat = Number(dto.lat);
    const lng = Number(dto.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new HttpException(
        { success: false, message: "Tọa độ shipper không hợp lệ" },
        HttpStatus.BAD_REQUEST,
      );
    }
    const location = {
      lat,
      lng,
      accuracy: dto.accuracy != null ? Number(dto.accuracy) : null,
      updatedAt: new Date().toISOString(),
      shipperId: userId || null,
    };
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shippingMetadata: {
          ...(typeof order.shippingMetadata === "object" &&
          order.shippingMetadata !== null
            ? (order.shippingMetadata as any)
            : {}),
          currentLocation: location,
        },
      },
    });
    return (this.prisma as any).shipmentEvent.create({
      data: {
        orderId,
        ghnCode: order.shippingOrderCode ?? null,
        status: "shipper_location",
        kind: "TRACKING",
        message: `Shipper cập nhật vị trí: ${lat}, ${lng}`,
        raw: location,
        createdBy: userId || null,
      },
    });
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
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    const reason = (dto.reason || "").trim();
    if (!reason)
      throw new HttpException(
        { success: false, message: "Lý do hoàn tiền là bắt buộc" },
        HttpStatus.BAD_REQUEST,
      );
    if (
      !(
        [
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          OrderStatus.FAILED,
          OrderStatus.CANCELED,
        ] as readonly OrderStatus[]
      ).includes(order.status)
    ) {
      throw new HttpException(
        {
          success: false,
          message:
            "Đơn ở trạng thái này chưa thể yêu cầu hoàn tiền (chờ giao xong hoặc ghi nhận sự cố)",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const paidPayments = (order.payments || []).filter(
      (p) => String(p.status) === "PAID",
    );
    const paidTotal = paidPayments.reduce(
      (s, p) => s + Number(p.amount || 0),
      0,
    );
    const providers = (order.payments || []).map((p: any) =>
      String(p.provider),
    );
    const isCodOrder = providers.includes("COD");
    const isCodDelivered =
      isCodOrder &&
      (
        [OrderStatus.DELIVERED, OrderStatus.COMPLETED] as readonly OrderStatus[]
      ).includes(order.status);
    // COD đã giao: tiền mặt đã thu qua shipper -> hạn mức = tổng đơn (cho hoàn vào ví)
    const maxRefundable =
      paidTotal > 0
        ? paidTotal
        : isCodDelivered
          ? Number((order as any).total || 0)
          : 0;
    if (maxRefundable <= 0) {
      throw new HttpException(
        {
          success: false,
          message:
            "Đơn chưa ghi nhận thanh toán thành công nên không có tiền để hoàn (COD chưa thu).",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const amount =
      dto.amount != null
        ? Math.max(0, Math.round(Number(dto.amount)))
        : maxRefundable;
    if (!amount || amount > maxRefundable) {
      throw new HttpException(
        {
          success: false,
          message: `Số tiền hoàn không hợp lệ (tối đa ${maxRefundable}₫)`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    // Pending chiếm hạn mức: còn lại = max - (COMPLETED + PENDING + APPROVED)
    const existing = await (this.prisma as any).refundRequest.findMany({
      where: { orderId },
    });
    const occupied = (existing || [])
      .filter((r: any) =>
        ["PENDING", "APPROVED", "COMPLETED"].includes(String(r.status)),
      )
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const remainingQuota = maxRefundable - occupied;
    if (amount > remainingQuota) {
      throw new HttpException(
        {
          success: false,
          message: `Vượt hạn mức hoàn (còn lại ${Math.max(0, remainingQuota)}₫, đã giữ ${occupied}₫)`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    // Kênh sơ bộ + idempotency key
    const methodUpper = String(dto.method || "MANUAL").toUpperCase();
    let channel: string;
    if (!(order as any).userId) channel = "MANUAL";
    else if (methodUpper === "WALLET") channel = "WALLET";
    else if (providers.includes("BANK_TRANSFER")) channel = "SEPAY";
    else if (providers.includes("WALLET") || isCodOrder) channel = "WALLET";
    else channel = "MANUAL";
    const seq = Date.now().toString(36);
    const idempotencyKey = `refund-${(order as any).code}-${seq}`.slice(0, 100);
    return (this.prisma as any).refundRequest.create({
      data: {
        orderId,
        amount: BigInt(amount),
        reason: reason.slice(0, 2000),
        method: String(dto.method || "MANUAL").slice(0, 30),
        channel,
        idempotencyKey,
        bankInfo: dto.bankInfo ?? undefined,
        requestedBy: userId || null,
      },
    });
  }

  async listRefundRequests(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    return (this.prisma as any).refundRequest.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Admin duyệt (APPROVED) / từ chối (REJECTED) / hoàn tất (COMPLETED -> Order REFUNDED + Payment REFUNDED). */
  async reviewRefund(
    requestId: string,
    dto: { action: "approve" | "reject" | "complete"; note?: string },
    adminId?: string,
  ) {
    const req = await (this.prisma as any).refundRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException("Không tìm thấy yêu cầu hoàn tiền");
    if (dto.action === "approve") {
      if (req.status !== "PENDING")
        throw new HttpException(
          { success: false, message: "Chỉ duyệt yêu cầu đang chờ" },
          HttpStatus.BAD_REQUEST,
        );
      return (this.prisma as any).refundRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedBy: adminId || null,
          reviewedNote: dto.note?.slice(0, 2000) || null,
        },
      });
    }
    if (dto.action === "reject") {
      if (req.status !== "PENDING")
        throw new HttpException(
          { success: false, message: "Chỉ từ chối yêu cầu đang chờ" },
          HttpStatus.BAD_REQUEST,
        );
      return (this.prisma as any).refundRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedBy: adminId || null,
          reviewedNote: dto.note?.slice(0, 2000) || null,
        },
      });
    }
    // complete: đi qua RefundRouter (WALLET/SEPAY/MANUAL). Chỉ COMPLETED mới cộng sổ REFUNDED.
    if (req.status !== "APPROVED")
      throw new HttpException(
        { success: false, message: "Chỉ hoàn tất yêu cầu đã duyệt" },
        HttpStatus.BAD_REQUEST,
      );
    const order = await this.prisma.order.findUnique({
      where: { id: req.orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException("Không tìm thấy đơn hàng");
    // Nếu có router (đã cài RefundModule): ủy quyền xử lý kênh thực tế
    if (this.refundRouter) {
      const result = await (this.refundRouter as any).processRefund(req, order);
      // Fallback MANUAL (SePay 422/offline): giữ APPROVED + failureReason, KHÔNG sang REFUNDED
      if (result?.needsManualFallback || result?.status === "APPROVED") {
        return (this.prisma as any).refundRequest.findUnique({
          where: { id: requestId },
        });
      }
      if (result?.status !== "COMPLETED") {
        throw new HttpException(
          {
            success: false,
            message:
              result?.failureReason ||
              "Hoàn tiền thất bại, giữ nguyên để đối soát",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    await this.prisma.payment.updateMany({
      where: { orderId: req.orderId, status: PaymentStatus.PAID },
      data: { status: PaymentStatus.REFUNDED },
    });
    try {
      await this.updateOrderStatus(
        req.orderId,
        {
          status: OrderStatus.REFUNDED,
          reason: `Hoàn tiền ${req.amount}₫: ${req.reason}`,
        } as any,
        adminId,
        { skipPaymentCheck: true },
      );
    } catch (e) {
      this.logger?.warn?.(
        `Refund complete ${req.id} -> REFUNDED thất bại: ${(e as Error).message}`,
      );
      throw new HttpException(
        {
          success: false,
          message: `Không chuyển đơn sang hoàn tiền được: ${(e as Error).message}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return (this.prisma as any).refundRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        reviewedBy: adminId || null,
        reviewedNote: dto.note?.slice(0, 2000) || req.reviewedNote,
      },
    });
  }

  // Update payment method
  async updatePaymentMethod(
    orderId: string,
    newPaymentMethod: string,
    userId?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Không tìm thấy đơn hàng");
    }

    // Only allow payment method change for PENDING or CONFIRMED orders
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new HttpException(
        {
          success: false,
          message:
            "Chỉ có thể thay đổi phương thức thanh toán cho đơn hàng đang chờ xử lý hoặc đã xác nhận",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if payment exists
    if (!order.payments || order.payments.length === 0) {
      throw new HttpException(
        { success: false, message: "Không tìm thấy thông tin thanh toán" },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Update payment provider
    await this.prisma.payment.update({
      where: { id: order.payments[0].id },
      data: {
        provider: newPaymentMethod as any,
      },
    });

    // Fetch updated order with full details
    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    // Log payment method change
    if (userId) {
      await this.auditLogService.log(
        AuditAction.ORDER_STATUS_CHANGE,
        AuditEntity.ORDER,
        userId,
        orderId,
        {
          action: "payment_method_change",
          from: order.payments[0].provider,
          to: newPaymentMethod,
        },
      );
    }

    return this.formatOrderResponse(updatedOrder);
  }

  // Cancel order
  async cancelOrder(
    orderId: string,
    userId?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Không tìm thấy đơn hàng");
    }

    // Check if user owns this order
    if (userId && order.userId !== userId) {
      throw new HttpException(
        { success: false, message: "Bạn không có quyền hủy đơn hàng này" },
        HttpStatus.FORBIDDEN,
      );
    }

    // Check if order can be cancelled
    if (order.status === OrderStatus.CANCELED) {
      throw new HttpException(
        { success: false, message: "Đơn hàng đã bị hủy trước đó" },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Đơn FAILED đã xả reservation ở bước vào FAILED — hủy nữa sẽ làm
    // reservedQuantity bị âm. Đơn đã xuất kho thì không hủy tay.
    if (
      !(PRE_FULFILLMENT_STATUSES as readonly OrderStatus[]).includes(
        order.status,
      )
    ) {
      throw new HttpException(
        {
          success: false,
          message: `Không thể hủy đơn hàng ở trạng thái "${getStatusLabel(order.status)}". Vui lòng liên hệ hỗ trợ.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!canUserCancel(order.status)) {
      throw new HttpException(
        {
          success: false,
          message: `Không thể hủy đơn hàng ở trạng thái "${getStatusLabel(order.status)}". Vui lòng liên hệ hỗ trợ.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Cancel order and restore stock
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      // Optimistic locking: chỉ hủy khi trạng thái chưa bị đổi bởi luồng
      // khác (vd webhook thanh toán vừa đánh PAID) kể từ lúc đọc order.
      const locked = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: {
          status: OrderStatus.CANCELED,
        },
      });
      if (locked.count !== 1) {
        throw new HttpException(
          {
            success: false,
            message:
              "Đơn hàng vừa thay đổi trạng thái, vui lòng tải lại và thử lại",
          },
          HttpStatus.CONFLICT,
        );
      }
      const updated = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      // Đơn hủy tay luôn ở trạng thái chưa xuất kho (canUserCancel):
      // chỉ xả hàng đang giữ, On Hand giữ nguyên.
      const sortedCancelItems = [...order.items].sort((a: any, b: any) =>
        String(a.variantId).localeCompare(String(b.variantId)),
      );
      for (const item of sortedCancelItems) {
        await this.releaseReservation(tx, item.variantId, item.quantity);
      }

      // Nhả serial đã gán cho đơn về lại kho
      await this.releaseOrderSerials(tx, orderId);

      // Hoàn voucher đã dùng cho đơn (nếu có) để khách đặt lại được
      await this.voucherService?.release(orderId, tx);

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELED,
          changedBy: userId || null,
          reason: "Người dùng hủy đơn hàng",
        },
      });

      // Update payment status — chỉ đánh dấu FAILED cho các khoản chưa thanh toán (PENDING).
      // Các khoản đã PAID (online) giữ nguyên PAID để admin làm lệnh hoàn tiền sau.
      await tx.payment.updateMany({
        where: { orderId: orderId, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
      // Tự hoàn ví ngay (ORDER_CANCEL_REFUND) nếu đơn đã trừ ví
      const walletPaid = ((updated as any).payments || []).filter(
        (p: any) =>
          String(p.provider) === "WALLET" && String(p.status) === "PAID",
      );
      if (
        walletPaid.length > 0 &&
        this.walletService &&
        (updated as any).userId
      ) {
        for (const wp of walletPaid) {
          const wAmt = Number(wp.amount || 0);
          if (wAmt > 0) {
            await (this.walletService as any).credit(
              (updated as any).userId,
              wAmt,
              `cancel-${orderId}-${wp.id}`.slice(0, 100),
              "ORDER_CANCEL_REFUND",
              `Hủy đơn ${(updated as any).code}: hoàn ${wAmt}₫ về ví`,
              orderId,
              tx,
            );
          }
        }
        await tx.payment.updateMany({
          where: {
            orderId,
            provider: "WALLET" as any,
            status: PaymentStatus.PAID,
          },
          data: { status: PaymentStatus.REFUNDED },
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
        { code: order.code },
      );
    }

    // Đơn hủy cũng phải có dòng trên timeline vận chuyển.
    await (this.prisma as any).shipmentEvent
      .create({
        data: {
          orderId,
          status: "canceled",
          kind: "TRACKING",
          message: "Đơn hàng đã hủy",
          createdBy: userId || null,
        },
      })
      .catch((e: any) =>
        this.logger?.warn?.(`Không ghi được event hủy đơn: ${e?.message}`),
      );

    return this.formatOrderResponse(cancelledOrder);
  }

  // Get all orders (admin)
  async getAllOrders(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    orders: OrderResponseDto[];
    total: number;
    totalPages: number;
  }> {
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
                  product: true,
                },
              },
            },
          },
          payments: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedShipper: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              shipperProfile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.order.count(),
    ]);

    return {
      orders: orders.map((order) => this.formatOrderResponse(order)),
      total,
      totalPages: Math.ceil(total / limit),
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
      shippingFeeReal:
        order.shippingFeeReal == null
          ? null
          : formatPrice(order.shippingFeeReal),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      shippingMetadata: order.shippingMetadata || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user || null,
      assignedShipperId: order.assignedShipperId || null,
      assignedShipper:
        this.shippersService?.toPublicShipper(order.assignedShipper) || null,
      items:
        order.items?.map((item: any) => ({
          id: item.id,
          variantId: item.variantId,
          price: formatPrice(item.price),
          quantity: item.quantity,
          variant: item.variant
            ? {
                ...item.variant,
                price: formatPrice(item.variant.price),
                // salePrice cũng là BigInt: giữ null thay vì ép về 0.
                salePrice:
                  item.variant.salePrice == null
                    ? null
                    : formatPrice(item.variant.salePrice),
              }
            : null,
        })) || [],
      payments:
        order.payments?.map((payment: any) => ({
          ...payment,
          amount: formatPrice(payment.amount),
        })) || [],
    };
  }
}
