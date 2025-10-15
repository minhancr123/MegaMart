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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const products_service_1 = require("./products.service");
const auth_gaurd_1 = require("../../guards/auth.gaurd");
let ProductsController = class ProductsController {
    productsService;
    constructor(productsService) {
        this.productsService = productsService;
    }
    async findAll() {
        const res = await this.productsService.findAll();
        return res;
    }
    async getFeaturedProducts() {
        try {
            const products = await this.productsService.getFeaturedProducts();
            return { data: { success: true, data: products, message: "Lấy sản phẩm nổi bật thành công" } };
        }
        catch (error) {
            throw new common_1.HttpException({ success: false, message: 'Lỗi server khi lấy sản phẩm nổi bật', detail: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCategoryList() {
        try {
            const categoryList = await this.productsService.getCategoryList();
            return { data: { success: true, data: categoryList, message: "Lấy danh sách loại thành công" } };
        }
        catch (error) {
            throw new common_1.HttpException({ success: false, message: 'Lỗi server khi lấy danh sách loại', detail: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getProductsByCategory(slug, page, limit) {
        const pagenumber = page ? parseInt(page.toString(), 10) : 1;
        const limitnumber = limit ? parseInt(limit.toString(), 10) : 12;
        const result = await this.productsService.getProductByCategory(slug, pagenumber, limitnumber);
        return { success: true, data: result.products, total: result.total, totalItems: result.totalItems, message: "Lấy sản phẩm theo danh mục thành công" };
    }
    async getProductById(id) {
        try {
            const product = await this.productsService.getProductById(id);
            if (!product) {
                throw new common_1.HttpException({ success: false, message: 'Không tìm thấy sản phẩm' }, common_1.HttpStatus.NOT_FOUND);
            }
            return {
                data: {
                    success: true,
                    data: product,
                    message: "Lấy thông tin sản phẩm thành công"
                }
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({ success: false, message: 'Lỗi server khi lấy thông tin sản phẩm', detail: error.message }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.UseGuards)(auth_gaurd_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getFeaturedProducts", null);
__decorate([
    (0, common_1.Get)("categories"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getCategoryList", null);
__decorate([
    (0, common_1.Get)("category/:slug"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Query)("page")),
    __param(2, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductsByCategory", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductById", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)("products"),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map