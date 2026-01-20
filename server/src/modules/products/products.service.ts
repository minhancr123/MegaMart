import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { ProductResponseDto } from './dto/product.dto';
import { formatPrice } from 'src/utils/price.util';

@Injectable()
export class ProductsService {
    constructor(private prisma : PrismaService) {}
    async findAll(){
        
        return new Promise(async (resolve , reject) => {
            try {
                const products =await this.prisma.product.findMany({
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        variants: {
                            select: {
                                sku: true
                            },
                            take: 1
                        },
                        _count: {
                            select: {
                                images: true
                            }
                        }
                    }
                });
                
                // Map SKU from first variant
                const productsWithSku = products.map(p => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    sku: p.variants[0]?.sku || 'N/A',
                    _count: p._count
                }));
                
                console.log(productsWithSku);
                resolve(productsWithSku);
            } catch (error) {
                reject(error);
            }
        })
    }

    async getFeaturedProducts() : Promise<ProductResponseDto[]> {
        const products = await this.prisma.product.findMany({
            take : 8,
            where : {
                deletedAt : null,
                variants : {
                    some : {
                        stock : {
                            gt : 0
                        }
                    }
                }
            },
            select : {
                id : true,
                slug : true,
                name : true,
                description : true,
                brand : true,
                soldCount : true,
                createdAt : true,
                updatedAt : true,
                category : {
                    select : {
                        id : true,
                        name : true,
                        slug : true
                    }
                },
                images : true,
                variants : {
                    select: {
                        id : true,
                        sku : true, 
                        price : true,
                        stock : true,
                        attributes : true
                    },
                    where :{
                        stock : {
                            gt: 0
                        }
                    },
                    orderBy : {
                        price : 'asc'
                    }
                }
            },
            orderBy : {
                createdAt : 'desc'
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


     async getProductByCategory(categorySlug : string , page : number = 1 , limit : number = 10) : Promise<{products : ProductResponseDto[] , total: number ,  totalItems : number}> 
    {
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

        const [products , total] = await Promise.all([
            this.prisma.product.findMany({
                skip,
                take : limit,
                where : {
                    deletedAt : null,
                    categoryId: {
                        in: categoryIds
                    },
                    variants : {
                        some : {
                            stock : {
                                gt : 0
                            }
                        }
                    }
                },
                select : {
                    id : true,
                    slug : true,
                    name : true,
                    description : true,
                    brand : true,
                    soldCount : true,
                    createdAt : true,
                    updatedAt : true,
                    category : {
                        select :{
                            id : true,
                            name : true,
                            slug : true
                        }
                    },
                    images : {
                        select : {
                            id : true,
                            url : true,
                            alt : true
                        }
                    },
                    variants :{
                        select : {
                            id : true,
                            sku : true,
                            price : true,
                            stock : true,
                            attributes : true
                        },
                        where : {
                            stock : {
                                gt : 0
                            }   
                        },
                        orderBy : {
                            price : 'asc'
                        }
                    }
                },
                orderBy : {
                    createdAt : 'desc'
                }
            }),
            this.prisma.product.count({
                where : {
                    deletedAt : null,
                    categoryId: {
                        in: categoryIds
                    },
                    variants : {
                        some : {
                            stock : {
                                gt : 0
                            }
                        }
                    }   
                }
            })
        ]);
        return {
            products : products.map(product => this.formatProductResponse(product)),
            total : Math.ceil(total / limit),
            totalItems : total
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
        // TODO: Implement create product logic
        throw new Error('Method not implemented yet');
    }

    async updateProduct(id: string, updateProductDto: any) {
        // TODO: Implement update product logic
        throw new Error('Method not implemented yet');
    }

    async deleteProduct(id: string) {
        // TODO: Implement delete product logic (soft delete)
        throw new Error('Method not implemented yet');
    }

    private formatProductResponse(product: any): ProductResponseDto {
        return {
            ...product,
            variants: product.variants.map((variant: any) => ({
                ...variant,
                price: formatPrice(variant.price) // Convert BigInt to number
            }))
        }
    }
}
