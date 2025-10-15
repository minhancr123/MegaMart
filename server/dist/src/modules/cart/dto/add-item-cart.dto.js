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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartItemResponseDto = exports.CartResponseDto = exports.AddItemToCartDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class AddItemToCartDto {
    userId;
    variantId;
    quantity;
}
exports.AddItemToCartDto = AddItemToCartDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID của người dùng',
        example: 'user_id_123',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddItemToCartDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Variant ID của sản phẩm',
        example: 'variant_id_123',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddItemToCartDto.prototype, "variantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Số lượng sản phẩm',
        example: 1,
        default: 1,
        required: false,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], AddItemToCartDto.prototype, "quantity", void 0);
class CartResponseDto {
    id;
    userId;
    items;
    createdAt;
    updatedAt;
}
exports.CartResponseDto = CartResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cart ID',
        example: 'cart_id_123',
    }),
    __metadata("design:type", String)
], CartResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID',
        example: 'user_id_123',
    }),
    __metadata("design:type", String)
], CartResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cart items',
        type: 'array',
    }),
    __metadata("design:type", Array)
], CartResponseDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Creation date',
    }),
    __metadata("design:type", Date)
], CartResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last update date',
    }),
    __metadata("design:type", Date)
], CartResponseDto.prototype, "updatedAt", void 0);
class CartItemResponseDto {
    id;
    variantId;
    quantity;
    variant;
}
exports.CartItemResponseDto = CartItemResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Cart item ID',
        example: 'item_id_123',
    }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Variant ID',
        example: 'variant_id_123',
    }),
    __metadata("design:type", String)
], CartItemResponseDto.prototype, "variantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Quantity',
        example: 2,
    }),
    __metadata("design:type", Number)
], CartItemResponseDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Variant details',
    }),
    __metadata("design:type", Object)
], CartItemResponseDto.prototype, "variant", void 0);
//# sourceMappingURL=add-item-cart.dto.js.map