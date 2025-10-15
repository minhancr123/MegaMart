import { CartService } from "./cart.service";
import { UpdateCartDto } from "./dto/update-cart.dto";
import { AddItemToCartDto } from "./dto/add-item-cart.dto";
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    getCartByUserId(id: string): Promise<{
        data: {
            data: any;
            success: boolean;
            message: string;
        };
    }>;
    addItemToCart(addItemDto: AddItemToCartDto): Promise<{
        data: {
            success: boolean;
            data: any;
            message: string;
        };
    }>;
    updateCartItem(itemId: string, updateCartDto: UpdateCartDto): Promise<{
        data: {
            success: boolean;
            data: any;
            message: string;
        };
    }>;
}
