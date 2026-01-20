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
import { Eye, Search, Filter, Loader2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { fetchAdminOrders, updateOrderStatus } from "@/lib/adminApi";
import { toast } from "sonner";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Update Status State
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [newStatus, setNewStatus] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await fetchAdminOrders();
            setOrders(data);
        } catch (error) {
            console.error("Failed to load orders", error);
            toast.error("Không thể tải danh sách đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const handleEditStatus = (order: any) => {
        setSelectedOrder(order);
        setNewStatus(order.status);
        setStatusDialogOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder || !newStatus) return;

        try {
            setUpdating(true);
            await updateOrderStatus(selectedOrder.id, newStatus);
            toast.success("Cập nhật trạng thái thành công");
            setStatusDialogOpen(false);
            loadOrders(); // Reload
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Không thể cập nhật trạng thái");
        } finally {
            setUpdating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: any = {
            PENDING: { label: "Chờ xử lý", color: "bg-yellow-100 text-yellow-800" },
            PAID: { label: "Đã thanh toán", color: "bg-green-100 text-green-800" },
            SHIPPED: { label: "Đang giao", color: "bg-blue-100 text-blue-800" },
            DELIVERED: { label: "Đã giao", color: "bg-green-100 text-green-800" },
            CANCELED: { label: "Đã hủy", color: "bg-red-100 text-red-800" },
            FAILED: { label: "Thất bại", color: "bg-red-100 text-red-800" },
            REFUNDED: { label: "Đã hoàn tiền", color: "bg-purple-100 text-purple-800" },
        };
        const config = map[status] || { label: status, color: "bg-gray-100 text-gray-800" };
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
                    <h1 className="text-3xl font-bold text-gray-900">Đơn hàng</h1>
                    <p className="text-gray-500 mt-1">Quản lý và theo dõi đơn hàng ({orders.length})</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" /> Xuất báo cáo
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Tìm kiếm mã đơn, khách hàng..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
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
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    Không tìm thấy đơn hàng nào
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium text-blue-600">#{order.code}</TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        {order.shippingAddress?.fullName || order.user?.name || "Khách lẻ"}
                                    </TableCell>
                                    <TableCell>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                                    <TableCell className="font-bold text-red-600">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.total))}
                                    </TableCell>
                                    <TableCell>
                                        {order.payments?.[0]?.provider === 'OTHER' ? 'COD' : order.payments?.[0]?.provider || 'N/A'}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => handleEditStatus(order)}
                                            >
                                                <Edit className="w-4 h-4 mr-1" /> Sửa
                                            </Button>
                                            <Link href={`/profile/orders/${order.id}`}>
                                                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-700 hover:bg-gray-50">
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

            {/* Update Status Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
                        <DialogDescription>
                            Thay đổi trạng thái cho đơn hàng #{selectedOrder?.code}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">
                                Trạng thái
                            </Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                                    <SelectItem value="PAID">Đã thanh toán</SelectItem>
                                    <SelectItem value="SHIPPED">Đang giao hàng</SelectItem>
                                    <SelectItem value="DELIVERED">Đã giao hàng</SelectItem>
                                    <SelectItem value="CANCELED">Đã hủy</SelectItem>
                                    <SelectItem value="REFUNDED">Đã hoàn tiền</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleUpdateStatus} disabled={updating}>
                            {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
