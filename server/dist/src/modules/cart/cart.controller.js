"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartController = void 0;
const common_1 = require("@nestjs/common");
const cart_service_1 = require("./cart.service");
const update_cart_dto_1 = require("./dto/update-cart.dto");
const add_item_cart_dto_1 = require("./dto/add-item-cart.dto");
const swagger_1 = require("@nestjs/swagger");
let CartController = class CartController {
    cartService;
    constructor(cartService) {
        this.cartService = cartService;
    }
    async getCartByUserId(id) {
        try {
            const res = await this.cartService.getCartByUserId(id);
            return { data: { data: res, success: true, message: "Lấy giỏ hàng thành công" } };
        }
        catch (error) {
            throw new common_1.HttpException({ success: false, message: "Lỗi server khi lấy giỏ hàng", detail: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async addItemToCart(addItemDto) {
        try {
            const result = await this.cartService.addItemToCart(addItemDto.userId, addItemDto.variantId, addItemDto.quantity || 1);
            return {
                data: { success: true, data: result, message: 'Thêm sản phẩm vào giỏ hàng thành công' },
            };
        }
        catch (error) {
            throw new common_1.HttpException({ success: false, message: 'Lỗi khi thêm sản phẩm vào giỏ hàng', detail: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateCartItem(itemId, updateCartDto) {
        try {
            const result = await this.cartService.updateCartItem(itemId, updateCartDto);
            return {
                data: { success: true, data: result, message: 'Cập nhật số lượng sản phẩm trong giỏ hàng thành công' }
            };
        }
        catch (error) {
            throw new common_1.HttpException({ success: false, message: 'Lỗi khi cập nhật số lượng sản phẩm trong giỏ hàng', detail: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.CartController = CartController;
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({ summary: 'Get cart by user ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cart retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Cart not found' }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "getCartByUserId", null);
__decorate([
    (0, common_1.Post)("item"),
    (0, swagger_1.ApiOperation)({ summary: 'Add item to cart' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Item added to cart successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_item_cart_dto_1.AddItemToCartDto]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "addItemToCart", null);
__decorate([
    (0, common_1.Patch)("item/:itemId"),
    (0, swagger_1.ApiOperation)({ summary: 'Update cart item quantity' }),
    (0, swagger_1.ApiParam)({ name: 'itemId', description: 'Cart Item ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cart item updated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Cart item not found' }),
    __param(0, (0, common_1.Param)("itemId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_cart_dto_1.UpdateCartDto]),
    __metadata("design:returntype", Promise)
], CartController.prototype, "updateCartItem", null);
exports.CartController = CartController = __decorate([
    (0, swagger_1.ApiTags)("cart"),
    (0, common_1.Controller)("cart"),
    __metadata("design:paramtypes", [cart_service_1.CartService])
], CartController);
//# sourceMappingURL=cart.controller.js.map