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
                const products =await this.prisma.product.findMany();
                console.log(products);
                resolve(products);
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
            include : {
                category : {
                    select : {
                        id : true,
                        name : true,
                        slug : true
                    }
                },
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

        const [products , total] = await Promise.all([
            this.prisma.product.findMany({
                skip,
                take : limit,
                where : {
                    deletedAt : null,
                    category : {
                        slug : categorySlug
                    },
                    variants : {
                        some : {
                            stock : {
                                gt : 0
                            }
                        }
                    }
                },
                include : {
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
                    category : {
                        slug : categorySlug
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
            include: {
                variants: true, // Bỏ where clause vì Variant không có deletedAt
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
