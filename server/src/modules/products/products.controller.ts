import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "src/guards/auth.gaurd";
import {
  UpdateProductDto,
  CreateProductWithVariantsDto,
} from "./dto/update-product.dto";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    // Chấp nhận cả "?brand=HP" và "?brand=HP,Samsung" để lọc nhiều hãng.
    // "?brand=HP&brand=Samsung" thì Express trả về mảng, nên khai báo string | string[].
    @Query("brand") brand?: string | string[],
    @Query("sort") sort?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    // Trả { products, total, page, limit, totalPages } - phân trang ở server thay vì
    // đổ hết 3000+ sản phẩm (4.5MB) về client rồi mới lọc.
    return this.productsService.findAll({
      search,
      categoryId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      // Chuẩn hoá tham số hãng về mảng; service cũng tách dấu phẩy được nên
      // chỉ cần bỏ rỗng ở đây.
      brand: brand === undefined ? undefined : brand,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("featured")
  async getFeaturedProducts(): Promise<any> {
    try {
      const products = await this.productsService.getFeaturedProducts();
      return {
        data: {
          success: true,
          data: products,
          message: "Lấy sản phẩm nổi bật thành công",
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi server khi lấy sản phẩm nổi bật",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Danh sách hãng kèm số sản phẩm, phục vụ bộ lọc hãng ở trang /products.
   * Khai báo trước @Get(":id") để không bị route động bắt mất.
   */
  @Get("brands")
  async getBrands(
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
  ): Promise<any> {
    try {
      const brands = await this.productsService.getBrands({ search, categoryId });
      return {
        data: {
          success: true,
          data: brands,
          message: "Lấy danh sách hãng thành công",
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi server khi lấy danh sách hãng",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("categories")
  async getCategoryList(): Promise<any> {
    try {
      const categoryList = await this.productsService.getCategoryList();
      return {
        data: {
          success: true,
          data: categoryList,
          message: "Lấy danh sách loại thành công",
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi server khi lấy danh sách loại",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get("category/:slug")
  async getProductsByCategory(
    @Param("slug") slug: string,
    @Query("page") page: number,
    @Query("limit") limit: number,
  ): Promise<any> {
    const pagenumber = page ? parseInt(page.toString(), 10) : 1;
    const limitnumber = limit ? parseInt(limit.toString(), 10) : 12;
    const result = await this.productsService.getProductByCategory(
      slug,
      pagenumber,
      limitnumber,
    );

    return {
      data: {
        success: true,
        data: result.products,
        total: result.total,
        totalItems: result.totalItems,
        message: "Lấy sản phẩm theo danh mục thành công",
      },
    };
  }

  /**
   * Gợi ý nhanh cho ô tìm kiếm header. Khai báo trước @Get(":id") để
   * không bị route động bắt mất.
   */
  @Get("suggest")
  async suggestProducts(
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ): Promise<any> {
    const data = await this.productsService.suggestProducts(
      q ?? "",
      limit ? Number(limit) : undefined,
    );
    return {
      data: {
        success: true,
        data,
      },
    };
  }

  @Get(":id/availability")
  @ApiOperation({
    summary: "Tình trạng hàng theo kho (public, không lộ số lượng)",
  })
  @ApiResponse({ status: 200, description: "Trạng thái tồn kho theo kho" })
  async getProductAvailability(@Param("id") id: string): Promise<any> {
    try {
      const availability =
        await this.productsService.getProductAvailability(id);
      return {
        success: true,
        data: availability,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi lấy tình trạng kho",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  async getProductById(@Param("id") id: string): Promise<any> {
    try {
      const product = await this.productsService.getProductById(id);

      if (!product) {
        throw new HttpException(
          { success: false, message: "Không tìm thấy sản phẩm" },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        data: {
          success: true,
          data: product,
          message: "Lấy thông tin sản phẩm thành công",
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi server khi lấy thông tin sản phẩm",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create new product" })
  @ApiResponse({ status: 201, description: "Product created successfully" })
  async createProduct(
    @Body() createProductDto: CreateProductWithVariantsDto,
    @Req() req: any,
  ) {
    try {
      const product = await this.productsService.createProduct(
        createProductDto,
        req.user?.userId || req.user?.sub,
      );

      return {
        success: true,
        data: product,
        message: "Tạo sản phẩm thành công",
      };
    } catch (error) {
      // Giữ nguyên lỗi có chủ đích (vd 400 trùng slug/SKU), chỉ bọc lỗi lạ thành 500
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi tạo sản phẩm",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update product" })
  @ApiResponse({ status: 200, description: "Product updated successfully" })
  async updateProduct(
    @Param("id") id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: any,
  ) {
    try {
      const product = await this.productsService.updateProduct(
        id,
        updateProductDto,
        req.user?.userId || req.user?.sub,
      );

      return {
        success: true,
        data: product,
        message: "Cập nhật sản phẩm thành công",
      };
    } catch (error) {
      // Giữ nguyên lỗi có chủ đích (vd 400 trùng slug), chỉ bọc lỗi lạ thành 500
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi cập nhật sản phẩm",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete product (soft delete)" })
  @ApiResponse({ status: 200, description: "Product deleted successfully" })
  async deleteProduct(@Param("id") id: string, @Req() req: any) {
    try {
      await this.productsService.deleteProduct(
        id,
        req.user?.userId || req.user?.sub,
      );

      return {
        success: true,
        message: "Xóa sản phẩm thành công",
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: "Lỗi khi xóa sản phẩm",
          detail: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
