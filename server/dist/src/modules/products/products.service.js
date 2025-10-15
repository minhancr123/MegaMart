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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prismaClient/prisma.service");
const price_util_1 = require("../../utils/price.util");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return new Promise(async (resolve, reject) => {
            try {
                const products = await this.prisma.product.findMany();
                console.log(products);
                resolve(products);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async getFeaturedProducts() {
        const products = await this.prisma.product.findMany({
            take: 8,
            where: {
                deletedAt: null,
                variants: {
                    some: {
                        stock: {
                            gt: 0
                        }
                    }
                }
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                variants: {
                    select: {
                        id: true,
                        sku: true,
                        price: true,
                        stock: true,
                        attributes: true
                    },
                    where: {
                        stock: {
                            gt: 0
                        }
                    },
                    orderBy: {
                        price: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return products.map(product => this.formatProductResponse(product));
    }
    async getCategoryList() {
        return this.prisma.category.findMany({
            where: { parentId: null },
            select: {
                id: true,
                name: true,
                slug: true,
                children: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
            },
        });
    }
    async getProductByCategory(categorySlug, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                skip,
                take: limit,
                where: {
                    deletedAt: null,
                    category: {
                        slug: categorySlug
                    },
                    variants: {
                        some: {
                            stock: {
                                gt: 0
                            }
                        }
                    }
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    images: {
                        select: {
                            id: true,
                            url: true,
                            alt: true
                        }
                    },
                    variants: {
                        select: {
                            id: true,
                            sku: true,
                            price: true,
                            stock: true,
                            attributes: true
                        },
                        where: {
                            stock: {
                                gt: 0
                            }
                        },
                        orderBy: {
                            price: 'asc'
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.product.count({
                where: {
                    deletedAt: null,
                    category: {
                        slug: categorySlug
                    },
                    variants: {
                        some: {
                            stock: {
                                gt: 0
                            }
                        }
                    }
                }
            })
        ]);
        return {
            products: products.map(product => this.formatProductResponse(product)),
            total: Math.ceil(total / limit),
            totalItems: total
        };
    }
    async getProductById(id) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: id,
                deletedAt: null
            },
            include: {
                variants: true,
                images: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                }
            }
        });
        if (!product) {
            return null;
        }
        return this.formatProductResponse(product);
    }
    formatProductResponse(product) {
        return {
            ...product,
            variants: product.variants.map((variant) => ({
                ...variant,
                price: (0, price_util_1.formatPrice)(variant.price)
            }))
        };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map