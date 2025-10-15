"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prismaClient/prisma.service");
const price_util_1 = require("../../utils/price.util");
let CartService = class CartService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCartByUserId(userId) {
        try {
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
            return {
                ...cart,
                items: cart.items.map(item => ({
                    ...item,
                    variant: {
                        ...item.variant,
                        price: (0, price_util_1.formatPrice)(item.variant.price)
                    }
                }))
            };
        }
        catch (error) {
            console.error('Error getting cart:', error);
            throw new Error('Failed to get cart');
        }
    }
    async addItemToCart(userId, variantId, quantity = 1) {
        try {
            let cart = await this.prisma.cart.findFirst({
                where: { userId }
            });
            if (!cart) {
                cart = await this.prisma.cart.create({
                    data: { userId }
                });
            }
            const existingItem = await this.prisma.cartItem.findFirst({
                where: {
                    cartId: cart.id,
                    variantId
                }
            });
            if (existingItem) {
                return await this.prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + quantity
                    }
                });
            }
            else {
                return await this.prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        variantId,
                        quantity
                    }
                });
            }
        }
        catch (error) {
            console.error('Error adding item to cart:', error);
            throw new Error('Failed to add item to cart');
        }
    }
    async updateCartItem(itemId, updateQuantity) {
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId }
        });
        if (!item) {
            throw new common_1.NotFoundException('Cart item not found');
        }
        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: updateQuantity.quantity }
        });
    }
    async removeCartItem(itemId) {
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId }
        });
        if (!item) {
            throw new common_1.NotFoundException('Cart item not found');
        }
        return this.prisma.cartItem.delete({
            where: { id: itemId }
        });
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map