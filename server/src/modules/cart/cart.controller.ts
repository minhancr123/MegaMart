import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { CartService } from "./cart.service";
import { CreateCartDto } from "./dto/create-cart.dto";
import { UpdateCartDto } from "./dto/update-cart.dto";
import { AddItemToCartDto, CartResponseDto } from "./dto/add-item-cart.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";

@ApiTags("cart")
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(":id")
  @ApiOperation({ summary: 'Get cart by user ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async getCartByUserId(@Param("id") id: string) {
    try {
      const res = await this.cartService.getCartByUserId(id);

      return { data :{data:  res , success : true, message : "Lấy giỏ hàng thành công"}};

    } catch (error) {
      throw new HttpException(
        { success: false, message: "Lỗi server khi lấy giỏ hàng", detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("item")
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async addItemToCart(
    @Body() addItemDto: AddItemToCartDto
  ) {
    try {
      const result = await this.cartService.addItemToCart(
        addItemDto.userId,
        addItemDto.variantId,
        addItemDto.quantity || 1
      );
      return {
        data: { success: true,data : result , message: 'Thêm sản phẩm vào giỏ hàng thành công'},
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi thêm sản phẩm vào giỏ hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch("item/:itemId")
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'itemId', description: 'Cart Item ID' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(@Param("itemId") itemId: string , @Body() updateCartDto: UpdateCartDto) {
    try {
      const result = await this.cartService.updateCartItem(itemId, updateCartDto);
      return {
        data: { success: true,data : result, message: 'Cập nhật số lượng sản phẩm trong giỏ hàng thành công' }
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi cập nhật số lượng sản phẩm trong giỏ hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("item/:itemId")
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', description: 'Cart Item ID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItemFromCart(@Param("itemId") itemId: string) {
    try {
      const result = await this.cartService.removeItemFromCart(itemId);
      return {
        data: { success: true, data : result, message: 'Xóa sản phẩm khỏi giỏ hàng thành công' }
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi xóa sản phẩm khỏi giỏ hàng', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
