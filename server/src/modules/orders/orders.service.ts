import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { 
  validateTransition, 
  shouldRestoreStock, 
  canUserCancel,
  getStatusLabel 
} from './order-status.helper';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Generate unique order code
  private generateOrderCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Create new order
  async createOrder(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
  const { cartId, shipping, paymentMethod, totals, userId, voucherCode } = createOrderDto;

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

    // Check stock availability
    for (const item of cart.items) {
      if (item.variant.stock < item.quantity) {
        throw new HttpException(
          { 
            success: false, 
            message: `Sản phẩm "${item.variant.product.name}" không đủ số lượng trong kho` 
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const discount = Math.max(0, Math.round(totals.discount || 0));
      const newOrder = await tx.order.create({
        data: {
          code: this.generateOrderCode(),
          userId: userId || cart.userId,
          status: OrderStatus.PENDING,
          total: BigInt(Math.round(totals.total)),
          discountAmount: BigInt(discount),
          voucherCode: voucherCode || null,
          vatAmount: BigInt(Math.round(totals.tax)),
          shippingFee: BigInt(0),
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
            create: {
              provider: paymentMethod,
              amount: BigInt(Math.round(totals.total)),
              currency: 'VND',
              status: paymentMethod === 'OTHER' ? PaymentStatus.PENDING : PaymentStatus.PENDING
            }
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

      // Deduct stock
      for (const item of cart.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return newOrder;
    });

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
        payments: true
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
        payments: true
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.formatOrderResponse(order);
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
        payments: true
      }
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.formatOrderResponse(order);
  }

  // Update order status
  async updateOrderStatus(orderId: string, updateOrderDto: UpdateOrderDto): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
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

      // Restore stock if needed
      if (shouldRestoreStock(newStatus)) {
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
      }

      return updated;
    });

    return this.formatOrderResponse(updatedOrder);
  }

  // Cancel order
  async cancelOrder(orderId: string, userId?: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
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

    if (!canUserCancel(order.status)) {
      throw new HttpException(
        { success: false, message: `Không thể hủy đơn hàng ở trạng thái "${getStatusLabel(order.status)}". Vui lòng liên hệ hỗ trợ.` },
        HttpStatus.BAD_REQUEST
      );
    }

    // Cancel order and restore stock
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELED
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

      // Restore stock
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

      // Update payment status
      await tx.payment.updateMany({
        where: { orderId: orderId },
        data: {
          status: PaymentStatus.FAILED
        }
      });

      return updated;
    });

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
          }
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
      total: Number(order.total),
      discountAmount: Number(order.discountAmount || 0),
      voucherCode: order.voucherCode || null,
      vatAmount: Number(order.vatAmount),
      shippingFee: Number(order.shippingFee),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items?.map((item: any) => ({
        id: item.id,
        variantId: item.variantId,
        price: Number(item.price),
        quantity: item.quantity,
        variant: item.variant ? {
          ...item.variant,
          price: Number(item.variant.price)
        } : null
      })) || [],
      payments: order.payments?.map((payment: any) => ({
        ...payment,
        amount: Number(payment.amount)
      })) || []
    };
  }
}
