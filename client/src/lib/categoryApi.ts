import axiosClient from "./axiosClient";
import { Category } from "@/interfaces/product";

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

type CategoryCreateData = Omit<Category, 'id' | 'children'>;
type CategoryUpdateData = Partial<CategoryCreateData>;

const categoryAPI = {
  getAll: () => axiosClient.get("/products/categories"),
  getById: (id: string) => axiosClient.get(`/products/categories/${id}`),
  create: (data: CategoryCreateData) => axiosClient.post("/products/categories", data),
  update: (id: string, data: CategoryUpdateData) => axiosClient.patch(`/products/categories/${id}`, data),
  delete: (id: string) => axiosClient.delete(`/products/categories/${id}`),
};

export const fetchAllCategories = async () => {
  try {
    const res = await categoryAPI.getAll();
    
    if (Array.isArray(res)) {
      return res;
    }
    
    const apiRes = res as unknown as ApiResponse;
    if (apiRes.success && apiRes.data) {
      return Array.isArray(apiRes.data) ? apiRes.data : [];
    }
    
    if ((res as { data?: unknown }).data && Array.isArray((res as { data?: unknown }).data)) {
      return (res as { data?: Category[] }).data;
    }
    
    return [];
  } catch (error: unknown) {
    console.error("Fetch categories error:", error);
    return [];
  }
};

export const fetchCategoryById = async (id: string) => {
  try {
    const res = await categoryAPI.getById(id);
    return (res as { data?: Category })?.data || res;
  } catch (error: unknown) {
    console.error("Fetch category by ID error:", error);
    throw error;
  }
};

export const createCategory = async (data: CategoryCreateData) => {
  try {
    const res = await categoryAPI.create(data);
    return res;
  } catch (error: unknown) {
    console.error("Create category error:", error);
    throw error;
  }
};

export const updateCategory = async (id: string, data: CategoryUpdateData) => {
  try {
    const res = await categoryAPI.update(id, data);
    return res;
  } catch (error: unknown) {
    console.error("Update category error:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const res = await categoryAPI.delete(id);
    return res;
  } catch (error: unknown) {
    console.error("Delete category error:", error);
    throw error;
  }
};
