import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(): Promise<any>;
    getFeaturedProducts(): Promise<any>;
    getCategoryList(): Promise<any>;
    getProductsByCategory(slug: string, page: number, limit: number): Promise<any>;
    getProductById(id: string): Promise<any>;
}
