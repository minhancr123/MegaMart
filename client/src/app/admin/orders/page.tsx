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
import { Eye, Search, Filter, PackageSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { useState, useEffect, useRef, type MouseEvent } from "react";
import { fetchAdminOrders } from "@/lib/adminApi";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import { paymentProviderName } from "@/lib/paymentLabels";

interface OrderUser {
    id: string;
    name: string;
}

interface OrderShippingAddress {
    fullName?: string;
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
    shippingAddress?: OrderShippingAddress | string | null;
    user?: OrderUser;
    payments?: OrderPayment[];
}

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const selectionOnMouseDown = useRef("");
    const itemsPerPage = 10;

    useEffect(() => {
        document.body.style.pointerEvents = "";
        loadOrders();

        return () => {
            document.body.style.pointerEvents = "";
        };
    }, []);

    const getShippingName = (order: Order) => {
        const shippingAddress = order.shippingAddress;
        if (!shippingAddress) return "";
        if (typeof shippingAddress === "string") {
            try {
                const parsed = JSON.parse(shippingAddress) as unknown;
                if (parsed && typeof parsed === "object" && "fullName" in parsed) {
                    return String((parsed as { fullName?: unknown }).fullName || "");
                }
                if (typeof parsed === "string") return parsed;
            } catch {
                return shippingAddress;
            }
            return "";
        }
        return shippingAddress.fullName || "";
    };

    const openOrderDetail = (event: MouseEvent, orderId: string) => {
        // Chỉ bỏ qua khi thao tác vừa rồi tạo/đổi vùng bôi đen; selection cũ còn sót không được chặn click.
        const currentSelection = window.getSelection()?.toString() || "";
        const justSelected = !!currentSelection && currentSelection !== selectionOnMouseDown.current;
        selectionOnMouseDown.current = "";
        if (justSelected) return;
        // Ctrl/Cmd + click mở tab mới; click thường đi cùng tab.
        if (event.metaKey || event.ctrlKey) {
            window.open(`/admin/orders/${orderId}`, "_blank", "noopener,noreferrer");
            return;
        }
        if (event.shiftKey || event.altKey) return;
        router.push(`/admin/orders/${orderId}`);
    };

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

    const filteredOrders = orders.filter(order => {
        const shippingName = getShippingName(order);
        return order.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shippingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Đơn hàng"
                description={`Quản lý và theo dõi đơn hàng (${orders.length})`}
                actions={
                    <Button variant="outline" className="gap-2" disabled>
                        <Filter className="w-4 h-4" /> Xuất báo cáo
                    </Button>
                }
            />

            {/* Filters */}
            <Card className="gap-0 p-4">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm kiếm mã đơn, khách hàng..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Card>

            {/* Table */}
            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
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
                        {loading ? (
                            <AdminTableSkeleton columns={7} />
                        ) : paginatedOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="p-0">
                                    <AdminEmptyState
                                        icon={PackageSearch}
                                        title="Không tìm thấy đơn hàng nào"
                                        description={searchQuery ? "Thử đổi từ khóa tìm kiếm khác." : "Chưa có đơn hàng nào được tạo."}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedOrders.map((order) => (
                                <TableRow
                                    key={order.id}
                                    className="cursor-pointer"
                                    onMouseDown={() => {
                                        selectionOnMouseDown.current = window.getSelection()?.toString() || "";
                                    }}
                                    onAuxClick={(event) => {
                                        if (event.button === 1) {
                                            window.open(`/admin/orders/${order.id}`, "_blank", "noopener,noreferrer");
                                        }
                                    }}
                                    onClick={(event) => openOrderDetail(event, order.id)}
                                >
                                    <TableCell className="font-medium text-primary">
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="hover:underline"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            #{order.code}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                        {getShippingName(order) || order.user?.name || "Khách lẻ"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                                    <TableCell className="font-bold text-foreground">
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.total))}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {paymentProviderName(order.payments?.[0]?.provider)}
                                    </TableCell>
                                    <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild variant="ghost" size="sm" className="cursor-pointer text-primary hover:bg-primary/10 hover:text-primary">
                                                <Link href={`/admin/orders/${order.id}`} onClick={(event) => event.stopPropagation()}>
                                                    <Eye className="w-4 h-4 mr-1" /> Xem
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
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
