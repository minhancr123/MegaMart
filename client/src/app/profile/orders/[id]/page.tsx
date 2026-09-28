"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchOrderById, cancelOrder, confirmReceipt } from "@/lib/orderApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Loader2,
  Package,
  MapPin,
  CreditCard,
  ArrowLeft,
  Clock,
  XCircle,
  HelpCircle,
  CheckCircle2,
  Truck,
  RotateCcw,
  RefreshCw,
  ShoppingBag,
  Star,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { visibleAttributes, formatAttributeValue } from "@/lib/productAttributes";
import { paymentProviderName, refundMethodName, refundStatusName, refundChannelName } from "@/lib/paymentLabels";
import {
  requestRefund,
  listRefundRequests,
  type RefundRequestItem,
} from "@/lib/shippingApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderTrackingStepper } from "@/components/cart/OrderTrackingStepper";
import { ShippingCarrierCard } from "@/components/cart/ShippingCarrierCard";
import { ShipperLocationMap } from "@/components/admin/ShipperLocationMap";
import VietQrPayCard from "@/components/payment/VietQrPayCard";

const statusConfig: Record<
  string,
  {
    label: string;
    tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
    icon: any;
  }
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Refund & Completion States
  const [refunds, setRefunds] = useState<RefundRequestItem[]>([]);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("WALLET");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (order?.id) {
      listRefundRequests(order.id)
        .then(setRefunds)
        .catch(() => setRefunds([]));
    }
  }, [order?.id]);

  const handleConfirmReceived = async () => {
    if (!confirm("Xác nhận bạn đã nhận đủ hàng và hài lòng với đơn hàng?")) return;
    setCompleting(true);
    try {
      await confirmReceipt(order.id);
      toast.success("Cảm ơn bạn! Đơn hàng đã hoàn tất.");
      loadOrder(order.id);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Lỗi khi xác nhận nhận hàng"));
    } finally {
      setCompleting(false);
    }
  };

  const handleCreateRefund = async () => {
    if (!refundReason.trim()) {
      toast.error("Vui lòng nhập lý do hoàn tiền");
      return;
    }
    setRefundSubmitting(true);
    try {
      await requestRefund(order.id, {
        reason: refundReason.trim(),
        method: refundMethod,
      });
      toast.success("Đã gửi yêu cầu hoàn tiền. CSKH MegaMart sẽ liên hệ xử lý.");
      setRefundOpen(false);
      setRefundReason("");
      const updated = await listRefundRequests(order.id);
      setRefunds(updated);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không thể gửi yêu cầu hoàn tiền"));
    } finally {
      setRefundSubmitting(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadOrder(params.id as string);
    }
  }, [params.id]);

  // Tự động kiểm tra trạng thái thanh toán mỗi 5s khi đơn BANK_TRANSFER chưa trả,
  // khỏi cần F5. Dừng khi đơn đổi trạng thái hoặc sau ~30 phút.
  useEffect(() => {
    if (!order?.id) return;
    const provider = order.payments?.[0]?.provider;
    const stillUnpaid =
      provider === "BANK_TRANSFER" &&
      !["PAID", "COMPLETED", "DELIVERED", "CANCELED", "FAILED", "REFUNDED"].includes(order.status);
    if (!stillUnpaid) return;

    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      if (attempts > 360) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetchOrderById(order.id);
        const fresh = (res as any)?.id ? res : (res as any)?.data || res;
        if (fresh?.status && fresh.status !== order.status) {
          setOrder(fresh);
          if (["PAID", "COMPLETED", "DELIVERED"].includes(fresh.status)) {
            toast.success("Thanh toán thành công! Cảm ơn bạn đã mua hàng.", {
              duration: 6000,
            });
          }
        }
      } catch {
        // Lỗi mạng thoáng qua thì bỏ qua, lần poll sau thử tiếp
      }
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await fetchOrderById(orderId);
      if ((res as any)?.id) {
        setOrder(res);
      } else if ((res as any)?.data) {
        setOrder((res as any).data);
      } else {
        setOrder(res);
      }
    } catch (err: any) {
      console.error("Load order error:", err);
      toast.error("Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    try {
      setCancelling(true);
      await cancelOrder(order.id);
      toast.success("Đã hủy đơn hàng thành công");
      router.push("/profile/orders");
    } catch (err: any) {
      console.error("Cancel order error:", err);
      toast.error(getErrorMessage(err, "Không thể hủy đơn hàng"));
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <Card className="p-8 text-center border-border bg-card">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Không tìm thấy đơn hàng</h2>
          <p className="text-sm text-muted-foreground mb-6">Đơn hàng không tồn tại hoặc đã bị xóa.</p>
          <Link href="/profile/orders">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status] || {
    label: order.status,
    tone: "secondary" as const,
    icon: Clock,
  };
  const StatusIcon = status.icon;

  const orderDate = new Date(order.createdAt);
  const formattedOrderTime = !isNaN(orderDate.getTime())
    ? `Đặt lúc ${orderDate.getHours().toString().padStart(2, "0")}:${orderDate.getMinutes().toString().padStart(2, "0")}, ${orderDate.toLocaleDateString("vi-VN")}`
    : "Vừa đặt gần đây";

  const items = order.items || [];
  const totalItemsCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + Number(item.price || 0) * (item.quantity || 1),
    0
  );
  // Shop đang freeship toàn bộ (server lưu shippingFee = 0) nên fallback cũng là 0
  const shippingFee = Number(order.shippingFee || 0);
  const discountAmount = Number(order.discountAmount || 0);
  const vatAmount = Number(order.vatAmount || 0);
  const walletPaid = Number(
    order.payments?.find((p: any) => p.provider === "WALLET")?.amount || 0,
  );
  const finalTotal = Number(order.total || subtotal + shippingFee - discountAmount);

  // Thông tin giao hàng
  const address = (() => {
    if (!order.shippingAddress) return {} as any;
    if (typeof order.shippingAddress === "string") {
      try {
        return JSON.parse(order.shippingAddress);
      } catch {
        return { address: order.shippingAddress };
      }
    }
    return order.shippingAddress;
  })();
  const shippingDestinationAddress = [
    address.address,
    address.ward,
    address.district,
    address.province,
  ].filter(Boolean).join(", ");
  const payment = order.payments?.find((p: any) => p.provider !== "WALLET") || order.payments?.[0];
  const assignedShipper = order.assignedShipper;
  const latestRefund = refunds?.[0];
  const hasRefund = refunds.length > 0 || order.status === "REFUNDED";
  const refundSummary = order.status === "REFUNDED"
    ? { label: "Đã hoàn tiền", tone: "success" as const, description: latestRefund ? `Đã hoàn ${formatPrice(Number(latestRefund.amount || 0))} qua ${refundChannelName((latestRefund as any).channel)}.` : "Đơn hàng đã hoàn tiền thành công." }
    : latestRefund?.status === "COMPLETED"
    ? { label: "Đã hoàn tiền", tone: "success" as const, description: `Đã hoàn ${formatPrice(Number(latestRefund.amount || 0))} qua ${refundChannelName((latestRefund as any).channel)}.` }
    : latestRefund?.status === "APPROVED"
    ? { label: "Đã duyệt hoàn tiền", tone: "info" as const, description: `Yêu cầu hoàn ${formatPrice(Number(latestRefund.amount || 0))} đã được duyệt, đang chờ xử lý hoàn tất.` }
    : latestRefund?.status === "PENDING"
    ? { label: "Chờ duyệt hoàn tiền", tone: "warning" as const, description: `Yêu cầu hoàn ${formatPrice(Number(latestRefund.amount || 0))} đang chờ MegaMart xét duyệt.` }
    : latestRefund?.status === "REJECTED"
    ? { label: "Đã từ chối hoàn tiền", tone: "destructive" as const, description: latestRefund.reviewedNote || "Yêu cầu hoàn tiền đã bị từ chối." }
    : null;

  const PAYMENT_PROVIDER_NAMES: Record<string, string> = {
    COD: paymentProviderName("COD"),
    OTHER: paymentProviderName("OTHER"),
    BANK_TRANSFER: paymentProviderName("BANK_TRANSFER"),
    VNPAY: paymentProviderName("VNPAY"),
    MOMO: paymentProviderName("MOMO"),
    STRIPE: paymentProviderName("STRIPE"),
    WALLET: paymentProviderName("WALLET"),
  };

  // DB lưu trạng thái đã trả là "PAID" (không phải "SUCCESS")
  const isPaid =
    ["PAID", "COMPLETED", "DELIVERED", "REFUNDED"].includes(order.status) ||
    payment?.status === "PAID" ||
    payment?.status === "SUCCESS" ||
    payment?.status === "REFUNDED";
  // COD thu tiền khi giao hàng nên đơn COD vẫn được chuẩn bị/giao dù chưa trả.
  // Đơn online trả trước mà chưa trả thì shop chưa nhận tiền -> chưa có gì để vận chuyển.
  const isCod = payment?.provider === "COD" || payment?.provider === "OTHER";
  const canShowShipping =
    !["CANCELED", "FAILED"].includes(order.status) && (isCod || isPaid);
  const paymentBadge = payment?.status === "REFUNDED" || order.status === "REFUNDED"
    ? { label: "Đã hoàn tiền", variant: "success" as const }
    : isPaid
    ? { label: "Đã thanh toán", variant: "success" as const }
    : { label: "Chưa thanh toán", variant: "warning" as const };

  // Hiện QR chuyển khoản khi đơn trả bằng BANK_TRANSFER mà chưa thanh toán xong
  const showVietQr =
    payment?.provider === "BANK_TRANSFER" &&
    Boolean(order.code) &&
    !isPaid &&
    !["CANCELED", "FAILED", "REFUNDED"].includes(order.status);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header & Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/profile" className="hover:text-primary transition-colors">
              Tài khoản
            </Link>
            <span>›</span>
            <Link href="/profile/orders" className="hover:text-primary transition-colors">
              Đơn hàng
            </Link>
            <span>›</span>
            <span className="text-foreground font-medium">
              #{order.code || order.id.slice(-8)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Chi tiết đơn hàng #{order.code || order.id.slice(-8)}
            </h1>
            <Badge
              variant={status.tone}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg"
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{status.label}</span>
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground">{formattedOrderTime}</p>
        </div>

        {/* Nút Cần hỗ trợ góc trên bên phải */}
        <div className="self-start sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Đội ngũ CSKH MegaMart hỗ trợ qua Hotline: 1900 1234")}
            className="rounded-xl h-9 px-3.5 text-xs font-semibold border-border gap-1.5 hover:bg-muted"
          >
            <HelpCircle className="w-4 h-4 text-primary" />
            <span>Cần hỗ trợ</span>
          </Button>
        </div>
      </div>

      {/* 2. Thanh Tiến Trình Đơn Hàng 5 Bước (OrderTrackingStepper) */}
      <OrderTrackingStepper status={order.status} createdAt={order.createdAt} />

      {refundSummary && (
        <Card className={`rounded-2xl border p-4 shadow-sm ${refundSummary.tone === "success" ? "border-emerald-200 bg-emerald-50" : refundSummary.tone === "warning" ? "border-amber-200 bg-amber-50" : refundSummary.tone === "destructive" ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${refundSummary.tone === "success" ? "bg-emerald-600 text-white" : refundSummary.tone === "warning" ? "bg-amber-500 text-white" : refundSummary.tone === "destructive" ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}>
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-extrabold text-foreground">{refundSummary.label}</p>
                {latestRefund?.status && <Badge variant={refundSummary.tone}>{refundStatusName(latestRefund.status)}</Badge>}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{refundSummary.description}</p>
              {(latestRefund as any)?.failureReason && (
                <p className="mt-2 rounded-lg border border-amber-300 bg-white/70 px-3 py-2 text-[11px] text-amber-800">{(latestRefund as any).failureReason}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 3. Khối Đơn vị vận chuyển (tra cứu thật trên GHN theo mã đơn) */}
      {canShowShipping && (
        <ShippingCarrierCard
          orderId={order.id}
          orderCode={order.code || order.id}
          carrierName="GHN Express"
          canShowInvoice={isPaid}
        />
      )}

      {canShowShipping && assignedShipper && (
        <Card className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-orange-200 bg-orange-50">
                <Image
                  src={assignedShipper.avatarUrl || "/images/placeholder-product.svg"}
                  alt={assignedShipper.name || "Shipper MegaMart"}
                  fill
                  sizes="56px"
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff4d00]">Nhân viên giao hàng MegaMart</p>
                <p className="text-base font-extrabold text-foreground">{assignedShipper.name || "Shipper MegaMart"}</p>
                <p className="text-xs text-muted-foreground">Biển số xe: <span className="font-semibold text-foreground">{assignedShipper.vehiclePlate || "Đang cập nhật"}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {assignedShipper.phone && (
                <a href={`tel:${assignedShipper.phone}`}>
                  <Button size="sm" className="gap-1.5 rounded-xl bg-[#ff4d00] hover:bg-[#d94100]">
                    <Phone className="h-4 w-4" /> Gọi shipper
                  </Button>
                </a>
              )}
              <Badge variant="info" className="h-9 rounded-xl px-3">Đã phân công</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Bố Cục 2 Cột Chuẩn Stitch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* CỘT TRÁI (8/12 phần): Sản phẩm + Địa chỉ + Thanh toán */}
        <div className="lg:col-span-8 space-y-6">
          {/* Khối Danh Sách Sản Phẩm */}
          <Card className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden gap-0 py-0">
            <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span>Sản phẩm ({totalItemsCount})</span>
              </h2>
            </div>

            <div className="divide-y divide-border p-4 sm:p-5">
              {items.map((item: any) => {
                const product = item.variant?.product;
                const primaryImage =
                  product?.images?.find((img: any) => img.isPrimary)?.url ||
                  product?.images?.[0]?.url ||
                  "/images/placeholder-product.svg";

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    {/* Ảnh & Tên & SKU */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <Link
                        href={product?.id ? `/product/${product.id}` : "#"}
                        className="relative w-20 h-20 shrink-0 bg-muted/40 rounded-xl overflow-hidden border border-border group"
                      >
                        <Image
                          src={primaryImage}
                          alt={product?.name || "Product"}
                          fill
                          sizes="80px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={product?.id ? `/product/${product.id}` : "#"}
                          className="font-semibold text-foreground text-sm sm:text-base hover:text-primary transition-colors line-clamp-2"
                        >
                          {product?.name || "Sản phẩm điện máy"}
                        </Link>

                        <p className="text-xs text-muted-foreground mt-1">
                          SKU: <span className="text-foreground">{item.variant?.sku || "N/A"}</span>
                          {item.variant?.attributes &&
                            visibleAttributes(item.variant.attributes).length > 0 && (
                              <span>
                                {" "}
                                | Phân loại:{" "}
                                {visibleAttributes(item.variant.attributes)
                                  .map(([k, v]) => formatAttributeValue(v))
                                  .join(", ")}
                              </span>
                            )}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-sm font-semibold">
                          <span className="text-primary">{formatPrice(Number(item.price))}</span>
                          <span className="text-muted-foreground font-normal text-xs">x {item.quantity}</span>
                        </div>
                        {(order.serials || []).filter((s: any) => s.variantId === item.variantId).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <span className="text-[11px] text-muted-foreground">Serial BH:</span>
                            {(order.serials || [])
                              .filter((s: any) => s.variantId === item.variantId)
                              .map((s: any) => (
                                <span
                                  key={s.id}
                                  className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border"
                                >
                                  {s.serial}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cặp nút Đánh giá & Mua lại chuẩn Stitch */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {["COMPLETED", "DELIVERED"].includes(order.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (product?.id) {
                              router.push(`/product/${product.id}#reviews`);
                            } else {
                              toast.info("Chuyển đến mục đánh giá sản phẩm");
                            }
                          }}
                          className="rounded-xl h-8 px-3 text-xs font-semibold border-border gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span>Đánh giá</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => {
                          if (product?.id) {
                            router.push(`/product/${product.id}`);
                          } else {
                            router.push("/products");
                          }
                        }}
                        className="rounded-xl h-8 px-3 text-xs font-bold gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Mua lại</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Khối Địa Chỉ Nhận Hàng & Khối Hình Thức Thanh Toán (Đặt ngang hàng hoặc xếp dọc) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Địa chỉ nhận hàng */}
            <Card className="border border-border bg-card rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border pb-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Địa chỉ nhận hàng</span>
              </div>

              <div className="space-y-1 text-xs sm:text-sm">
                <p className="font-bold text-foreground">{address.fullName || order.user?.name || "Khách hàng"}</p>
                <p className="text-muted-foreground">{address.phone || "0901234567"}</p>
                <p className="text-muted-foreground leading-relaxed pt-1">
                  {[address.address, address.ward, address.district, address.province]
                    .filter(Boolean)
                    .join(", ") || "Địa chỉ mặc định khách hàng cung cấp"}
                </p>
              </div>
            </Card>

            {/* Hình thức thanh toán */}
            <Card className="border border-border bg-card rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border pb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Hình thức thanh toán</span>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {PAYMENT_PROVIDER_NAMES[payment?.provider || ""] || payment?.provider || "VNPAY"}
                  </span>
                  <Badge
                    variant={paymentBadge.variant}
                    className="text-[11px] px-2 py-0.5 rounded-md"
                  >
                    {paymentBadge.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentBadge.label === "Đã hoàn tiền"
                    ? "Giao dịch đã được hoàn tiền theo yêu cầu xử lý của MegaMart."
                    : "Giao dịch bảo mật qua cổng thanh toán được chứng nhận."}
                </p>
                {latestRefund && (
                  <p className="text-[11px] text-muted-foreground">
                    Hoàn tiền: <span className="font-semibold text-foreground">{refundStatusName(latestRefund.status)}</span>
                    {(latestRefund as any).channel ? ` · ${refundChannelName((latestRefund as any).channel)}` : ""}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* QR chuyển khoản SePay/VietQR - chỉ hiện khi đơn BANK_TRANSFER chưa thanh toán */}
          {showVietQr && (
            <VietQrPayCard orderCode={order.code} amount={Math.max(0, finalTotal - walletPaid)} createdAt={order.createdAt} />
          )}
        </div>

        {/* CỘT PHẢI (4/12 phần): Tổng Quan Đơn Hàng (Sidebar) */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          {/* Thông tin Shipper nếu đã phân công (ẩn khi đơn hủy/fail hoặc online chưa trả) */}
          {canShowShipping && order.assignedShipper && (
            <Card className="border border-border bg-card rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border pb-3">
                <Truck className="w-4 h-4 text-primary" />
                <span>Shipper phụ trách</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                  <Image
                    src={order.assignedShipper.avatarUrl || "/images/placeholder-product.svg"}
                    alt="Shipper"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">{order.assignedShipper.name || "Shipper MegaMart"}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Phone className="w-3 h-3" />
                    <a href={`tel:${order.assignedShipper.phone || order.assignedShipper.shipperProfile?.phone}`} className="hover:text-primary transition-colors font-medium">
                      {order.assignedShipper.phone || order.assignedShipper.shipperProfile?.phone || "Đang cập nhật"}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-xs">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Phương tiện:</span> {order.assignedShipper.shipperProfile?.vehicleType || "Xe máy"}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Biển số:</span> {order.assignedShipper.vehiclePlate || order.assignedShipper.shipperProfile?.vehiclePlate || "Đang cập nhật"}
                </p>
              </div>

              {order.shippingMetadata?.currentLocation && (
                <div className="pt-2">
                  <ShipperLocationMap
                    lat={order.shippingMetadata.currentLocation.lat}
                    lng={order.shippingMetadata.currentLocation.lng}
                    destLat={address.lat}
                    destLng={address.lng}
                    destinationAddress={shippingDestinationAddress}
                    updatedAt={order.shippingMetadata.currentLocation.updatedAt}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9 mt-3 rounded-xl text-xs font-bold border-primary/20 text-primary hover:bg-primary/5 gap-1.5"
                    onClick={() => {
                      const { lat, lng } = order.shippingMetadata.currentLocation;
                      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
                    }}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Mở Google Maps (Tab mới)
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Card className="border border-border bg-card rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-foreground">Tổng quan đơn hàng</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Tạm tính ({totalItemsCount} sản phẩm)</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-muted-foreground">
                <span>Phí vận chuyển</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="font-semibold text-[var(--success)]">Miễn phí</span>
                  ) : (
                    <span className="font-medium text-foreground">{formatPrice(shippingFee)}</span>
                  )}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-[var(--success)] font-medium">
                  <span>Giảm giá</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              {vatAmount > 0 && (
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Thuế VAT</span>
                  <span className="font-medium text-foreground">{formatPrice(vatAmount)}</span>
                </div>
              )}

              {walletPaid > 0 && (
                <div className="flex justify-between items-center text-[var(--success)] font-medium">
                  <span>Đã trừ ví MegaMart</span>
                  <span>-{formatPrice(walletPaid)}</span>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-bold text-base text-foreground block">Tổng tiền</span>
                    <span className="text-xs text-muted-foreground">(Đã bao gồm VAT)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary tracking-tight block">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Nút Hủy đơn nếu còn ở trạng thái Chờ xử lý / Đã thanh toán */}
            {["PENDING", "CONFIRMED", "PAID"].includes(order.status) && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={cancelling}
                  className="w-full h-11 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Hủy đơn hàng này
                </Button>
              </div>
            )}

            {/* Khách xác nhận đã nhận hàng khi đơn DELIVERED */}
            {order.status === "DELIVERED" && (
              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleConfirmReceived}
                  disabled={completing}
                  className="w-full h-11 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  {completing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Đã nhận được hàng
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRefundOpen(true)}
                  className="w-full h-10 rounded-xl text-xs font-semibold border-border hover:bg-muted"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Yêu cầu hoàn tiền / Trả hàng
                </Button>
              </div>
            )}

            {/* Yêu cầu hoàn tiền khi COMPLETED hoặc FAILED */}
            {["COMPLETED", "FAILED"].includes(order.status) && isPaid && refunds.length === 0 && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRefundOpen(true)}
                  className="w-full h-10 rounded-xl text-xs font-semibold border-border hover:bg-muted"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  Yêu cầu hoàn tiền
                </Button>
              </div>
            )}

            {/* Trạng thái yêu cầu hoàn tiền nếu đã tạo */}
            {refunds.length > 0 && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <RotateCcw className="w-3.5 h-3.5 text-primary" />
                  <span>Yêu cầu hoàn tiền ({refunds.length})</span>
                </div>
                {refunds.map((r) => (
                  <div key={r.id} className="rounded-xl bg-muted/40 p-3 text-xs space-y-1 border border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(r.amount))} · {refundMethodName(r.method)}{(r as any).channel ? ` · ${refundChannelName((r as any).channel)}` : ""}
                      </span>
                      <Badge variant={r.status === "COMPLETED" ? "success" : r.status === "REJECTED" ? "destructive" : "warning"}>
                        {refundStatusName(r.status)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{r.reason}</p>
                    {(r as any).failureReason && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">{(r as any).failureReason}</p>
                    )}
                    {r.reviewedNote && (
                      <p className="text-[10px] text-muted-foreground italic pt-0.5">Phản hồi: {r.reviewedNote}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Confirm Dialog Hủy Đơn */}
      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={handleCancelOrder}
        title="Xác nhận hủy đơn hàng"
        description="Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác."
        confirmText="Hủy đơn hàng"
        cancelText="Giữ lại đơn"
        variant="destructive"
        isLoading={cancelling}
      />

      {/* Dialog Yêu Cầu Hoàn Tiền của Khách */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              Yêu cầu hoàn tiền đơn #{order?.code}
            </DialogTitle>
            <DialogDescription>
              MegaMart sẽ xem xét yêu cầu và liên hệ hoàn tiền theo phương thức phù hợp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Lý do hoàn tiền / Trả hàng *</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="VD: Hàng bị vỡ trong lúc vận chuyển / Sản phẩm không đúng mô tả..."
                className="w-full h-24 rounded-xl border border-input bg-transparent p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-foreground">Phương thức nhận hoàn tiền</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-transparent px-3 text-xs"
              >
                <option value="WALLET">Hoàn vào Ví MegaMart (nhận ngay)</option>
                <option value="MANUAL">Thỏa thuận với CSKH</option>
                <option value="BANK_TRANSFER">Chuyển khoản qua số tài khoản</option>
                <option value="ORIGINAL_GATEWAY">Hoàn về ví / thẻ ban đầu (VNPay/MoMo)</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateRefund} disabled={refundSubmitting} className="font-bold">
              {refundSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
