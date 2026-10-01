import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prismaClient/prisma.service";
import { ProductResponseDto } from "./dto/product.dto";
import { formatPrice } from "src/utils/price.util";

import {
  AuditLogService,
  AuditAction,
  AuditEntity,
} from "../audit-log/audit-log.service";

/**
 * Nhãn nhóm ảo cho sản phẩm không có thương hiệu. getBrands gộp các sản phẩm
 * đó về chung một mục để chúng không biến mất khỏi bộ lọc, và findAll hiểu
 * nhãn này để lọc lại được nhóm ảo đó.
 */
export const OTHER_BRAND = 'other';

export interface FindAllProductsParams {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  /** Lọc theo một hoặc nhiều hãng (so khớp không phân biệt hoa thường). */
  brand?: string | string[];
  /** 'newest' (mặc định) | 'price-asc' | 'price-desc' | 'name-asc' */
  sort?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}
  /**
   * Danh sách sản phẩm: phân trang + lọc + sắp xếp đều làm ở server.
   *
   * Giá hiệu lực (salePrice nếu có, không thì price) nằm ở bảng Variant, mà Prisma
   * không where/orderBy theo trường của quan hệ to-many được. Nên bước chọn id dùng
   * raw SQL, rồi hydrate lại bằng Prisma để giữ nguyên shape cũ của mỗi sản phẩm.
   */
  async findAll(params: FindAllProductsParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 12));
    const offset = (page - 1) * limit;

    // Chọn danh mục cha thì lấy luôn sản phẩm nằm ở các danh mục con.
    let categoryIds: string[] | null = null;
    if (params.categoryId) {
      const children = await this.prisma.category.findMany({
        where: { parentId: params.categoryId },
        select: { id: true },
      });
      categoryIds = [params.categoryId, ...children.map((c) => c.id)];
    }

    const search = params.search?.trim();
    const like = search ? `%${search}%` : null;
    // Client nối nhiều hãng thành một tham số "HP,Samsung,Dell" (axios mã hoá
    // mảng thành brand[]=HP&brand[]=Dell nên server không đọc được), nên phải tách
    // dấu phẩy ra thay vì so khớp cả chuỗi - sẽ ra 0 sản phẩm.
    const brands = (Array.isArray(params.brand) ? params.brand : [params.brand ?? ''])
      .flatMap((b) => b.split(','))
      .map((b) => b.trim().toLowerCase())
      .filter((b) => b.length > 0);

    // "other" là nhóm ảo cho sản phẩm không có hãng (getBrands gộp NULL/rỗng
    // vào nhóm này). lower(NULL) là NULL nên phép so khớp bằng không bao giờ
    // trúng - phải so riêng theo điều kiện rỗng.
    const wantsOther = brands.includes(OTHER_BRAND);
    const namedBrands = brands.filter((b) => b !== OTHER_BRAND);
    const brandFilter = !brands.length
      ? Prisma.empty
      : Prisma.sql`AND (
          ${wantsOther
            ? Prisma.sql`p.brand IS NULL OR btrim(p.brand) = ''`
            : Prisma.empty}
          ${wantsOther && namedBrands.length ? Prisma.sql`OR` : Prisma.empty}
          ${namedBrands.length
            ? Prisma.sql`lower(btrim(p.brand)) = ANY(${namedBrands})`
            : Prisma.empty}
        )`;
    const min =
      Number(params.minPrice) > 0
        ? BigInt(Math.round(Number(params.minPrice)))
        : null;
    const max =
      Number(params.maxPrice) > 0
        ? BigInt(Math.round(Number(params.maxPrice)))
        : null;

    const source = Prisma.sql`
            FROM "Product" p
            LEFT JOIN LATERAL (
                SELECT MIN(COALESCE(v."salePrice", v.price)) AS eff
                FROM "Variant" v
                WHERE v."productId" = p.id
            ) vp ON true
            WHERE p."deletedAt" IS NULL
            ${categoryIds ? Prisma.sql`AND p."categoryId" = ANY(${categoryIds})` : Prisma.empty}
            ${brandFilter}
            ${
              like
                ? Prisma.sql`AND (
                p.name ILIKE ${like} OR p.description ILIKE ${like} OR p.brand ILIKE ${like}
                OR EXISTS (SELECT 1 FROM "Variant" sv WHERE sv."productId" = p.id AND sv.sku ILIKE ${like})
            )`
                : Prisma.empty
            }
            ${min != null ? Prisma.sql`AND vp.eff >= ${min}` : Prisma.empty}
            ${max != null ? Prisma.sql`AND vp.eff <= ${max}` : Prisma.empty}
        `;

    // p.id làm tie-breaker để hai trang liền nhau không lặp/bỏ sót sản phẩm.
    const orderBy =
      {
        "price-asc": Prisma.sql`ORDER BY vp.eff ASC NULLS LAST, p.id ASC`,
        "price-desc": Prisma.sql`ORDER BY vp.eff DESC NULLS LAST, p.id ASC`,
        "name-asc": Prisma.sql`ORDER BY p.name ASC, p.id ASC`,
      }[params.sort ?? ""] ?? Prisma.sql`ORDER BY p."createdAt" DESC, p.id ASC`;

    const [rows, counted] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
                SELECT p.id ${source} ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
                SELECT COUNT(*)::bigint AS total ${source}`,
    ]);

    const total = Number(counted[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) {
      return { products: [], total, page, limit, totalPages };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        descriptionImages: true,
        brand: true,
        soldCount: true,
        createdAt: true,
        updatedAt: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            displayOrder: true,
            alt: true,
            // Biến thể sở hữu ảnh: client dùng để đổi ảnh theo màu khách chọn.
            variantId: true,
          },
          orderBy: [
            { isPrimary: "desc" }, // Primary image first
            { displayOrder: "asc" },
          ],
        },
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            // Thiếu 2 trường này nên UI không bao giờ hiện được giá sale
            salePrice: true,
            discountPercent: true,
            stock: true,
            reservedQuantity: true,
            colors: true,
            attributes: true,
          },
        },
        _count: {
          select: {
            images: true,
            variants: true,
          },
        },
      },
    });

    // findMany không giữ thứ tự của `in`, nên xếp lại theo thứ tự raw query đã sắp.
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((p): p is (typeof products)[number] => !!p);

    return {
      products: ordered.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          price: formatPrice(variant.price),
          // salePrice là BigInt nullable: Number(null) ra 0 nên phải giữ null
          salePrice:
            variant.salePrice == null ? null : formatPrice(variant.salePrice),
          colors: variant.colors || [],
          availableStock: Math.max(
            0,
            Number((variant as any).stock ?? 0) -
              Number((variant as any).reservedQuantity ?? 0),
          ),
        })),
      })),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getFeaturedProducts(): Promise<ProductResponseDto[]> {
    // Chỉ chọn field ProductCard thực sự dùng. Bỏ description/descriptionImages
    // vì mô tả dài + mảng ảnh mô tả làm payload trang chủ phình lên vài chục KB,
    // trong khi thẻ sản phẩm chỉ cần tên, giá, ảnh, slug.
    const products = await this.prisma.product.findMany({
      take: 8,
      where: {
        deletedAt: null,
        variants: {
          some: {
            stock: {
              gt: 0,
            },
          },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        soldCount: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: true,
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
            reservedQuantity: true,
            colors: true,
            attributes: true,
          },
          where: {
            stock: {
              gt: 0,
            },
          },
          orderBy: {
            price: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return products.map((product) => this.formatProductResponse(product));
  }
  /**
   * Gợi ý nhanh khi gõ tìm kiếm: chỉ trả trường tối thiểu (id/slug/tên/
   * hãng/giá thấp nhất/1 ảnh) để dropdown header nhẹ, không kéo cả
   * description như endpoint /products.
   */
  async suggestProducts(query: string, limit = 8) {
    const q = query?.trim() ?? "";
    if (q.length < 2) return [];
    const take = Math.min(10, Math.max(1, Number(limit) || 8));
    // Từ khóa gợi ý gõ lặp đi lặp lại rất nhiều (mỗi phím gõ là một request
    // sau debounce). Cache in-memory 5 phút để request trùng về trong vài ms
    // thay vì scan ILIKE cả bảng.
    const key = `suggest:${q.toLowerCase().replace(/\s+/g, " ")}:${take}`;
    const hit = await this.cache.get(key);
    if (hit) return hit;
    const rows = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          take: 1,
        },
        variants: {
          select: { price: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
      orderBy: { soldCount: "desc" },
      take,
    });
    const result = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      brand: r.brand,
      price: r.variants[0]?.price ?? null,
      imageUrl: r.images[0]?.url ?? null,
    }));
    await this.cache.set(key, result);
    return result;
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

  async getProductByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    products: ProductResponseDto[];
    total: number;
    totalItems: number;
  }> {
    const skip = (page - 1) * limit;

    // First, find the category and get all child category IDs
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        children: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      return { products: [], total: 0, totalItems: 0 };
    }

    // Build list of category IDs (parent + all children)
    const categoryIds = [category.id, ...category.children.map((c) => c.id)];

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take: limit,
        where: {
          deletedAt: null,
          categoryId: {
            in: categoryIds,
          },
          variants: {
            some: {
              stock: {
                gt: 0,
              },
            },
          },
        },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          descriptionImages: true,
          brand: true,
          soldCount: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              // Biến thể sở hữu ảnh: client dùng để đổi ảnh theo màu khách chọn.
              variantId: true,
            },
          },
          variants: {
            select: {
              id: true,
              sku: true,
              price: true,
              stock: true,
              reservedQuantity: true,
              colors: true,
              attributes: true,
            },
            where: {
              stock: {
                gt: 0,
              },
            },
            orderBy: {
              price: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.product.count({
        where: {
          deletedAt: null,
          categoryId: {
            in: categoryIds,
          },
          variants: {
            some: {
              stock: {
                gt: 0,
              },
            },
          },
        },
      }),
    ]);
    return {
      products: products.map((product) => this.formatProductResponse(product)),
      total: Math.ceil(total / limit),
      totalItems: total,
    };
  }
  /**
   * Danh sách hãng kèm số sản phẩm, để dựng bộ lọc hãng ở trang danh mục.
   *
   * Đếm theo điều kiện lọc hiện tại (danh mục, từ khoá) để con số khớp với
   * danh sách đang xem. Sản phẩm không có hãng gom vào nhóm "other" để không
   * biến mất khỏi danh sách.
   */
  async getBrands(
    params: { search?: string; categoryId?: string } = {},
  ): Promise<{ brand: string; count: number }[]> {
    const categoryIds = params.categoryId
      ? [
          ...new Set([
            params.categoryId,
            ...(await this.prisma.category.findMany({
              where: { parentId: params.categoryId },
              select: { id: true },
            })).map((c) => c.id),
          ]),
        ]
      : null;

    const like = params.search?.trim() ? `%${params.search.trim()}%` : null;

    // btrim ở cả đây lẫn findAll: dữ liệu từ crawler có thể có khoảng trắng
    // thừa quanh tên hãng, nếu chỉ lower() thì " Samsung" không khớp "samsung".
    const rows = await this.prisma.$queryRaw<{ brand: string; count: bigint }[]>`
      SELECT
        CASE
          WHEN p.brand IS NULL OR btrim(p.brand) = '' THEN ${OTHER_BRAND}
          ELSE btrim(p.brand)
        END AS brand,
        count(*)::bigint AS count
      FROM "Product" p
      WHERE p."deletedAt" IS NULL
      ${categoryIds ? Prisma.sql`AND p."categoryId" = ANY(${categoryIds})` : Prisma.empty}
      ${
        like
          ? Prisma.sql`AND (
              p.name ILIKE ${like}
              OR p.description ILIKE ${like}
              OR p.brand ILIKE ${like}
              OR EXISTS (SELECT 1 FROM "Variant" sv WHERE sv."productId" = p.id AND sv.sku ILIKE ${like})
            )`
          : Prisma.empty
      }
      GROUP BY 1
      ORDER BY count(*) DESC, 1 ASC
    `;

    return rows.map((row) => ({ brand: row.brand, count: Number(row.count) }));
  }

  async getProductById(id: string): Promise<ProductResponseDto | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        descriptionImages: true,
        brand: true,
        soldCount: true,
        createdAt: true,
        updatedAt: true,
        variants: true,
        images: { orderBy: { displayOrder: "asc" } },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    return this.formatProductResponse(product);
  }

  async createProduct(createProductDto: any, userId?: string) {
    try {
      // Kiểm tra trùng slug/SKU trước để báo lỗi rõ thay vì 500 của Prisma
      if (createProductDto.slug) {
        const existingSlug = await this.prisma.product.findUnique({
          where: { slug: createProductDto.slug },
        });
        if (existingSlug) {
          throw new HttpException(
            {
              success: false,
              message: `Slug "${createProductDto.slug}" đã tồn tại (trùng với "${existingSlug.name}"). Vui lòng đổi tên hoặc slug.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      const skus: string[] = (createProductDto.variants || [])
        .map((v: any) => v?.sku)
        .filter(Boolean);
      const dupInRequest = skus.find((s, i) => skus.indexOf(s) !== i);
      if (dupInRequest) {
        throw new HttpException(
          {
            success: false,
            message: `SKU "${dupInRequest}" bị lặp trong form. Mỗi biến thể cần SKU riêng.`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (skus.length > 0) {
        const existingSku = await this.prisma.variant.findFirst({
          where: { sku: { in: skus } },
        });
        if (existingSku) {
          throw new HttpException(
            {
              success: false,
              message: `SKU "${existingSku.sku}" đã tồn tại. Vui lòng đổi SKU.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Create product with variants
      const product = await this.prisma.product.create({
        data: {
          name: createProductDto.name,
          slug: createProductDto.slug,
          description: createProductDto.description,
          descriptionImages: createProductDto.descriptionImages || [],
          brand: createProductDto.brand,
          categoryId: createProductDto.categoryId,
          variants: {
            create: createProductDto.variants.map((variant: any) => ({
              sku: variant.sku,
              // Giá lưu thẳng bằng VND. Trước đây nhân 100 (kiểu cents)
              // nhưng formatPrice() lúc đọc không chia lại -> hiện sai 100 lần.
              price: BigInt(Math.round(variant.price)),
              stock: variant.stock || 0,
              colors: variant.colors || null,
              attributes: variant.attributes || {},
            })),
          },
          images: createProductDto.images
            ? {
                create: createProductDto.images.map(
                  (imageUrl: string, index: number) => ({
                    url: imageUrl,
                    isPrimary: index === 0,
                    displayOrder: index,
                  }),
                ),
              }
            : undefined,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: true,
          variants: true,
        },
      });

      // Log creation
      if (userId) {
        await this.auditLogService.log(
          AuditAction.PRODUCT_CREATE,
          AuditEntity.PRODUCT,
          userId,
          product.id,
          { name: product.name, sku: createProductDto.variants?.[0]?.sku },
        );
      }

      return this.formatProductResponse(product);
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id: string, updateProductDto: any, userId?: string) {
    try {
      // Check if product exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
        include: {
          variants: true,
          images: true,
        },
      });

      if (!existingProduct) {
        throw new Error("Product not found");
      }

      // Đổi slug thì kiểm tra trùng (trừ chính nó) để báo lỗi rõ
      if (
        updateProductDto.slug &&
        updateProductDto.slug !== existingProduct.slug
      ) {
        const slugClash = await this.prisma.product.findUnique({
          where: { slug: updateProductDto.slug },
        });
        if (slugClash) {
          throw new HttpException(
            {
              success: false,
              message: `Slug "${updateProductDto.slug}" đã tồn tại (trùng với "${slugClash.name}"). Vui lòng đổi slug khác.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Prepare update data
      const updateData: any = {};

      if (updateProductDto.name) updateData.name = updateProductDto.name;
      if (updateProductDto.slug) updateData.slug = updateProductDto.slug;
      if (updateProductDto.description !== undefined)
        updateData.description = updateProductDto.description;
      if (updateProductDto.descriptionImages !== undefined)
        updateData.descriptionImages = updateProductDto.descriptionImages;
      if (updateProductDto.brand !== undefined)
        updateData.brand = updateProductDto.brand;
      if (updateProductDto.categoryId !== undefined)
        updateData.categoryId = updateProductDto.categoryId;

      // Update product basic info
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          },
          variants: true,
        },
      });

      // Handle variants update if provided
      if (
        updateProductDto.variants &&
        Array.isArray(updateProductDto.variants)
      ) {
        for (const variantDto of updateProductDto.variants) {
          if (variantDto.id) {
            // Update existing variant
            const variantUpdateData: any = {};
            if (variantDto.sku) variantUpdateData.sku = variantDto.sku;
            if (variantDto.price !== undefined) {
              // Parse price and validate
              const priceValue = Number(variantDto.price);
              console.log("Updating variant price:", {
                original: variantDto.price,
                parsed: priceValue,
              });

              if (isNaN(priceValue) || priceValue < 0) {
                throw new Error(`Invalid price value: ${variantDto.price}`);
              }

              // Giá lưu thẳng bằng VND, không nhân 100 (xem ghi chú ở createProduct)
              const priceVnd = Math.round(priceValue);
              if (priceVnd > Number.MAX_SAFE_INTEGER) {
                throw new Error(`Price too large: ${priceValue}`);
              }

              variantUpdateData.price = BigInt(priceVnd);
            }
            if (variantDto.stock !== undefined)
              variantUpdateData.stock = variantDto.stock;
            if (variantDto.colors !== undefined) {
              // Ensure colors is either null or a valid JSON array
              variantUpdateData.colors = variantDto.colors
                ? JSON.parse(JSON.stringify(variantDto.colors))
                : null;
            }
            if (variantDto.attributes !== undefined)
              variantUpdateData.attributes = variantDto.attributes;

            await this.prisma.variant.update({
              where: { id: variantDto.id },
              data: variantUpdateData,
            });
          } else {
            // Create new variant
            await this.prisma.variant.create({
              data: {
                productId: id,
                sku: variantDto.sku,
                price: BigInt(Math.round(variantDto.price)),
                stock: variantDto.stock || 0,
                colors: variantDto.colors
                  ? JSON.parse(JSON.stringify(variantDto.colors))
                  : null,
                attributes: variantDto.attributes || {},
              } as any,
            });
          }
        }
      }

      // Handle images update if provided
      if (updateProductDto.images && Array.isArray(updateProductDto.images)) {
        // Delete existing images
        await this.prisma.productImage.deleteMany({
          where: { productId: id },
        });

        // Check if any image has isPrimary flag set to true
        const hasPrimaryImage = updateProductDto.images.some(
          (img) => typeof img === "object" && img.isPrimary === true,
        );

        // Create new images
        for (let i = 0; i < updateProductDto.images.length; i++) {
          const imageData = updateProductDto.images[i];

          // Handle both string URLs and image objects
          if (typeof imageData === "string") {
            await this.prisma.productImage.create({
              data: {
                productId: id,
                url: imageData,
                isPrimary: !hasPrimaryImage && i === 0, // First image is primary if no explicit primary
                displayOrder: i,
              },
            });
          } else if (typeof imageData === "object") {
            await this.prisma.productImage.create({
              data: {
                productId: id,
                url: imageData.url,
                isPrimary: imageData.isPrimary || (!hasPrimaryImage && i === 0),
                displayOrder: imageData.displayOrder ?? i,
                alt: imageData.alt,
              },
            });
          }
        }
      }

      // Handle primaryImageId if provided (set specific image as primary)
      if (updateProductDto.primaryImageId) {
        // First, set all images to non-primary
        await this.prisma.productImage.updateMany({
          where: { productId: id },
          data: { isPrimary: false },
        });

        // Then set the selected image as primary
        const primaryImage = await this.prisma.productImage.findFirst({
          where: {
            id: updateProductDto.primaryImageId,
            productId: id,
          },
        });

        if (primaryImage) {
          await this.prisma.productImage.update({
            where: { id: updateProductDto.primaryImageId },
            data: { isPrimary: true },
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
              slug: true,
            },
          },
          images: {
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          },
          variants: true,
        },
      });

      // Log update
      if (userId) {
        await this.auditLogService.log(
          AuditAction.PRODUCT_UPDATE,
          AuditEntity.PRODUCT,
          userId,
          id,
          {
            oldName: existingProduct.name,
            newName: finalProduct?.name,
            changes: Object.keys(updateProductDto),
          },
        );
      }

      return this.formatProductResponse(finalProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  async deleteProduct(id: string, userId?: string) {
    try {
      // Check if product exists
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new Error("Product not found");
      }

      // Soft delete by setting deletedAt
      await this.prisma.product.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // Log deletion
      if (userId) {
        await this.auditLogService.log(
          AuditAction.PRODUCT_DELETE,
          AuditEntity.PRODUCT,
          userId,
          id,
          { name: existingProduct.name },
        );
      }

      return { success: true, message: "Product deleted successfully" };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tình trạng hàng theo kho của 1 sản phẩm - PUBLIC cho storefront.
   * Chỉ trả trạng thái (còn/sắp hết/hết), KHÔNG lộ số lượng exact và
   * ngưỡng nội bộ. Chi tiết theo từng biến thể để khách chọn size nào
   * thì thấy đúng kho còn size đó.
   */
  async getProductAvailability(productId: string) {
    const [warehouses, rows] = await Promise.all([
      this.prisma.warehouse.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      this.prisma.warehouseInventory.findMany({
        where: { variant: { productId } },
        select: {
          warehouseId: true,
          variantId: true,
          quantity: true,
          minQuantity: true,
          variant: { select: { sku: true } },
        },
      }),
    ]);

    const byKey = new Map<string, { quantity: number; minQuantity: number }>();
    for (const r of rows) {
      byKey.set(`${r.warehouseId}:${r.variantId}`, {
        quantity: r.quantity,
        minQuantity: r.minQuantity,
      });
    }

    return {
      productId,
      warehouses: warehouses.map((w) => ({
        warehouseId: w.id,
        warehouseCode: w.code,
        warehouseName: w.name,
        variants: Array.from(
          new Map(
            rows
              .filter((r) => r.warehouseId === w.id)
              .map((r) => [r.variantId, r.variant.sku]),
          ).entries(),
        ).map(([variantId, sku]) => {
          const rec = byKey.get(`${w.id}:${variantId}`);
          const qty = rec ? rec.quantity : 0;
          return {
            variantId,
            sku,
            // Thiếu dòng tồn = 0 = hết hàng ở kho này
            inStock: qty > 0,
            lowStock: qty > 0 && rec ? qty <= rec.minQuantity : false,
          };
        }),
      })),
    };
  }

  private formatProductResponse(product: any): ProductResponseDto {
    return {
      ...product,
      variants: product.variants.map((variant: any) => ({
        ...variant,
        price: formatPrice(variant.price), // Convert BigInt to number
        // salePrice cũng là BigInt: bỏ sót sẽ làm JSON.stringify ném
        // "Do not know how to serialize a BigInt". Giữ null thay vì ép về 0.
        salePrice:
          variant.salePrice == null ? null : formatPrice(variant.salePrice),
        colors: variant.colors || [],
        // Available = On Hand - Reserved, tính động, kẹp >= 0.
        availableStock: Math.max(
          0,
          Number(variant.stock ?? 0) - Number(variant.reservedQuantity ?? 0),
        ),
      })),
    };
  }
}
