export declare class AddItemToCartDto {
    userId: string;
    variantId: string;
    quantity?: number;
}
export declare class CartResponseDto {
    id: string;
    userId: string;
    items: CartItemResponseDto[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class CartItemResponseDto {
    id: string;
    variantId: string;
    quantity: number;
    variant: {
        id: string;
        sku: string;
        price: number;
        stock: number;
        attributes?: any;
        product: {
            id: string;
            name: string;
            description?: string;
            images: {
                id: string;
                url: string;
                alt?: string;
            }[];
        };
    };
}
