import { get } from "http";
import axiosClient from "./axiosClient";

interface ApiResponse<T = any> {
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
    const apiRes = res as unknown as ApiResponse;
    if (apiRes.success && apiRes.data) {
      return Array.isArray(apiRes.data) ? apiRes.data : [];
    }
    return [];
  } catch (error: any) {
    console.error("Fetch all products error:", error);
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
  } catch (error: any) {
    console.error("Fetch featured products error:", error);
    return [];
  }
};

export const fetchCategoriesList = async () => {
  try {
    const res = await productsAPI.getCategoriesList();
    console.log("Categories response:", res);

    // res đã được transform bởi interceptor thành ApiResponse  
    const apiRes = res as unknown as ApiResponse;

    if (apiRes.success && apiRes.data) {
      return Array.isArray(apiRes.data) ? apiRes.data : [];
    }

    return [];
  } catch (error: any) {
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
  } catch (error: any) {
    console.error("Fetch product by ID error:", error);
    throw new Error(error.errormassage || "Failed to fetch product");
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
  catch (error: any) {
    console.error("Fetch products by category error:", error);
    return [];
  }
};

