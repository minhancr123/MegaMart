"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById } from "@/lib/orderApi";
import { canFastProcess } from "@/lib/orderHelpers";
import { updateOrderStatus } from "@/lib/adminApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Package, User, CreditCard, ArrowLeft, Truck, Edit, RefreshCw, Play, Settings2, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/OrderStatusBadge";
import { GhnShipmentCard } from "@/components/admin/GhnShipmentCard";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { visibleAttributes, formatAttributeValue } from "@/lib/productAttributes";
import { paymentProviderName } from "@/lib/paymentLabels";
import { reassignShipper } from "@/lib/shippingApi";
import { ShipperLocationMap } from "@/components/admin/ShipperLocationMap";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface OrderUser {
    id: string;
    name: string;
    email?: string;
}

interface OrderShippingAddress {
    fullName: string;
    phone?: string;
    address?: string;
    ward?: string;
    district?: string;
    province?: string;
    lat?: number | null;
    lng?: number | null;
    provinceId?: number | null;
    districtId?: number | null;
    wardCode?: string | null;
    note?: string | null;
}

interface OrderPayment {
    id: string;
    provider: string;
    amount: number;
    status: string;
}

interface OrderItem {
    id: string;
    quantity: number;
    price: number;
    variantId?: string;
    variant?: {
        id: string;
        name: string;
        price?: number | null;
        salePrice?: number | null;
        attributes?: Record<string, unknown>;
        product?: {
            id: string;
            name: string;
            images?: Array<string | { url?: string | null }>;
        };
    };
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
    items?: OrderItem[];
    note?: string;
    shippingCarrier?: string | null;
    shippingOrderCode?: string | null;
    shippingStatus?: string | null;
    shippingFee?: number | null;
    shippingFeeReal?: number | null;
    discountAmount?: number | null;
    voucherCode?: string | null;
    vatAmount?: number | null;
    serials?: Array<{ id: string; variantId?: string | null; serial: string; status: string }>;
    assignedShipperId?: string | null;
    assignedShipper?: {
      id: string;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
      phone?: string | null;
      vehiclePlate?: string | null;
      shipperProfile?: { phone?: string | null; vehiclePlate?: string | null; vehicleType?: string | null } | null;
    } | null;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  
  // Update Status Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [params.id]);

  // Đơn PENDING (chờ khách chuyển khoản/quét QR) thì poll nền 5s:
  // khách trả xong là nút "Tiến hành xử lý" tự hiện, không cần F5.
  useEffect(() => {
    if (!order || order.status !== "PENDING") return;
    const orderId = order.id;
    let alive = true;
    let inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetchOrderById(orderId);
        if (!alive) return;
        const fresh = ((res as Order)?.id ? res : (res as { data: Order })?.data ?? res) as Order;
        if (!fresh?.id) return;
        if (fresh.status && fresh.status !== "PENDING") {
          setOrder(fresh);
          if (fresh.status === "PAID") {
            toast.success(`Đơn #${fresh.code} vừa thanh toán thành công. Có thể tiến hành xử lý.`);
          } else {
            toast.info(`Đơn #${fresh.code} chuyển sang: ${fresh.status}`);
          }
        }
      } catch {
        // Lỗi thoáng qua thì bỏ qua, lần sau poll tiếp
      } finally {
        inFlight = false;
      }
    }, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (!statusDialogOpen) {
      document.body.style.pointerEvents = "";
    }

