"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  MapPin,
  Camera,
  CheckCircle2,
  RefreshCw,
  Loader2,
  FileText,
  Copy,
  Search,
  SlidersHorizontal,
  X,
  Package,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getDeliveryQueue,
  uploadDeliveryProof,
  addShipmentNote,
  updateShipperLocation,
  type DeliveryQueueOrder,
} from "@/lib/shippingApi";
import { paymentProviderName } from "@/lib/paymentLabels";
import { formatPrice, getErrorMessage } from "@/lib/utils";

type PayState = "COD" | "PAID";

// Chuẩn hóa chuỗi tiếng Việt để tìm không dấu vẫn ra:
// "nguyen" khớp "Nguyễn", "tan binh" khớp "Tân Bình".
const normText = (s?: string | null) =>
  (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

// SĐT chỉ so chữ số để "0869 428 117" khớp "0869428117".
const normPhone = (s?: string | null) => (s || "").replace(/\D/g, "");

const STATUS_LABELS: Record<string, string> = {
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn thành",
  REFUNDED: "Đã hoàn tiền",
  PROCESSING: "Đang xử lý",
  CONFIRMED: "Đã xác nhận",
  PAID: "Đã thanh toán",
  PENDING: "Chờ xử lý",
};

// Trạng thái thu tiền của đơn: còn thu COD hay đã xong.
// Dùng chung cho badge hiển thị và bộ lọc để không bao giờ lệch nhau.
const getPayInfo = (order: DeliveryQueueOrder): { state: PayState; codAmount: number } => {
  if (order.status === "REFUNDED") return { state: "PAID", codAmount: 0 };
  const codAmount = (order.payments || []).reduce((sum: number, p: any) => {
    const provider = String(p.provider || "").toUpperCase();
    const status = String(p.status || "").toUpperCase();
    if (["COD", "OTHER"].includes(provider) && status !== "PAID") {
      return sum + Number(p.amount || 0);
    }
    return sum;
  }, 0);
  return codAmount > 0 ? { state: "COD", codAmount } : { state: "PAID", codAmount: 0 };
};

export default function ShipperPage() {
  const [orders, setOrders] = useState<DeliveryQueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Tìm kiếm nâng cao
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [payFilter, setPayFilter] = useState<"ALL" | PayState>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // POD Dialog State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [podOpen, setPodOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryQueueOrder | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [podNote, setPodNote] = useState("");
  const [podUploading, setPodUploading] = useState(false);

  // Note/Incident Dialog State
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [locationSavingId, setLocationSavingId] = useState<string | null>(null);
  // Mở rộng danh sách món của từng đơn (mặc định thu gọn)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryQueue();
      setOrders(data);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không thể tải danh sách đơn giao"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleOpenPod = (order: DeliveryQueueOrder) => {
    setSelectedOrder(order);
    setFiles([]);
    setPodNote("");
    setPodOpen(true);
  };

  const handleOpenNote = (order: DeliveryQueueOrder) => {
    setSelectedOrder(order);
    setNoteText("");
    setNoteOpen(true);
  };

  const handleUploadPod = async () => {
    if (!selectedOrder) return;
    if (files.length === 0) {
      toast.error("Vui lòng chọn hoặc chụp ít nhất 1 ảnh xác nhận giao hàng (POD)");
      return;
    }
    setPodUploading(true);
    try {
      await uploadDeliveryProof(selectedOrder.id, files, podNote.trim() || undefined);
      toast.success(`Đã hoàn tất giao đơn #${selectedOrder.code}`);
      setPodOpen(false);
      await loadQueue();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Lỗi khi lưu ảnh xác nhận giao hàng"));
    } finally {
      setPodUploading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedOrder) return;
    if (!noteText.trim()) {
      toast.error("Vui lòng nhập nội dung ghi chú / báo cáo sự cố");
      return;
    }
    setNoteSaving(true);
    try {
      await addShipmentNote(selectedOrder.id, noteText.trim());
      toast.success("Đã ghi chú lên vận đơn");
      setNoteOpen(false);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Lưu ghi chú thất bại"));
    } finally {
      setNoteSaving(false);
    }
  };

  const handleUpdateLocation = async (order: DeliveryQueueOrder) => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ GPS");
      return;
    }
    setLocationSavingId(order.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await updateShipperLocation(order.id, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          toast.success(`Đã cập nhật vị trí cho đơn #${order.code}`);
        } catch (err: any) {
          toast.error(getErrorMessage(err, "Cập nhật vị trí thất bại"));
        } finally {
          setLocationSavingId(null);
        }
      },
      (err) => {
        toast.error(err.message || "Không lấy được vị trí GPS");
        setLocationSavingId(null);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const copyText = (text: string, label = "Đã sao chép") => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(label),
      () => toast.error("Không thể sao chép")
    );
  };

  // Đếm số đơn theo từng trạng thái để vẽ chip lọc
  const statusOptions = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => counts.set(o.status, (counts.get(o.status) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const activeFilterCount =
    (statusFilter !== "ALL" ? 1 : 0) +
    (payFilter !== "ALL" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter("ALL");
    setPayFilter("ALL");
    setSortBy("newest");
  };

  const filteredOrders = useMemo(() => {
    const q = normText(search);
    const qDigits = normPhone(search);
    const list = orders.filter((o) => {
      // 1. Lọc trạng thái
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      // 2. Lọc thu tiền
      if (payFilter !== "ALL" && getPayInfo(o).state !== payFilter) return false;
      // 3. Lọc từ khóa
      if (!q) return true;
      const addr = (o.shippingAddress || {}) as {
        fullName?: string;
        phone?: string;
        address?: string;
        ward?: string;
        district?: string;
        province?: string;
      };
      const fullAddr = [addr.address, addr.ward, addr.district, addr.province]
        .filter(Boolean)
        .join(", ");
      return (
        normText(o.code).includes(q) ||
        normText(o.shippingOrderCode).includes(q) ||
        normText(addr.fullName).includes(q) ||
        (qDigits.length >= 3 && normPhone(addr.phone).includes(qDigits)) ||
        normText(fullAddr).includes(q) ||
        (q.length >= 2 &&
          (o.items || []).some((it) => normText(it.productName).includes(q)))
      );
    });
    // 4. Sắp xếp
    return [...list].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return sortBy === "oldest" ? ta - tb : tb - ta;
    });
  }, [orders, search, statusFilter, payFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Danh sách vận đơn ({filteredOrders.length}/{orders.length})
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            Hiển thị vận đơn đang giao và lịch sử vận chuyển, kể cả đơn đã hoàn tiền sau khi giao.
          </p>
        </div>

        <Button
          onClick={loadQueue}
          disabled={loading}
          variant="outline"
          className="w-full sm:w-auto gap-2 border-zinc-300"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Tải lại danh sách
        </Button>
      </div>

      {/* Search Input + nút lọc nâng cao */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo Mã đơn, Mã GHN, Tên khách, SĐT..."
            className="pl-10 h-11 rounded-xl bg-white border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters((v) => !v)}
          className="relative h-11 shrink-0 gap-2 rounded-xl border-zinc-200 bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-800"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Lọc</span>
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ff4d00] px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Panel tìm kiếm nâng cao */}
      {showFilters && (
        <Card className="space-y-4 rounded-2xl border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Trạng thái
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                Tất cả ({orders.length})
              </button>
              {statusOptions.map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(statusFilter === status ? "ALL" : status)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    statusFilter === status
                      ? "bg-[#ff4d00] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {STATUS_LABELS[status] || status} ({count})
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Thu tiền
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "ALL", label: "Tất cả" },
                  { value: "COD", label: "Cần thu COD" },
                  { value: "PAID", label: "Đã thanh toán" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPayFilter(opt.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    payFilter === opt.value
                      ? "bg-[#ff4d00] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Sắp xếp:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy("newest")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    sortBy === "newest"
                      ? "bg-[#ff4d00] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Mới nhất
                </button>
                <button
                  onClick={() => setSortBy("oldest")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    sortBy === "oldest"
                      ? "bg-[#ff4d00] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  Cũ nhất
                </button>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white rounded-2xl border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff4d00]" />
          <p className="text-sm font-medium text-zinc-500">Đang tải danh sách đơn hàng chờ giao...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 dark:bg-zinc-900 dark:border-zinc-800">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {search ? "Không tìm thấy đơn hàng phù hợp" : "Không có vận đơn nào"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 leading-relaxed">
            {search ? "Thử thay đổi từ khóa tìm kiếm." : "Chưa có đơn nào được chuyển sang giao hàng hoặc tạo vận đơn GHN."}
          </p>
        </div>
      ) : (
        /* Order Cards List */
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const addr = order.shippingAddress || {};
            const payment = order.payments?.[0];
            const { state: payState, codAmount } = getPayInfo(order);
            // Backend cho chụp POD cả khi SHIPPING lẫn DELIVERED (chụp bổ sung)
            const canConfirmDelivery = ["SHIPPING", "DELIVERED"].includes(order.status);
            const statusLabel = order.status === "REFUNDED" ? "Đã hoàn tiền" : order.status === "DELIVERED" ? "Đã giao" : order.status === "COMPLETED" ? "Hoàn thành" : order.status === "SHIPPING" ? "Đang giao" : order.status;

            return (
              <Card
                key={order.id}
                className="overflow-hidden border-zinc-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-[#ff4d00]">#{order.code}</span>
                    <Badge variant={order.status === "REFUNDED" ? "success" : order.status === "SHIPPING" ? "info" : "secondary"} className="text-[10px]">
                      {statusLabel}
                    </Badge>
                    {order.shippingOrderCode && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        GHN: {order.shippingOrderCode}
                        <button
                          onClick={() => copyText(order.shippingOrderCode as string)}
                          className="hover:text-zinc-900"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === "REFUNDED" ? (
                      <Badge variant="success" className="font-bold text-xs px-2.5 py-1">
                        ĐÃ HOÀN TIỀN
                      </Badge>
                    ) : payState === "COD" ? (
                      <Badge variant="destructive" className="font-bold text-xs px-2.5 py-1">
                        CẦN THU COD: {formatPrice(codAmount)}
                      </Badge>
                    ) : (
                      <Badge variant="success" className="font-bold text-xs px-2.5 py-1">
                        ĐÃ THANH TOÁN (0₫)
                      </Badge>
                    )}
                  </div>
                </div>

                {order.assignedShipper && (
                  <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/60 p-3 text-xs">
                    <img
                      src={order.assignedShipper.avatarUrl || "/images/placeholder-product.svg"}
                      alt={order.assignedShipper.name || "Shipper"}
                      className="h-11 w-11 rounded-full object-cover border border-orange-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-zinc-900">{order.assignedShipper.name || "Shipper MegaMart"}</p>
                      <p className="text-zinc-600">SĐT: {order.assignedShipper.phone || "—"} · Biển số: {order.assignedShipper.vehiclePlate || "—"}</p>
                    </div>
                  </div>
                )}

                {/* Customer & Address Details */}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="space-y-1.5">
                    <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Người nhận hàng</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {addr.fullName || "Khách mua hàng"}
                    </p>
                    {addr.phone && (
                      <a
                        href={`tel:${addr.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg w-fit"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {addr.phone}
                      </a>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Địa chỉ giao hàng</p>
                    <p className="text-xs font-medium leading-relaxed text-zinc-800 dark:text-zinc-200">
                      <MapPin className="h-3.5 w-3.5 inline mr-1 text-[#ff4d00]" />
                      {addr.address || "Chưa có địa chỉ chi tiết"}
                      {addr.ward ? `, ${addr.ward}` : ""}
                      {addr.district ? `, ${addr.district}` : ""}
                      {addr.province ? `, ${addr.province}` : ""}
                    </p>
                  </div>
                </div>

                {/* Note from customer */}
                {addr.note && (
                  <div className="rounded-xl bg-orange-50/70 dark:bg-orange-950/30 p-2.5 text-xs text-orange-900 dark:text-orange-200 border border-orange-200/50 dark:border-orange-800/40 italic">
                    &ldquo;{addr.note}&rdquo;
                  </div>
                )}

                {/* Món cần giao */}
                {order.items && order.items.length > 0 && (() => {
                  const expanded = expandedIds.has(order.id);
                  const visibleItems = expanded ? order.items : order.items.slice(0, 2);
                  const hiddenCount = order.items.length - visibleItems.length;
                  return (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 p-2.5 space-y-2">
                      <p className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        Món cần giao ({order.items.length})
                      </p>
                      {visibleItems.map((it) => (
                        <div key={it.id} className="flex items-center gap-2.5">
                          {it.imageUrl ? (
                            <img
                              src={it.imageUrl}
                              alt={it.productName}
                              className="h-10 w-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                            />
                          ) : (
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-zinc-200 dark:bg-zinc-700 shrink-0">
                              <Package className="h-5 w-5 text-zinc-500" />
                            </span>
                          )}
                          <p className="min-w-0 flex-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                            {it.productName}
                          </p>
                          <span className="shrink-0 rounded-md bg-zinc-900 dark:bg-zinc-100 px-2 py-0.5 text-[11px] font-black text-white dark:text-zinc-900">
                            x{it.quantity}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <button
                          onClick={() => toggleExpanded(order.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${expanded ? "text-zinc-500" : "text-[#ff4d00]"}`}
                        >
                          {expanded ? "Thu gọn" : `+${hiddenCount} món khác`}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Ảnh xác nhận giao hàng (POD) đã chụp */}
                {order.proofs && order.proofs.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 space-y-2 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Ảnh xác nhận giao hàng
                      {order.proofs[0]?.createdAt && (
                        <span className="font-medium normal-case tracking-normal text-emerald-600 dark:text-emerald-400">
                          · {new Date(order.proofs[0].createdAt).toLocaleString("vi-VN")}
                        </span>
                      )}
                    </p>
                    {order.proofs.map((pf) => (
                      <div key={pf.id} className="space-y-1.5">
                        {pf.note && (
                          <p className="text-xs italic text-zinc-600 dark:text-zinc-300">
                            &ldquo;{pf.note}&rdquo;
                          </p>
                        )}
                        {(pf.photoUrls || []).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(pf.photoUrls || []).map((url, idx) => (
                              <button
                                key={`${pf.id}-${idx}-${url}`}
                                type="button"
                                onClick={() => setPreviewImage(url)}
                                className="overflow-hidden rounded-lg border border-emerald-200 transition hover:opacity-85 dark:border-emerald-800"
                                title="Bấm để xem ảnh lớn"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt="Ảnh xác nhận giao hàng"
                                  className="h-16 w-16 object-cover"
                                  onError={(e) => {
                                    e.currentTarget.closest("button")?.setAttribute("style", "display:none");
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Summary & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 flex items-center gap-3">
                    <span>Thanh toán: <strong className="text-zinc-800 dark:text-zinc-200">{paymentProviderName(payment?.provider)}</strong></span>
                    <span>•</span>
                    <span>Số lượng: <strong className="text-zinc-800 dark:text-zinc-200">{order._count?.items || 1} SP</strong></span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateLocation(order)}
                      disabled={locationSavingId === order.id}
                      className="flex-1 sm:flex-none gap-1.5 text-xs font-semibold border-zinc-300 dark:border-zinc-700"
                    >
                      {locationSavingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                      Cập nhật GPS
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenNote(order)}
                      className="flex-1 sm:flex-none gap-1.5 text-xs font-semibold border-zinc-300 dark:border-zinc-700"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ghi chú / Hẹn lại
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenPod(order)}
                      disabled={!canConfirmDelivery}
                      className="flex-1 sm:flex-none gap-1.5 bg-[#ff4d00] hover:bg-[#d94100] text-white text-xs font-bold shadow-md disabled:opacity-60"
                    >
                      <Camera className="h-4 w-4" />
                      {order.status === "SHIPPING"
                        ? "Chụp ảnh & Xác nhận giao"
                        : canConfirmDelivery
                          ? "Thêm ảnh POD"
                          : "Không cần xác nhận giao"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* POD Upload Dialog */}
      <Dialog open={podOpen} onOpenChange={setPodOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#ff4d00]" />
              Xác nhận đã giao hàng (POD)
            </DialogTitle>
            <DialogDescription>
              Đơn #{selectedOrder?.code} · {selectedOrder?.shippingAddress?.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="font-bold">Chụp/Tải lên ảnh xác nhận giao hàng *</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                className="cursor-pointer"
              />
              <p className="text-[11px] text-zinc-500">
                Tối đa 5 ảnh. Trên điện thoại có thể chụp ảnh trực tiếp từ camera.
              </p>
              {files.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-bold dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  ✓ Đã chọn {files.length} ảnh
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pod-note">Ghi chú giao hàng (tùy chọn)</Label>
              <Input
                id="pod-note"
                value={podNote}
                onChange={(e) => setPodNote(e.target.value)}
                placeholder="VD: Giao cho bảo vệ / Người nhà nhận thay..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPodOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleUploadPod}
              disabled={podUploading || files.length === 0}
              className="bg-[#ff4d00] hover:bg-[#d94100] text-white font-bold"
            >
              {podUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận giao thành công
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incident / Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ghi chú vận hành / Báo sự cố</DialogTitle>
            <DialogDescription>
              Đơn #{selectedOrder?.code} · Lưu nhật ký xử lý lên hành trình đơn hàng.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="shipper-note">Nội dung ghi chú *</Label>
              <Input
                id="shipper-note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="VD: Khách không nghe máy, hẹn lại 5h chiều..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveNote} disabled={noteSaving}>
              {noteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu ghi chú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox xem ảnh POD lớn */}
      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Ảnh xác nhận giao hàng</DialogTitle>
            <DialogDescription>
              Bấm ra ngoài hoặc nút đóng để quay lại danh sách đơn.
            </DialogDescription>
          </DialogHeader>
          {previewImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewImage}
              alt="Ảnh xác nhận giao hàng"
              className="max-h-[75vh] w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-800"
              onError={(e) => {
                e.currentTarget.setAttribute("style", "display:none");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
