"use client";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Eye, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { fetchAdminOrders } from "@/lib/adminApi";
import { toast } from "sonner";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";

interface OrderUser {
    id: string;
    name: string;
}

interface OrderShippingAddress {
    fullName: string;
}

interface OrderPayment {
    provider: string;
}

interface Order {
    id: string;
    code: string;
    createdAt: string;
    total: number;
    status: string;
    shippingAddress?: OrderShippingAddress;
    user?: OrderUser;
    payments?: OrderPayment[];
}

const statusMap: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800" },
    CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-800" },
    PROCESSING: { label: "Đang xử lý", color: "bg-indigo-100 text-indigo-800" },
    SHIPPING: { label: "Đang giao hàng", color: "bg-orange-100 text-orange-800" },
    DELIVERED: { label: "Đã giao", color: "bg-teal-100 text-teal-800" },
    COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-800" },
    PAID: { label: "Đã thanh toán", color: "bg-emerald-100 text-emerald-800" },
    CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800" },
    FAILED: { label: "Thất bại", color: "bg-rose-100 text-rose-800" },
    REFUNDED: { label: "Đã hoàn tiền", color: "bg-purple-100 text-purple-800" },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminOrders();
            setOrders(data);
        } catch (error: unknown) {
            console.error("Failed to load orders", error);
            toast.error("Không thể tải danh sách đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
        return <Badge className={`${config.color} border-none hover:${config.color}`}>{config.label}</Badge>;
    };

    const filteredOrders = orders.filter(order =>
        order.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.shippingAddress?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination calculations
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Đơn hàng</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý và theo dõi đơn hàng ({orders.length})</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" /> Xuất báo cáo
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                        placeholder="Tìm kiếm mã đơn, khách hàng..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800">
                            <TableHead>Mã đơn hàng</TableHead>
                            <TableHead>Khách hàng</TableHead>
                            <TableHead>Ngày đặt</TableHead>
                            <TableHead>Tổng tiền</TableHead>
                            <TableHead>Thanh toán</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    Không tìm thấy đơn hàng nào
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium text-blue-600 dark:text-blue-400">#{order.code}</TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        {order.shippingAddress?.fullName || order.user?.name || "Khách lẻ"}
                                    </TableCell>
                                    <TableCell className="dark:text-gray-300">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                                    <TableCell className="font-bold text-red-600 dark:text-red-400">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.total))}
                                    </TableCell>
                                    <TableCell className="dark:text-gray-300">
                                        {order.payments?.[0]?.provider === 'OTHER' ? 'COD' : order.payments?.[0]?.provider || 'N/A'}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/orders/${order.id}`}>
                                                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                                    <Eye className="w-4 h-4 mr-1" /> Xem
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredOrders.length}
                    itemsPerPage={itemsPerPage}
                />
            )}
        </div>
    );
}
