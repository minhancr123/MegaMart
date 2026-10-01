import axiosClient from "./axiosClient";
import { getErrorMessage } from "./utils";
import { Product, Category } from "@/interfaces/product";

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

const productsAPI = {
  getFeatureProducts: () => axiosClient.get("/products/featured"),
  getCategoriesList: () => axiosClient.get("/products/categories"),
  getProductById: (id: string) => axiosClient.get(`/products/${id}`),
  getProductAvailability: (id: string) => axiosClient.get(`/products/${id}/availability`),
  getProductsByCategory: (categorySlug: string) => axiosClient.get(`/products/category/${categorySlug}`),
  getSuggestions: (params: { q: string; limit?: number }) =>
    axiosClient.get("/products/suggest", { params }),
  getAllProducts: (params?: ProductQuery) => axiosClient.get("/products", { params }),
  searchProducts: (params: ProductQuery) => axiosClient.get("/products", { params }),
  getBrands: (params?: { search?: string; categoryId?: string }) =>
    axiosClient.get("/products/brands", { params }),
};

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  /** Lọc theo một hoặc nhiều hãng. */
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  /** 'newest' (mặc định) | 'price-asc' | 'price-desc' | 'name-asc' */
  sort?: string;
  page?: number;
  limit?: number;
}

export interface PagedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_PAGE: PagedProducts = { products: [], total: 0, page: 1, limit: 12, totalPages: 0 };

/**
 * GET /products - lọc, sắp xếp và phân trang đều do server làm.
 * Trước đây client tải hết 3000+ sản phẩm (4.5MB) rồi mới lọc trong trình duyệt.
 */
export const fetchProductsPaged = async (query: ProductQuery = {}): Promise<PagedProducts> => {
  try {
    // Bỏ tham số rỗng để không gửi ?search=&categoryId= vô nghĩa lên server.
    // Mảng phải nối thành chuỗi, nếu không axios gửi brand[]=HP&brand[]=Dell
    // còn server chỉ đọc tham số "brand".
    const params = Object.fromEntries(
      Object.entries(query)
        .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v] as const)
        // Lọc SAU khi nối: brand=[] nối ra "" thì mới bị loại. Lọc trước thì
        // [] !== '' nên lọt qua rồi biến thành ?brand= rỗng trên URL.
        .filter(([, v]) => v !== undefined && v !== null && v !== ''),
    );
    const res = await productsAPI.getAllProducts(params);
    const body = res as unknown as Partial<PagedProducts>;

    if (Array.isArray(body?.products)) {
      return { ...EMPTY_PAGE, ...body } as PagedProducts;
    }

    console.warn('⚠️ Products response không đúng shape mong đợi:', res);
    return EMPTY_PAGE;
  } catch (error: unknown) {
    console.error("❌ Fetch products error:", error);
    return EMPTY_PAGE;
  }
};

/**
 * Trả mảng phẳng cho các màn hình chưa dùng phân trang.
 * Server kẹp limit tối đa ở 100 nên đây KHÔNG phải toàn bộ danh mục.
 */
export const fetchAllProducts = async (limit = 100): Promise<Product[]> => {
  const { products } = await fetchProductsPaged({ limit });
  return products;
};

export const fetchFeaturedProducts = async () => {
  try {
    const res = await productsAPI.getFeatureProducts();
    console.log("Featured products response:", res);

    // res đã được transform bởi interceptor thành ApiResponse
    const apiRes = res as unknown as ApiResponse;

    if (apiRes.success && apiRes.data) {
      return Array.isArray(apiRes.data) ? apiRes.data : [];
    }

    return [];
  } catch (error: unknown) {
    console.error("Fetch featured products error:", error);
    return [];
  }
};

/**
 * Danh sách hãng kèm số sản phẩm, đếm theo danh mục và từ khoá đang lọc.
 * Hãng "other" là nhóm gom các sản phẩm không có dữ liệu hãng.
 */
export const fetchBrands = async (
  params: { search?: string; categoryId?: string } = {},
): Promise<{ brand: string; count: number }[]> => {
  try {
    const res = await productsAPI.getBrands(params);
    const apiRes = res as unknown as ApiResponse<{ brand: string; count: number }[]>;
    if (apiRes.success && Array.isArray(apiRes.data)) return apiRes.data;
    return [];
  } catch (error: unknown) {
    console.error('Fetch brands error:', error);
    return [];
  }
};

