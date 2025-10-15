import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateCartDto } from "./dto/create-cart.dto";
import { UpdateCartDto } from "./dto/update-cart.dto";
import { PrismaService } from "src/prismaClient/prisma.service";
import { formatPrice } from "src/utils/price.util";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}
  
  async getCartByUserId(userId: string) {
    try {
      // Tìm cart của user
      let cart = await this.prisma.cart.findFirst({
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
          }
        },
      });

      // Nếu chưa có cart, tạo mới
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: {
            userId
          },
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
            }
          }
        });
      }

      // Format response
      return {
        ...cart,
        items: cart.items.map(item => ({
          ...item,
          variant: {
            ...item.variant,
            price: formatPrice(item.variant.price)
          }
        }))
      };
      
    } catch (error) {
      console.error('Error getting cart:', error);
      throw new Error('Failed to get cart');
    }
  }

  async addItemToCart(userId: string, variantId: string, quantity: number = 1) {
    try {
      // Tìm hoặc tạo cart
      let cart = await this.prisma.cart.findFirst({
        where: { userId }
      });

      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId }
        });
      }

      // Kiểm tra item đã có trong cart chưa
      const existingItem = await this.prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          variantId
        }
      });

      if (existingItem) {
        // Cập nhật số lượng
        return await this.prisma.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity
          }
        });
      } else {
        // Thêm item mới
        return await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            variantId,
            quantity
          }
        });
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw new Error('Failed to add item to cart');
    }
  }

  async updateCartItem( itemId: string, updateQuantity: UpdateCartDto) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId }
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: updateQuantity.quantity }
    });
  }
  async removeCartItem(itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId }
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    return this.prisma.cartItem.delete({
      where: { id: itemId }
    });
  }
}