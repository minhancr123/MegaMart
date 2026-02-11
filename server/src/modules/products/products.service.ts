import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { ProductResponseDto } from './dto/product.dto';
import { formatPrice } from 'src/utils/price.util';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) { }
    async findAll(search?: string) {

        return new Promise(async (resolve, reject) => {
            try {
                const whereClause: any = {
                    deletedAt: null
                };

                // Add search filter if provided
                if (search) {
                    whereClause.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { brand: { contains: search, mode: 'insensitive' } },
                        { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } }
                    ];
                }

                const products = await this.prisma.product.findMany({
                    where: whereClause,
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        description: true,
                        brand: true,
                        soldCount: true,
                        createdAt: true,
                        updatedAt: true,
                        categoryId: true,
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
                                isPrimary: true,
                                displayOrder: true,
                                alt: true
                            },
                            orderBy: [
                                { isPrimary: 'desc' }, // Primary image first
                                { displayOrder: 'asc' }
                            ]
                        },
                        variants: {
                            select: {
                                id: true,
                                sku: true,
                                price: true,
                                stock: true,
                                colors: true,
                                attributes: true
                            }
                        },
                        _count: {
                            select: {
                                images: true,
                                variants: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });

                // Convert BigInt fields to Number and scale
                const serializedProducts = products.map(product => ({
                    ...product,
                    variants: product.variants.map(variant => ({
                        ...variant,
                        price: formatPrice(variant.price),
                        colors: variant.colors || []
                    })),
                }));

                console.log(`✅ Found ${products.length} products with full data`);
                resolve(serializedProducts);
            } catch (error) {
                console.error('❌ Error fetching products:', error);
                reject(error);
            }
        })
    }

    async getFeaturedProducts(): Promise<ProductResponseDto[]> {
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
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                brand: true,
                soldCount: true,
                createdAt: true,
                updatedAt: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                },
                images: true,
                variants: {
                    select: {
                        id: true,
                        sku: true,
                        price: true,
                        stock: true,
                        colors: true,
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
        })
    }


    async getProductByCategory(categorySlug: string, page: number = 1, limit: number = 10): Promise<{ products: ProductResponseDto[], total: number, totalItems: number }> {
        const skip = (page - 1) * limit;

        // First, find the category and get all child category IDs
        const category = await this.prisma.category.findUnique({
            where: { slug: categorySlug },
            include: {
                children: {
                    select: { id: true }
                }
            }
        });

        if (!category) {
            return { products: [], total: 0, totalItems: 0 };
        }

        // Build list of category IDs (parent + all children)
        const categoryIds = [category.id, ...category.children.map(c => c.id)];

        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                skip,
                take: limit,
                where: {
                    deletedAt: null,
                    categoryId: {
                        in: categoryIds
                    },
                    variants: {
                        some: {
                            stock: {
                                gt: 0
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    brand: true,
                    soldCount: true,
                    createdAt: true,
                    updatedAt: true,
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
                            colors: true,
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
                    categoryId: {
                        in: categoryIds
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
        }
    }
    async getProductById(id: string): Promise<ProductResponseDto | null> {
        const product = await this.prisma.product.findFirst({
            where: {
                id: id,
                deletedAt: null
            },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                brand: true,
                soldCount: true,
                createdAt: true,
                updatedAt: true,
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

    async createProduct(createProductDto: any) {
        try {
            // Create product with variants
            const product = await this.prisma.product.create({
                data: {
                    name: createProductDto.name,
                    slug: createProductDto.slug,
                    description: createProductDto.description,
                    brand: createProductDto.brand,
                    categoryId: createProductDto.categoryId,
                    variants: {
                        create: createProductDto.variants.map((variant: any) => ({
                            sku: variant.sku,
                            price: BigInt(Math.round(variant.price * 100)),
                            stock: variant.stock || 0,
                            colors: variant.colors || null,
                            attributes: variant.attributes || {}
                        }))
                    },
                    images: createProductDto.images ? {
                        create: createProductDto.images.map((imageUrl: string, index: number) => ({
                            url: imageUrl,
                            isPrimary: index === 0,
                            displayOrder: index
                        }))
                    } : undefined
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    images: true,
                    variants: true
                }
            });

            return this.formatProductResponse(product);
        } catch (error) {
            throw error;
        }
    }

    async updateProduct(id: string, updateProductDto: any) {
        try {
            // Check if product exists
            const existingProduct = await this.prisma.product.findUnique({
                where: { id },
                include: {
                    variants: true,
                    images: true
                }
            });

            if (!existingProduct) {
                throw new Error('Product not found');
            }

            // Prepare update data
            const updateData: any = {};

            if (updateProductDto.name) updateData.name = updateProductDto.name;
            if (updateProductDto.slug) updateData.slug = updateProductDto.slug;
            if (updateProductDto.description !== undefined) updateData.description = updateProductDto.description;
            if (updateProductDto.brand !== undefined) updateData.brand = updateProductDto.brand;
            if (updateProductDto.categoryId !== undefined) updateData.categoryId = updateProductDto.categoryId;

            // Update product basic info
            const updatedProduct = await this.prisma.product.update({
                where: { id },
                data: updateData,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    images: {
                        orderBy: [
                            { isPrimary: 'desc' },
                            { displayOrder: 'asc' }
                        ]
                    },
                    variants: true
                }
            });

            // Handle variants update if provided
            if (updateProductDto.variants && Array.isArray(updateProductDto.variants)) {
                for (const variantDto of updateProductDto.variants) {
                    if (variantDto.id) {
                        // Update existing variant
                        const variantUpdateData: any = {};
                        if (variantDto.sku) variantUpdateData.sku = variantDto.sku;
                        if (variantDto.price !== undefined) {
                            // Parse price and validate
                            const priceValue = Number(variantDto.price);
                            console.log('Updating variant price:', { original: variantDto.price, parsed: priceValue });

                            if (isNaN(priceValue) || priceValue < 0) {
                                throw new Error(`Invalid price value: ${variantDto.price}`);
                            }

                            // Check if price is too large
                            const priceInCents = Math.round(priceValue * 100);
                            if (priceInCents > Number.MAX_SAFE_INTEGER) {
                                throw new Error(`Price too large: ${priceValue}`);
                            }

                            variantUpdateData.price = BigInt(priceInCents);
                        }
                        if (variantDto.stock !== undefined) variantUpdateData.stock = variantDto.stock;
                        if (variantDto.colors !== undefined) {
                            // Ensure colors is either null or a valid JSON array
                            variantUpdateData.colors = variantDto.colors ? JSON.parse(JSON.stringify(variantDto.colors)) : null;
                        }
                        if (variantDto.attributes !== undefined) variantUpdateData.attributes = variantDto.attributes;

                        await this.prisma.variant.update({
                            where: { id: variantDto.id },
                            data: variantUpdateData
                        });
                    } else {
                        // Create new variant
                        await this.prisma.variant.create({
                            data: {
                                productId: id,
                                sku: variantDto.sku,
                                price: BigInt(Math.round(variantDto.price * 100)),
                                stock: variantDto.stock || 0,
                                colors: variantDto.colors ? JSON.parse(JSON.stringify(variantDto.colors)) : null,
                                attributes: variantDto.attributes || {}
                            } as any
                        });
                    }
                }
            }

            // Handle images update if provided
            if (updateProductDto.images && Array.isArray(updateProductDto.images)) {
                // Delete existing images
                await this.prisma.productImage.deleteMany({
                    where: { productId: id }
                });

                // Check if any image has isPrimary flag set to true
                const hasPrimaryImage = updateProductDto.images.some(img =>
                    typeof img === 'object' && img.isPrimary === true
                );

                // Create new images
                for (let i = 0; i < updateProductDto.images.length; i++) {
                    const imageData = updateProductDto.images[i];

                    // Handle both string URLs and image objects
                    if (typeof imageData === 'string') {
                        await this.prisma.productImage.create({
                            data: {
                                productId: id,
                                url: imageData,
                                isPrimary: !hasPrimaryImage && i === 0, // First image is primary if no explicit primary
                                displayOrder: i
                            }
                        });
                    } else if (typeof imageData === 'object') {
                        await this.prisma.productImage.create({
                            data: {
                                productId: id,
                                url: imageData.url,
                                isPrimary: imageData.isPrimary || (!hasPrimaryImage && i === 0),
                                displayOrder: imageData.displayOrder ?? i,
                                alt: imageData.alt
                            }
                        });
                    }
                }
            }

            // Handle primaryImageId if provided (set specific image as primary)
            if (updateProductDto.primaryImageId) {
                // First, set all images to non-primary
                await this.prisma.productImage.updateMany({
                    where: { productId: id },
                    data: { isPrimary: false }
                });

                // Then set the selected image as primary
                const primaryImage = await this.prisma.productImage.findFirst({
                    where: {
                        id: updateProductDto.primaryImageId,
                        productId: id
                    }
                });

                if (primaryImage) {
                    await this.prisma.productImage.update({
                        where: { id: updateProductDto.primaryImageId },
                        data: { isPrimary: true }
                    });
                }
            }

            // Fetch and return updated product with all relations
            const finalProduct = await this.prisma.product.findUnique({
                where: { id },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    },
                    images: {
                        orderBy: [
                            { isPrimary: 'desc' },
                            { displayOrder: 'asc' }
                        ]
                    },
                    variants: true
                }
            });

            return this.formatProductResponse(finalProduct);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(id: string) {
        try {
            // Check if product exists
            const existingProduct = await this.prisma.product.findUnique({
                where: { id }
            });

            if (!existingProduct) {
                throw new Error('Product not found');
            }

            // Soft delete by setting deletedAt
            await this.prisma.product.update({
                where: { id },
                data: {
                    deletedAt: new Date()
                }
            });

            return { success: true, message: 'Product deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    private formatProductResponse(product: any): ProductResponseDto {
        return {
            ...product,
            variants: product.variants.map((variant: any) => ({
                ...variant,
                price: formatPrice(variant.price), // Convert BigInt to number
                colors: variant.colors || []
            }))
        }
    }
}
