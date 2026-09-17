import axiosClient from "./axiosClient";
import type { ProductFormValues } from "@/components/admin/ProductForm";

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Analytics đọc nặng, DB serverless thỉnh thoảng cold-start quá 10s mặc định:
// nới timeout 30s + thử lại 1 lần nếu timeout.
const ANALYTICS_TIMEOUT = 30000;

async function getAnalytics(url: string, params?: Record<string, any>): Promise<any> {
    let lastError: any = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            return await axiosClient.get(url, { params, timeout: ANALYTICS_TIMEOUT });
        } catch (err: any) {
            lastError = err;
            const isTimeout =
                err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '');
            if (!isTimeout) throw err;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    throw lastError;
}

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

    const res: any = await getAnalytics("/analytics/revenue-stats", params);
    return res?.data ?? res;
};

export const getOrderStatusDistribution = async () => {
    const res: any = await getAnalytics("/analytics/order-status-distribution");
    return res?.data ?? res;
};

export const getTopSellingProducts = async (period: TimePeriod = 'week', limit: number = 10) => {
    const res: any = await getAnalytics("/analytics/top-selling-products", { period, limit });
    return res?.data ?? res;
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
