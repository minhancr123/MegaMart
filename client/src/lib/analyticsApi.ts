import axiosClient from "./axiosClient";
import type { ProductFormValues } from "@/components/admin/ProductForm";

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role?: string;
    phone?: string;
}

export const getRevenueStats = async (period: TimePeriod = 'week', date?: string) => {
    const params: Record<string, string> = { period };
    if (date) params.date = date;

    const res = await axiosClient.get("/analytics/revenue-stats", { params });
    return res.data?.data ?? res.data ?? res;
};

export const getOrderStatusDistribution = async () => {
    const res = await axiosClient.get("/analytics/order-status-distribution");
    return res.data?.data ?? res.data ?? res;
};

export const getTopSellingProducts = async (period: TimePeriod = 'week', limit: number = 10) => {
    const res = await axiosClient.get("/analytics/top-selling-products", {
        params: { period, limit },
    });
    return res.data?.data ?? res.data ?? res;
};

// Product Management
export const createProduct = async (productData: ProductFormValues) => {
    const res = await axiosClient.post("/products", productData);
    return res;
};

export const updateProduct = async (id: string, productData: ProductFormValues) => {
    const res = await axiosClient.patch(`/products/${id}`, productData);
    return res;
};

export const deleteProduct = async (id: string) => {
    const res = await axiosClient.delete(`/products/${id}`);
    return res;
};

// User Management
export const updateUser = async (id: string, userData: Partial<AdminUser>) => {
    const res = await axiosClient.patch(`/users/${id}`, userData);
    return res;
};

export const deleteUser = async (id: string) => {
    const res = await axiosClient.delete(`/users/${id}`);
    return res;
};
