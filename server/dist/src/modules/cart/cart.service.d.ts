import { UpdateCartDto } from "./dto/update-cart.dto";
import { PrismaService } from "src/prismaClient/prisma.service";
export declare class CartService {
    private prisma;
    constructor(prisma: PrismaService);
    getCartByUserId(userId: string): Promise<any>;
    addItemToCart(userId: string, variantId: string, quantity?: number): Promise<any>;
    updateCartItem(itemId: string, updateQuantity: UpdateCartDto): Promise<any>;
    removeCartItem(itemId: string): Promise<any>;
}
