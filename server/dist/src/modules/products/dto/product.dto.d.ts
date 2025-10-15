export declare class CreateProductDto {
    name: string;
    slug: string;
    description?: string;
    brand?: string;
    categoryId?: string;
}
export declare class CreateVariantDto {
    sku: string;
    price: number;
    stock: number;
    attributes?: any;
}
export declare class ProductResponseDto {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    brand: string | null;
    category?: {
        id: string;
        name: string;
        slug: string;
    } | null;
    images: {
        id: string;
        url: string;
        alt?: string;
    }[];
    variants: {
        id: string;
        sku: string;
        price: number;
        stock: number;
        attributes?: any;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class ProductQueryDto {
    search?: string;
    categoryId?: string;
    brand?: string;
    page?: number;
    limit?: number;
}
