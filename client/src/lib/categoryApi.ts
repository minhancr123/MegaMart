import axiosClient from "./axiosClient";

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

const categoryAPI = {
  getAll: () => axiosClient.get("/products/categories"),
  getById: (id: string) => axiosClient.get(`/products/categories/${id}`),
  create: (data: any) => axiosClient.post("/products/categories", data),
  update: (id: string, data: any) => axiosClient.patch(`/products/categories/${id}`, data),
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
    
    if ((res as any).data && Array.isArray((res as any).data)) {
      return (res as any).data;
    }
    
    return [];
  } catch (error: any) {
    console.error("Fetch categories error:", error);
    return [];
  }
};

export const fetchCategoryById = async (id: string) => {
  try {
    const res = await categoryAPI.getById(id);
    return (res as any)?.data || res;
  } catch (error: any) {
    console.error("Fetch category by ID error:", error);
    throw error;
  }
};

export const createCategory = async (data: any) => {
  try {
    const res = await categoryAPI.create(data);
    return res;
  } catch (error: any) {
    console.error("Create category error:", error);
    throw error;
  }
};

export const updateCategory = async (id: string, data: any) => {
  try {
    const res = await categoryAPI.update(id, data);
    return res;
  } catch (error: any) {
    console.error("Update category error:", error);
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const res = await categoryAPI.delete(id);
    return res;
  } catch (error: any) {
    console.error("Delete category error:", error);
    throw error;
  }
};
