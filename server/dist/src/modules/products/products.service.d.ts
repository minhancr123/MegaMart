import { PrismaService } from 'src/prismaClient/prisma.service';
import { ProductResponseDto } from './dto/product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<unknown>;
    getFeaturedProducts(): Promise<ProductResponseDto[]>;
    getCategoryList(): Promise<any>;
    getProductByCategory(categorySlug: string, page?: number, limit?: number): Promise<{
        products: ProductResponseDto[];
        total: number;
        totalItems: number;
    }>;
    getProductById(id: string): Promise<ProductResponseDto | null>;
    private formatProductResponse;
}