    return () => {
      document.body.style.pointerEvents = "";
    };
  }, [statusDialogOpen]);

  const loadOrder = async (orderId: string, options: { background?: boolean } = {}) => {
    const background = options.background && !!order;
    setLoadFailed(false);
    try {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await fetchOrderById(orderId);
      
      if ((res as Order)?.id) {
        setOrder(res as Order);
      } else if ((res as { data: Order })?.data) {
        setOrder((res as { data: Order }).data);
      } else {
        setOrder(res as Order);
      }
    } catch (err: unknown) {
      console.error("Load order error:", err);
      setLoadFailed(true);
      toast.error("Không thể tải thông tin đơn hàng");
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleOpenStatusDialog = () => {
    if (!order) return;
    setNewStatus(order.status);
    setReason("");
    setNote("");
    setStatusDialogOpen(true);
  };

  const handleReassignShipper = async () => {
    if (!order) return;
    if (!confirm("Xác nhận đổi shipper phụ trách? Hệ thống sẽ tự động chọn shipper mới.")) return;
    try {
      setReassigning(true);
      await reassignShipper(order.id);
      toast.success("Đã phân công lại shipper");
      await loadOrder(order.id, { background: true });
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Lỗi khi đổi shipper"));
    } finally {
      setReassigning(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return;
    if (newStatus === order.status) {
      toast.error("Vui lòng chọn trạng thái khác");
      return;
    }

    try {
      setUpdating(true);
      await updateOrderStatus(order.id, newStatus, {
        reason,
        note,
        changedBy: "admin" // TODO: Get from auth context
      });
      toast.success("Cập nhật trạng thái thành công");
      setStatusDialogOpen(false);
      document.body.style.pointerEvents = "";
      await loadOrder(order.id, { background: true }); // Reload order without unmounting dialogs
    } catch (error: unknown) {
      console.error("Failed to update status", error);
      toast.error(getErrorMessage(error, "Không thể cập nhật trạng thái"));
    } finally {
      setUpdating(false);
    }
  };

  const handleFastProcess = async () => {
    if (!order) return;
    try {
      setUpdating(true);
      await updateOrderStatus(order.id, "PROCESSING", {
        reason: "Admin tiến hành xử lý đơn hàng",
        changedBy: "admin",
      });
      toast.success("Đã chuyển sang Đang xử lý");
      await loadOrder(order.id, { background: true });
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể chuyển trạng thái"));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <AdminEmptyState
            icon={Package}
            title="Không tìm thấy đơn hàng"
            description={loadFailed ? "Không thể tải thông tin đơn hàng. Vui lòng thử lại." : "Đơn hàng có thể đã bị xóa hoặc đường dẫn không đúng."}
            action={
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {loadFailed && params.id && (
                  <Button onClick={() => loadOrder(params.id as string)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Thử lại
                  </Button>
                )}
                <Button variant={loadFailed ? "outline" : "default"} onClick={() => router.push('/admin/orders')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay về danh sách
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  const parseShippingAddress = (value: Order["shippingAddress"]): OrderShippingAddress => {
    if (!value) return { fullName: "" };
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === "object") return parsed as OrderShippingAddress;
        if (typeof parsed === "string") return { fullName: parsed, address: parsed };
      } catch {
        return { fullName: value, address: value };
      }
      return { fullName: "" };
    }
    return value;
  };
  const shippingAddr = parseShippingAddress(order.shippingAddress);
  const shippingDestinationAddress = [
    shippingAddr.address,
    shippingAddr.ward,
    shippingAddr.district,
    shippingAddr.province,
  ].filter(Boolean).join(", ");
  const subtotal = order.items?.reduce((sum: number, item: OrderItem) => 
    sum + (Number(item.price) * item.quantity), 0) || 0;
  const getProductImageUrl = (item: OrderItem) => {
    const image = item.variant?.product?.images?.[0];
    if (!image) return null;
    return typeof image === "string" ? image : image.url || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" onClick={() => router.push('/admin/orders')} className="mb-4 cursor-pointer">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Chi tiết đơn hàng #{order.code}</h1>
            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Đặt ngày {new Date(order.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {canFastProcess(order) && (
            <Button
              onClick={handleFastProcess}
              disabled={updating}
              className="gap-2 shadow-md transition-all animate-in fade-in slide-in-from-right-2"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Tiến hành xử lý
            </Button>
          )}
          <OrderStatusBadge status={order.status} className="px-3 py-1 text-sm" />
          <Button onClick={handleOpenStatusDialog} className="gap-2 cursor-pointer">
            <Edit className="w-4 h-4" /> Cập nhật trạng thái
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Chi tiết sản phẩm</h2>
            </div>
            
            <div className="space-y-4">
              {order.items?.map((item: OrderItem) => (
                <div key={item.id} className="flex gap-4 p-4 bg-muted/50 rounded-lg border">
                  {getProductImageUrl(item) && (
                    <div className="relative w-20 h-20 flex-shrink-0 bg-background rounded overflow-hidden">
                      <img
                        src={getProductImageUrl(item) || ""}
                        alt={item.variant?.product?.name || "Sản phẩm"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.variant?.product?.name}
                    </h3>
                    {item.variant?.attributes &&
                      visibleAttributes(
                        item.variant.attributes as Record<string, unknown>
                      ).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {visibleAttributes(
                            item.variant.attributes as Record<string, unknown>
                          ).map(([key, val]) => (
                            <span key={key} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {key}: {formatAttributeValue(val)}
                            </span>
                          ))}
                        </div>
                      )}
                    <p className="text-sm text-muted-foreground">Số lượng: {item.quantity}</p>
                    {(order.serials || []).filter((s: any) => s.variantId === item.variantId).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <span className="text-[11px] text-muted-foreground">Serial:</span>
                        {(order.serials || [])
                          .filter((s: any) => s.variantId === item.variantId)
                          .map((s: any) => (
                            <span
                              key={s.id}
                              title={s.status === "SOLD" ? "Đã bán theo đơn này" : s.status}
                              className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border"
                            >
                              {s.serial}
                            </span>
                          ))}
                      </div>
                    )}
                    {(() => {
                      const paid = Number(item.price);
                      const list = Number(item.variant?.price);
                      const onSale =
                        Number.isFinite(paid) &&
                        Number.isFinite(list) &&
                        list > paid;
                      const pct = onSale
                        ? Math.round(((list - paid) / list) * 100)
                        : 0;
                      return (
                        <p className="text-sm text-muted-foreground">
                          Đơn giá:{" "}
                          <span className="font-semibold text-foreground">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(paid)}
                          </span>
                          {onSale && (
                            <>
                              <span className="ml-2 line-through">
                                {new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND'
                                }).format(list)}
                              </span>
                              <span className="ml-1.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-bold text-destructive">
                                -{pct}%
                              </span>
                            </>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Thành tiền</p>
                    <p className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="mt-6 pt-6 border-t space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính:</span>
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}
                </span>
              </div>
              
              {Number(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                  <span className="font-medium text-[var(--success)]">
                    -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.discountAmount))}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Thuế VAT:</span>
                <span className="font-medium text-foreground">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.vatAmount || 0))}
                </span>
              </div>

              {Number(order.shippingFee || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển:</span>
                  <span className="font-medium text-foreground">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.shippingFee))}
                  </span>
                </div>
              )}

              {(() => {
                const walletPaid = Number(
                  (order.payments || []).find((p: OrderPayment) => p.provider === "WALLET")?.amount || 0,
                );
                return walletPaid > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Đã trừ ví MegaMart:</span>
                    <span className="font-medium text-[var(--success)]">
                      -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(walletPaid)}
                    </span>
                  </div>
                ) : null;
              })()}
              
              <div className="flex justify-between font-bold text-lg pt-3 border-t">
                <span className="text-foreground font-medium">Tổng cộng:</span>
                <span className="text-primary text-xl">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(order.total))}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Thông tin khách hàng</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tên khách hàng</p>
                <p className="font-semibold text-foreground">{order.user?.name || 'Khách lẻ'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="font-semibold text-foreground">{order.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                <p className="font-semibold text-foreground">{shippingAddr.phone || 'N/A'}</p>
              </div>
            </div>
          </Card>

          {/* Shipping Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Truck className="h-5 w-5 text-[var(--success)]" />
              <h2 className="text-xl font-bold text-foreground">Thông tin giao hàng</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Người nhận</p>
                <p className="font-semibold text-foreground">{shippingAddr.fullName || 'Chưa có'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                <p className="font-semibold text-foreground">{shippingAddr.phone || 'Chưa có'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Địa chỉ</p>
                <p className="font-semibold text-foreground leading-relaxed">
                  {shippingAddr.address || 'Chưa có'}
                </p>
              </div>
              {shippingAddr.note && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                  <p className="text-sm text-foreground italic">&ldquo;{shippingAddr.note}&rdquo;</p>
                </div>
              )}
            </div>
          </Card>

          {/* Assigned Shipper */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Shipper phụ trách</h2>
            </div>
            {order.assignedShipper ? (
              <div className="space-y-4 text-sm">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Họ tên</p>
                    <p className="font-semibold text-foreground">{order.assignedShipper.name || 'Đang cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                    <p className="font-semibold text-foreground">
                      {order.assignedShipper.phone || order.assignedShipper.shipperProfile?.phone || 'Đang cập nhật'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phương tiện / biển số</p>
                    <p className="font-semibold text-foreground">
                      {order.assignedShipper.shipperProfile?.vehicleType || 'Phương tiện'} · {order.assignedShipper.vehiclePlate || order.assignedShipper.shipperProfile?.vehiclePlate || 'Đang cập nhật'}
                    </p>
                  </div>
                </div>

                {(order as any).shippingMetadata?.currentLocation && (
                  <div className="pt-3 border-t">
                    <ShipperLocationMap
                      lat={(order as any).shippingMetadata.currentLocation.lat}
                      lng={(order as any).shippingMetadata.currentLocation.lng}
                      destLat={shippingAddr.lat}
                      destLng={shippingAddr.lng}
                      destinationAddress={shippingDestinationAddress}
                      updatedAt={(order as any).shippingMetadata.currentLocation.updatedAt}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 mt-3 text-[11px] font-bold border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => {
                        const { lat, lng } = (order as any).shippingMetadata.currentLocation;
                        window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
                      }}
                    >
                      Mở Google Maps (Tab mới)
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={reassigning || order.status === "DELIVERED" || order.status === "COMPLETED"}
                  onClick={handleReassignShipper}
                  className="w-full h-8 text-xs text-muted-foreground hover:text-primary gap-1.5 border border-dashed border-border"
                >
                  {reassigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Đổi shipper phụ trách
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa phân công shipper. Khi bàn giao đơn, hệ thống sẽ tự chọn shipper đang hoạt động ít đơn nhất.</p>
            )}
          </Card>

          {/* GHN Shipment */}
          <GhnShipmentCard
            orderId={order.id}
            orderCode={order.code}
            orderStatus={order.status}
            shippingAddress={shippingAddr}
            shippingOrderCode={order.shippingOrderCode}
            shippingStatus={order.shippingStatus}
            shippingFeeReal={order.shippingFeeReal}
            onChanged={() => loadOrder(order.id, { background: true })}
          />

          {/* Payment Info */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Thanh toán</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phương thức:</span>
                <span className="font-semibold text-foreground">
                  {paymentProviderName(order.payments?.[0]?.provider)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái:</span>
                <PaymentStatusBadge status={order.payments?.[0]?.status} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
            <DialogDescription>
              Thay đổi trạng thái cho đơn hàng #{order.code}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Trạng thái mới</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                  <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                  <SelectItem value="PROCESSING">Đang xử lý</SelectItem>
                  <SelectItem value="SHIPPING">Đang giao hàng</SelectItem>
                  <SelectItem value="DELIVERED">Đã giao</SelectItem>
                  <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                  <SelectItem value="PAID">Đã thanh toán</SelectItem>
                  <SelectItem value="FAILED">Thất bại</SelectItem>
                  <SelectItem value="REFUNDED">Đã hoàn tiền</SelectItem>
                  <SelectItem value="CANCELED">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Lý do thay đổi (tùy chọn)</Label>
              <Input
                id="reason"
                placeholder="VD: Khách hàng yêu cầu"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Ghi chú thêm (tùy chọn)</Label>
              <Textarea
                id="note"
                placeholder="Thông tin bổ sung về thay đổi này..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
