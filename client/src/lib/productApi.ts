import { get } from "http";
import axiosClient from "./axiosClient";
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
  getProductsByCategory: (categorySlug: string) => axiosClient.get(`/products/category/${categorySlug}`),
  getAllProducts: () => axiosClient.get("/products"),
};

export const fetchAllProducts = async () => {
  try {
    const res = await productsAPI.getAllProducts();
    console.log('🔍 Raw API Response for all products:', res);
    
    // Handle different response structures
    if (Array.isArray(res)) {
      console.log('✅ Response is array, count:', res.length);
      return res;
    }
    
    const apiRes = res as unknown as ApiResponse;
    if (apiRes.success && apiRes.data) {
      const products = Array.isArray(apiRes.data) ? apiRes.data : [];
      console.log('✅ Response has data, count:', products.length);
      return products;
    }
    
    // Fallback: check if res has data property directly
    if ((res as { data?: unknown }).data && Array.isArray((res as { data?: unknown }).data)) {
      console.log('✅ Response has direct data, count:', ((res as { data?: Product[] }).data)?.length);
      return (res as { data?: Product[] }).data || [];
    }
    
    console.warn('⚠️ No products found in response');
    return [];
  } catch (error: unknown) {
    console.error("❌ Fetch all products error:", error);
    return [];
  }
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
    const apiRes = res as unknown as ApiResponse;

    if (apiRes.success && apiRes.data) {
      return apiRes.data;
    }

    throw new Error("Product not found");
  } catch (error: unknown) {
    console.error("Fetch product by ID error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch product";
    throw new Error(errorMessage);
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

