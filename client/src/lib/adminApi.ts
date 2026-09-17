import axiosClient from "./axiosClient";
import { Product } from "@/interfaces/product";
import type { ProductFormValues } from "@/components/admin/ProductForm";

interface AdminUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role?: string;
    phone?: string;
    supplierId?: string | null;
    supplier?: { id: string; name: string; code: string } | null;
}

interface OrderItem {
    variant?: {
        product?: {
            id: string;
            name: string;
        };
    };
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    total: number;
    status: string;
    items?: OrderItem[];
}

export const fetchAdminStats = async () => {
    try {
        const [ordersRes, productsRes, usersRes] = await Promise.all([
            axiosClient.get("/orders/all?limit=1000"), // Get all orders for calculation
            axiosClient.get("/products"),
            axiosClient.get("/users"),
        ]);

        // Handle different response structures due to axiosClient interceptor
        const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes as { data?: Order[] }).data || [];
        const products = Array.isArray(productsRes) ? productsRes : (productsRes as { data?: Product[] }).data || [];
        const users = Array.isArray(usersRes) ? usersRes : (usersRes as { data?: AdminUser[] }).data || [];

        // Calculate stats
        const totalRevenue = orders.reduce((sum: number, order: Order) => sum + Number(order.total), 0);
        const newOrders = orders.filter((order: Order) => order.status === "PENDING").length;

        const productsCount = products.length;
        const customersCount = users.length;

        // Calculate top products
        const productSales: Record<string, { name: string, sales: number, revenue: number }> = {};

        orders.forEach((order: Order) => {
            // Count all orders for now to show some data, or strictly 'PAID'/'COMPLETED'
            // Let's count all non-cancelled orders for "sales" trends
            if (order.status !== 'CANCELED' && order.status !== 'FAILED') {
                order.items?.forEach((item: OrderItem) => {
                    const productId = item.variant?.product?.id;
                    const productName = item.variant?.product?.name;
                    if (productId && productName) {
                        if (!productSales[productId]) {
                            productSales[productId] = { name: productName, sales: 0, revenue: 0 };
                        }
                        productSales[productId].sales += item.quantity;
                        productSales[productId].revenue += Number(item.price) * item.quantity;
                    }
                });
            }
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

        return {
            revenue: totalRevenue,
            newOrders,
            products: productsCount,
            customers: customersCount,
            recentOrders: orders.slice(0, 5),
            topProducts
        };
    } catch (error) {
        console.error("Fetch admin stats error:", error);
        throw error;
    }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Chống gọi trùng: React StrictMode (dev) mount effect 2 lần, và nhiều
// component có thể gọi cùng lúc - các call đồng thời giống nhau dùng chung
// 1 promise để khỏi nhân đôi request lên server.
const inflightAdminProducts = new Map<string, Promise<AdminProductsResult>>();

export interface AdminProductsResult {
    items: Product[];
    total: number;
    totalPages: number;
    page: number;
}

/**
 * Lấy 1 trang sản phẩm cho admin (phân trang + tìm kiếm ở SERVER).
 * Shop có ~6000 SP nên không thể đổ hết về client (vừa nặng vừa dính 429).
 */
export const fetchAdminProductsPage = async (
    params: { page?: number; limit?: number; search?: string } = {}
): Promise<AdminProductsResult> => {
    const cacheKey = JSON.stringify(params);
    const existing = inflightAdminProducts.get(cacheKey);
    if (existing) return existing;

    const task = (async (): Promise<AdminProductsResult> => {
        const query = new URLSearchParams();
        if (params.page) query.append("page", params.page.toString());
        // Server kẹp limit tối đa 100
        if (params.limit) query.append("limit", Math.min(100, params.limit).toString());
        if (params.search) query.append("search", params.search);
        const qs = query.toString() ? `?${query.toString()}` : "";

        // Retry khi dính 429 (server giới hạn 3 req/giây)
        let res: any = null;
        for (let attempt = 0; ; attempt += 1) {
            try {
                res = await axiosClient.get(`/products${qs}`);
                break;
            } catch (err: any) {
                const status = err?.status ?? err?.response?.status;
                if (status === 429 && attempt < 4) {
                    await sleep(1500 * (attempt + 1));
                    continue;
                }
                throw err;
            }
        }

        const items: Product[] = Array.isArray(res) ? res : (res?.products ?? res?.data ?? []);
        return {
            items,
            total: Array.isArray(res) ? items.length : Number(res?.total ?? items.length) || 0,
            totalPages: Array.isArray(res) ? 1 : Number(res?.totalPages ?? 1) || 1,
            page: Array.isArray(res) ? 1 : Number(res?.page ?? params.page ?? 1) || 1,
        };
    })();

    inflightAdminProducts.set(cacheKey, task);
    try {
        return await task;
    } finally {
        inflightAdminProducts.delete(cacheKey);
    }
};

export const fetchAdminOrders = async () => {
    const res = await axiosClient.get("/orders/all?limit=100");
    return Array.isArray(res) ? res : (res as { data?: Order[] }).data || [];
};

export const fetchAdminUsers = async (role?: string) => {
    const params = role && role !== 'ALL' ? { role } : undefined;
    const res = await axiosClient.get("/users", { params });
    return Array.isArray(res) ? res : (res as { data?: AdminUser[] }).data || [];
};

// Product CRUD
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
export const createUser = async (userData: {
  email: string;
  password: string;
  name?: string;
  role?: string;
  supplierId?: string;
}) => {
    const res = await axiosClient.post("/users", userData);
    return res;
};

export const updateUser = async (id: string, userData: Partial<AdminUser>) => {
    const res = await axiosClient.patch(`/users/${id}`, userData);
    return res;
};

export const deleteUser = async (id: string) => {
    const res = await axiosClient.delete(`/users/${id}`);
    return res;
};

export interface Customer360Response {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  financial: {
    walletBalance: number;
    walletStatus: string;
    loyaltyPoints: number;
    lifetimePoints: number;
    tierName: string;
    tierIcon: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: string | null;
  };
  recentOrders: any[];
  recentWalletTransactions: any[];
  recentPointTransactions: any[];
}

export const fetchCustomer360 = async (userId: string): Promise<Customer360Response> => {
  const res: any = await axiosClient.get(`/users/${userId}/customer-360`);
  return (res?.data ?? res) as Customer360Response;
};

export const adjustUserWallet = async (userId: string, amount: number, reason: string) => {
  const res: any = await axiosClient.post(`/users/${userId}/adjust-wallet`, { amount, reason });
  return res?.data ?? res;
};

export const adjustUserPoints = async (userId: string, amount: number, reason: string, type = 'BONUS') => {
  const res: any = await axiosClient.post(`/users/${userId}/adjust-points`, { amount, reason, type });
  return res?.data ?? res;
};


// Order Management
export const updateOrderStatus = async (
    id: string, 
    status: string, 
    options?: { reason?: string; note?: string; changedBy?: string }
) => {
    const res = await axiosClient.patch(`/orders/${id}/status`, { 
        status,
        ...options
    });
    return res;
};

