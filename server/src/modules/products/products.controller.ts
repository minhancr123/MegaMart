import { Controller, Get, HttpException, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/guards/auth.gaurd';

@ApiTags("products")
@Controller('products')
export class ProductsController {

    constructor(private readonly productsService: ProductsService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll() : Promise<any> {
        const res = await this.productsService.findAll();
        return res;
    }

    @Get('featured')
    async getFeaturedProducts() : Promise<any> {
        try {
            const products = await this.productsService.getFeaturedProducts();
                return {success : true , data : products , message : "Lấy sản phẩm nổi bật thành công" };
            
        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi server khi lấy sản phẩm nổi bật', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
                )         
        }
    }

    @Get("categories")
    async getCategoryList() : Promise<any>{
        try {
            const categoryList = await this.productsService.getCategoryList();
            return {success : true , data : categoryList , message : "Lấy danh sách loại thành công"};
            
        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi server khi lấy danh sách loại', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }

    }
    @Get("category/:slug")
    async getProductsByCategory(@Param("slug") slug: string, @Query("page") page: number, @Query("limit") limit: number) : Promise<any> {
        const pagenumber = page ? parseInt(page.toString(), 10) : 1;
        const limitnumber = limit ? parseInt(limit.toString(), 10) : 12;
        const result = await this.productsService.getProductByCategory(slug, pagenumber, limitnumber);

        return {success : true , data : result.products , total : result.total , totalItems : result.totalItems , message : "Lấy sản phẩm theo danh mục thành công" };
    }
    
}
