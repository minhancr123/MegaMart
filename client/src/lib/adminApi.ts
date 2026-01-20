import axiosClient from "./axiosClient";

export const fetchAdminStats = async () => {
    try {
        const [ordersRes, productsRes, usersRes] = await Promise.all([
            axiosClient.get("/orders/all?limit=1000"), // Get all orders for calculation
            axiosClient.get("/products"),
            axiosClient.get("/users"),
        ]);

        // Handle different response structures due to axiosClient interceptor
        const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes as any).data || [];
        const products = Array.isArray(productsRes) ? productsRes : (productsRes as any).data || [];
        const users = Array.isArray(usersRes) ? usersRes : (usersRes as any).data || [];

        // Calculate stats
        const totalRevenue = orders.reduce((sum: number, order: any) => sum + Number(order.total), 0);
        const newOrders = orders.filter((order: any) => order.status === "PENDING").length;

        const productsCount = products.length;
        const customersCount = users.length;

        // Calculate top products
        const productSales: Record<string, { name: string, sales: number, revenue: number }> = {};

        orders.forEach((order: any) => {
            // Count all orders for now to show some data, or strictly 'PAID'/'COMPLETED'
            // Let's count all non-cancelled orders for "sales" trends
            if (order.status !== 'CANCELED' && order.status !== 'FAILED') {
                order.items?.forEach((item: any) => {
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

export const fetchAdminProducts = async () => {
    const res = await axiosClient.get("/products");
    return Array.isArray(res) ? res : (res as any).data || [];
};

export const fetchAdminOrders = async () => {
    const res = await axiosClient.get("/orders/all?limit=100");
    return Array.isArray(res) ? res : (res as any).data || [];
};

export const fetchAdminUsers = async () => {
    const res = await axiosClient.get("/users");
    return Array.isArray(res) ? res : (res as any).data || [];
};

// Product CRUD
export const createProduct = async (productData: any) => {
    const res = await axiosClient.post("/products", productData);
    return res;
};

export const updateProduct = async (id: string, productData: any) => {
    const res = await axiosClient.patch(`/products/${id}`, productData);
    return res;
};

export const deleteProduct = async (id: string) => {
    const res = await axiosClient.delete(`/products/${id}`);
    return res;
};

// User Management
export const updateUser = async (id: string, userData: any) => {
    const res = await axiosClient.patch(`/users/${id}`, userData);
    return res;
};

export const deleteUser = async (id: string) => {
    const res = await axiosClient.delete(`/users/${id}`);
    return res;
};


// Order Management
export const updateOrderStatus = async (id: string, status: string) => {
    const res = await axiosClient.patch(`/orders/${id}/status`, { status });
    return res;
};