export const fetchCategoriesList = async () => {
  try {
    const res = await productsAPI.getCategoriesList();
    console.log('🔍 Raw API Response for categories:', res);

    // Handle different response structures
    if (Array.isArray(res)) {
      console.log('✅ Categories response is array, count:', res.length);
      return res;
    }

    // res đã được transform bởi interceptor thành ApiResponse  
    const apiRes = res as unknown as ApiResponse;

    if (apiRes.success && apiRes.data) {
      const categories = Array.isArray(apiRes.data) ? apiRes.data : [];
      console.log('✅ Categories response has data, count:', categories.length);
      return categories;
    }
    
    // Fallback: check if res has data property directly
    if ((res as { data?: unknown }).data && Array.isArray((res as { data?: unknown }).data)) {
      console.log('✅ Categories response has direct data, count:', ((res as { data?: Category[] }).data)?.length);
      return (res as { data?: Category[] }).data || [];
    }

    console.warn('⚠️ No categories found in response');
    return [];
  } catch (error: unknown) {
    console.error("Fetch categories error:", error);
    return [];
  }
};

export const fetchProductById = async (id: string) => {
  try {
    const res = await productsAPI.getProductById(id);
    console.log("Product detail response:", res);

    // res đã được transform bởi interceptor thành ApiResponse
    const apiRes = res as unknown as ApiResponse<Product>;
    // Phòng hờ server/proxy trả object Product phẳng, không bọc success/data.
    if ((res as any)?.id && !(apiRes as any)?.data) {
      return res as unknown as Product;
    }

    if (apiRes.success && apiRes.data) {
      return apiRes.data;
    }

    throw new Error("Product not found");
  } catch (error: unknown) {
    console.error("Fetch product by ID error:", error);
    throw new Error(getErrorMessage(error, "Failed to fetch product"));
  }
};

export interface WarehouseAvailability {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  variants: Array<{
    variantId: string;
    sku: string;
    inStock: boolean;
    lowStock: boolean;
  }>;
}

export const fetchProductAvailability = async (
  id: string
): Promise<WarehouseAvailability[]> => {
  try {
    const res: any = await productsAPI.getProductAvailability(id);
    // axiosClient đã bóc sẵn lớp {data}: response có thể là {warehouses}
    // trực tiếp hoặc {success, data: {warehouses}} - hứng cả 2 dạng.
    const payload = res?.warehouses ? res : res?.data;
    return payload?.warehouses || [];
  } catch (error: unknown) {
    console.error("Fetch product availability error:", error);
    return [];
  }
};

export const fetchProductsByCategory = async (categorySlug: string) => {
  try {
    const res = await productsAPI.getProductsByCategory(categorySlug);
    console.log("Products by category response:", res);
    const apiRes = res as unknown as ApiResponse;

    if (apiRes.success && apiRes.data) {
      return Array.isArray(apiRes.data) ? apiRes.data : [];
    }

    return [];
  }
  catch (error: unknown) {
    console.error("Fetch products by category error:", error);
    return [];
  }
};

export const searchProducts = async (params: ProductQuery): Promise<Product[]> => {
  const page = await fetchProductsPaged(params);
  return page.products;
};

/** Một dòng gợi ý trong dropdown tìm kiếm: chỉ trường tối thiểu để nhẹ. */
export interface ProductSuggestion {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number | null;
  imageUrl: string | null;
}

/** Cache gợi ý trong session: gõ-xóa-gõ lại cùng từ thì hiện ngay, khỏi gọi API. */
const suggestionCache = new Map<string, ProductSuggestion[]>();
const SUGGESTION_CACHE_MAX = 50;

/** Gợi ý nhanh cho ô tìm kiếm header. Từ khóa dưới 2 ký tự trả rỗng ngay. */
export const fetchSuggestions = async (q: string, limit = 6): Promise<ProductSuggestion[]> => {
  const query = q.trim();
  if (query.length < 2) return [];
  const cacheKey = `${query.toLowerCase().replace(/\s+/g, " ")}|${limit}`;
  const hit = suggestionCache.get(cacheKey);
  if (hit) return hit;
  try {
    const res = await productsAPI.getSuggestions({ q: query, limit });
    const apiRes = res as unknown as ApiResponse<ProductSuggestion[]>;
    if (apiRes.success && Array.isArray(apiRes.data)) {
      if (suggestionCache.size >= SUGGESTION_CACHE_MAX) {
        suggestionCache.delete(suggestionCache.keys().next().value!);
      }
      suggestionCache.set(cacheKey, apiRes.data);
      return apiRes.data;
    }
    return [];
  } catch (error: unknown) {
    console.error("Fetch suggestions error:", error);
    return [];
  }
};
