"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchOrdersByUser } from "@/lib/orderApi";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Search,
  ChevronRight,
  Eye,
  ShoppingBag,
  Star,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { visibleAttributes, formatAttributeValue } from "@/lib/productAttributes";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { formatDate, formatPrice } from "@/lib/utils";

// Mapping cấu hình trạng thái chuẩn Stitch với Icon
const statusConfig: Record<
  string,
  { label: string; tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; icon: any }
> = {
  PENDING: { label: "Chờ xử lý", tone: "warning", icon: Clock },
  CONFIRMED: { label: "Đã xác nhận", tone: "info", icon: CheckCircle2 },
  PROCESSING: { label: "Đang xử lý", tone: "info", icon: RefreshCw },
  SHIPPING: { label: "Đang giao hàng", tone: "info", icon: Truck },
  DELIVERED: { label: "Đã giao", tone: "success", icon: CheckCircle2 },
  COMPLETED: { label: "Hoàn thành", tone: "success", icon: CheckCircle2 },
  PAID: { label: "Đã thanh toán", tone: "success", icon: CheckCircle2 },
  CANCELED: { label: "Đã hủy", tone: "destructive", icon: XCircle },
  FAILED: { label: "Thất bại", tone: "destructive", icon: XCircle },
  REFUNDED: { label: "Đã hoàn tiền", tone: "secondary", icon: RotateCcw },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Bộ lọc Tab & Tìm kiếm
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user?.id) {
      router.push("/auth?callbackUrl=/profile/orders");
      return;
    }
    if (user.role === "SHIPPER") {
      router.replace("/shipper");
      return;
    }
    loadOrders();
  }, [user?.id, user?.role, authChecked]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrdersByUser(user!.id);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Load orders error:", err);
      setError(err?.message || "Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  // Đếm số lượng theo nhóm tab
  const tabCounts = useMemo(() => {
    return {
      ALL: orders.length,
      PENDING: orders.filter((o) => ["PENDING", "CONFIRMED", "PAID"].includes(o.status)).length,
      PROCESSING: orders.filter((o) => o.status === "PROCESSING").length,
      SHIPPING: orders.filter((o) => o.status === "SHIPPING").length,
      COMPLETED: orders.filter((o) => ["COMPLETED", "DELIVERED"].includes(o.status)).length,
      CANCELED: orders.filter((o) => ["CANCELED", "FAILED"].includes(o.status)).length,
    };
  }, [orders]);

  // Lọc danh sách theo Tab & Search Query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Lọc theo tab
      if (activeTab === "PENDING" && !["PENDING", "CONFIRMED", "PAID"].includes(order.status)) return false;
      if (activeTab === "PROCESSING" && order.status !== "PROCESSING") return false;
      if (activeTab === "SHIPPING" && order.status !== "SHIPPING") return false;
      if (activeTab === "COMPLETED" && !["COMPLETED", "DELIVERED"].includes(order.status)) return false;
      if (activeTab === "CANCELED" && !["CANCELED", "FAILED"].includes(order.status)) return false;

      // 2. Lọc theo từ khóa tìm kiếm (Mã đơn hoặc tên sản phẩm)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = order.code?.toLowerCase().includes(query);
        const itemMatch = order.items?.some((i: any) =>
          i.variant?.product?.name?.toLowerCase().includes(query)
        );
        if (!codeMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Reset trang khi thay đổi Tab hoặc Search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Phân trang
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col justify-center items-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Đang tải đơn hàng của bạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card className="p-8 text-center border-border bg-card">
          <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Không thể tải đơn hàng</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button onClick={loadOrders} className="w-full rounded-xl">
            Thử lại
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Tiêu đề trang chuẩn Stitch */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Đơn hàng của tôi
        </h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi và quản lý các đơn đã mua
        </p>
      </div>

      {/* 2. Hệ thống Tabs lọc trạng thái kèm số lượng đếm */}
      <div className="border-b border-border overflow-x-auto pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <div className="flex items-center gap-1 sm:gap-2 min-w-max">
          {[
            { id: "ALL", label: "Tất cả", count: tabCounts.ALL },
            { id: "PENDING", label: "Chờ xử lý", count: tabCounts.PENDING },
            { id: "PROCESSING", label: "Đang xử lý", count: tabCounts.PROCESSING },
            { id: "SHIPPING", label: "Đang giao hàng", count: tabCounts.SHIPPING },
            { id: "COMPLETED", label: "Hoàn thành", count: tabCounts.COMPLETED },
            { id: "CANCELED", label: "Đã hủy", count: tabCounts.CANCELED },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Thanh tìm kiếm đơn hàng */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo mã đơn hàng hoặc tên sản phẩm..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-card border-border text-sm shadow-sm"
        />
      </div>

      {/* 4. Danh sách các thẻ đơn hàng (Order Cards) */}
      {paginatedOrders.length === 0 ? (
        <Card className="p-12 text-center border-border bg-card">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            {searchQuery ? "Không tìm thấy đơn hàng phù hợp" : "Chưa có đơn hàng nào trong mục này"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {searchQuery
              ? "Hãy thử tìm bằng từ khóa hoặc mã đơn khác."
              : "Khám phá các sản phẩm công nghệ tuyệt vời và đặt hàng ngay hôm nay!"}
          </p>
          <Link href="/products">
            <Button className="rounded-xl px-6 shadow-sm">
              Khám phá sản phẩm
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const status = statusConfig[order.status] || {
              label: order.status,
              tone: "secondary" as const,
              icon: Clock,
            };
            const StatusIcon = status.icon;

            return (
              <Card
                key={order.id}
                className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden gap-0 py-0 hover:shadow-md transition-shadow"
              >
                {/* Header Thẻ: Mã đơn + Ngày tạo + Badge trạng thái */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/15 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-foreground">
                      #{order.code || order.id.slice(-8)}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <Badge
                    variant={status.tone}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg"
                  >
                    <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{status.label}</span>
                  </Badge>
                </div>

                {/* Danh sách các sản phẩm trong đơn */}
                <div className="p-4 sm:p-5 divide-y divide-border">
                  {order.items?.map((item: any) => {
                    const product = item.variant?.product;
                    const primaryImage =
                      product?.images?.find((img: any) => img.isPrimary)?.url ||
                      product?.images?.[0]?.url ||
                      "/images/placeholder-product.svg";

                    return (
                      <div
                        key={item.id}
                        className="flex items-start sm:items-center gap-4 py-3.5 first:pt-0 last:pb-0"
                      >
                        {/* Ảnh sản phẩm */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-muted/40 rounded-xl overflow-hidden border border-border">
                          <Image
                            src={primaryImage}
                            alt={product?.name || "Product"}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>

                        {/* Thông tin sản phẩm */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm sm:text-base line-clamp-2 leading-snug">
                            {product?.name || "Sản phẩm"}
                          </h4>

                          {/* Phân loại thuộc tính */}
                          {item.variant?.attributes &&
                            visibleAttributes(item.variant.attributes).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Phân loại:{" "}
                                {visibleAttributes(item.variant.attributes)
                                  .map(([k, v]) => formatAttributeValue(v))
                                  .join(", ")}
                              </p>
                            )}

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span>x{item.quantity}</span>
                          </div>
                        </div>

                        {/* Đơn giá */}
                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground text-sm sm:text-base">
                            {formatPrice(Number(item.price))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Thẻ: Tổng tiền + Nút hành động */}
                <div className="p-4 sm:p-5 border-t border-border bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground">Tổng tiền:</span>
                    <span className="text-lg sm:text-xl font-bold text-primary">
                      {formatPrice(Number(order.total))}
                    </span>
                  </div>

                  {/* Nút hành động theo ngữ cảnh trạng thái Stitch */}
                  <div className="flex items-center justify-end gap-2.5">
                    {/* Hành động xem chi tiết luôn sẵn sàng */}
                    <Link href={`/profile/orders/${order.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 px-4 text-xs font-semibold border-border hover:bg-muted"
                      >
                        Xem chi tiết
                      </Button>
                    </Link>

                    {/* Nút theo ngữ cảnh */}
                    {order.status === "SHIPPING" && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/profile/orders/${order.id}`)}
                        className="rounded-xl h-9 px-4 text-xs font-bold shadow-sm"
                      >
                        Theo dõi đơn
                      </Button>
                    )}

                    {["COMPLETED", "DELIVERED", "PAID"].includes(order.status) && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (order.items?.[0]?.variant?.product?.id) {
                            router.push(`/product/${order.items[0].variant.product.id}`);
                          } else {
                            router.push("/products");
                          }
                        }}
                        className="rounded-xl h-9 px-4 text-xs font-bold shadow-sm"
                      >
                        Mua lại
                      </Button>
                    )}

                    {["PENDING", "CONFIRMED"].includes(order.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast.info("Yêu cầu hủy đơn hàng của bạn đang được chuyển đến nhân viên hỗ trợ.");
                        }}
                        className="rounded-xl h-9 px-4 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        Huỷ đơn
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Phân trang nếu danh sách có nhiều trang */}
      {totalPages > 1 && (
        <div className="pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}
    </div>
  );
}
