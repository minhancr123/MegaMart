import { Controller, Get, Post, Patch, Delete, Body, HttpException, HttpStatus, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/guards/auth.gaurd';
import { UpdateProductDto, CreateProductWithVariantsDto } from './dto/update-product.dto';

@ApiTags("products")
@Controller('products')
export class ProductsController {

    constructor(private readonly productsService: ProductsService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(@Query('search') search?: string): Promise<any> {
        const res = await this.productsService.findAll(search);
        return res;
    }

    @Get('featured')
    async getFeaturedProducts(): Promise<any> {
        try {
            const products = await this.productsService.getFeaturedProducts();
            return { data: { success: true, data: products, message: "Lấy sản phẩm nổi bật thành công" } };

        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi server khi lấy sản phẩm nổi bật', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    @Get("categories")
    async getCategoryList(): Promise<any> {
        try {
            const categoryList = await this.productsService.getCategoryList();
            return { data: { success: true, data: categoryList, message: "Lấy danh sách loại thành công" } };

        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi server khi lấy danh sách loại', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }

    }
    @Get("category/:slug")
    async getProductsByCategory(@Param("slug") slug: string, @Query("page") page: number, @Query("limit") limit: number): Promise<any> {
        const pagenumber = page ? parseInt(page.toString(), 10) : 1;
        const limitnumber = limit ? parseInt(limit.toString(), 10) : 12;
        const result = await this.productsService.getProductByCategory(slug, pagenumber, limitnumber);

        return { data: { success: true, data: result.products, total: result.total, totalItems: result.totalItems, message: "Lấy sản phẩm theo danh mục thành công" } };
    }

    @Get(':id')
    async getProductById(@Param('id') id: string): Promise<any> {
        try {
            const product = await this.productsService.getProductById(id);

            if (!product) {
                throw new HttpException(
                    { success: false, message: 'Không tìm thấy sản phẩm' },
                    HttpStatus.NOT_FOUND
                );
            }

            return {
                data: {
                    success: true,
                    data: product,
                    message: "Lấy thông tin sản phẩm thành công"
                }
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                { success: false, message: 'Lỗi server khi lấy thông tin sản phẩm', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Create new product' })
    @ApiResponse({ status: 201, description: 'Product created successfully' })
    async createProduct(@Body() createProductDto: CreateProductWithVariantsDto, @Req() req: any) {
        try {
            const product = await this.productsService.createProduct(createProductDto, req.user?.userId || req.user?.sub);

            return {
                success: true,
                data: product,
                message: 'Tạo sản phẩm thành công'
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi khi tạo sản phẩm', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Update product' })
    @ApiResponse({ status: 200, description: 'Product updated successfully' })
    async updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @Req() req: any) {
        try {
            const product = await this.productsService.updateProduct(id, updateProductDto, req.user?.userId || req.user?.sub);

            return {
                success: true,
                data: product,
                message: 'Cập nhật sản phẩm thành công'
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi khi cập nhật sản phẩm', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Delete product (soft delete)' })
    @ApiResponse({ status: 200, description: 'Product deleted successfully' })
    async deleteProduct(@Param('id') id: string, @Req() req: any) {
        try {
            await this.productsService.deleteProduct(id, req.user?.userId || req.user?.sub);

            return {
                success: true,
                message: 'Xóa sản phẩm thành công'
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: 'Lỗi khi xóa sản phẩm', detail: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

}
