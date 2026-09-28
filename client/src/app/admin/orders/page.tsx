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
import { Eye, Search, Filter, PackageSearch, Play, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { useState, useEffect, useRef, type MouseEvent } from "react";
import { fetchAdminOrders, updateOrderStatus } from "@/lib/adminApi";
import { canFastProcess, isCodOrder } from "@/lib/orderHelpers";
import { getErrorMessage } from "@/lib/utils";
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
    status?: string;
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
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING_WORK">("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [actingId, setActingId] = useState<string | null>(null);
    const actingIdRef = useRef<string | null>(null);
    const selectionOnMouseDown = useRef("");
    // Map id -> status ở lần poll trước, để chỉ toast đơn mới/đổi trạng thái
    const prevOrdersRef = useRef(new Map<string, string>());
    const itemsPerPage = 10;

    useEffect(() => {
        document.body.style.pointerEvents = "";
        loadOrders(true);

        // Poll nền 8s: khách trả tiền xong là admin thấy ngay, không cần F5
        const timer = setInterval(() => {
            pollOrders();
        }, 8000);

        return () => {
            document.body.style.pointerEvents = "";
            clearInterval(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const loadOrders = async (initial = false) => {
        try {
            if (initial) setLoading(true);
            const data = await fetchAdminOrders();
            const list = data as unknown as Order[];
            setOrders(list);
            if (initial) {
                // Nạp snapshot lần đầu, không toast để tránh spam
                prevOrdersRef.current = new Map(list.map((o) => [o.id, o.status]));
            }
        } catch (error: unknown) {
            console.error("Failed to load orders", error);
            if (initial) toast.error("Không thể tải danh sách đơn hàng");
        } finally {
            if (initial) setLoading(false);
        }
    };

    const notifyPaid = (o: Order) => {
        toast.success(`Đơn #${o.code} vừa thanh toán thành công!`, {
            action: { label: "Xem", onClick: () => router.push(`/admin/orders/${o.id}`) },
        });
    };

    const pollOrders = async () => {
        // Đang bấm "Xử lý" thì bỏ qua poll để response cũ không ghi đè trạng thái mới
        if (actingIdRef.current) return;
        try {
            const data = await fetchAdminOrders();
            const list = data as unknown as Order[];
            const prev = prevOrdersRef.current;
            const seen = new Set<string>();
            for (const o of list) {
                seen.add(o.id);
                const oldStatus = prev.get(o.id);
                const isJustPaid =
                    (oldStatus === undefined && o.status === "PAID") ||
                    (oldStatus !== undefined && oldStatus !== o.status && o.status === "PAID");
                if (isJustPaid) {
                    notifyPaid(o);
                } else if (oldStatus === undefined && isCodOrder(o)) {
                    toast.info(`Đơn COD mới #${o.code} cần xử lý!`, {
                        action: { label: "Xem", onClick: () => router.push(`/admin/orders/${o.id}`) },
                    });
                }
                prev.set(o.id, o.status);
            }
            // Dọn id rớt khỏi top 100 để map không phình
            for (const id of Array.from(prev.keys())) {
                if (!seen.has(id)) prev.delete(id);
            }
            setOrders(list);
        } catch {
            // Lỗi thoáng qua thì bỏ qua, lần sau poll tiếp
        }
    };

    const handleFastProcess = async (event: MouseEvent, order: Order) => {
        event.stopPropagation();
        if (actingIdRef.current) return;
        setActingId(order.id);
        actingIdRef.current = order.id;
        try {
            await updateOrderStatus(order.id, "PROCESSING", {
                reason: "Admin tiến hành xử lý đơn hàng",
                changedBy: "admin",
            });
            toast.success(`Đã chuyển đơn #${order.code} sang Đang xử lý`);
            setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "PROCESSING" } : o)));
            prevOrdersRef.current.set(order.id, "PROCESSING");
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Không thể chuyển trạng thái"));
        } finally {
            setActingId(null);
            actingIdRef.current = null;
        }
    };

    const pendingWorkCount = orders.filter((o) => canFastProcess(o)).length;

    const filteredOrders = orders.filter(order => {
        if (statusFilter === "PENDING_WORK" && !canFastProcess(order)) return false;
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

    // Kẹp trang hiện tại khi danh sách co lại (poll/xử lý xong) để không ra bảng rỗng
    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
        if (currentPage > maxPage) setCurrentPage(maxPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredOrders.length, currentPage]);

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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm mã đơn, khách hàng..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={statusFilter === "ALL" ? "default" : "outline"}
                            size="sm"
                            onClick={() => { setStatusFilter("ALL"); setCurrentPage(1); }}
                        >
                            Tất cả
                        </Button>
                        <Button
                            variant={statusFilter === "PENDING_WORK" ? "default" : "outline"}
                            size="sm"
                            className="gap-1.5"
                            onClick={() => { setStatusFilter("PENDING_WORK"); setCurrentPage(1); }}
                        >
                            Chờ xử lý
                            {pendingWorkCount > 0 && (
                                <Badge variant="destructive" className="px-1.5 py-0 text-[11px] leading-4">
                                    {pendingWorkCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
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
                                            {canFastProcess(order) && (
                                                <Button
                                                    size="sm"
                                                    className="gap-1"
                                                    disabled={actingId === order.id}
                                                    onClick={(event) => handleFastProcess(event, order)}
                                                >
                                                    {actingId === order.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Play className="w-4 h-4" />
                                                    )}
                                                    Xử lý
                                                </Button>
                                            )}
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
