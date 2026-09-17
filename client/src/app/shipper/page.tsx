"use client";

import { useEffect, useState } from "react";
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
  type DeliveryQueueOrder,
} from "@/lib/shippingApi";
import { paymentProviderName } from "@/lib/paymentLabels";

const formatPrice = (n: number | string | null | undefined) => {
  const num = Number(n || 0);
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
};

export default function ShipperPage() {
  const [orders, setOrders] = useState<DeliveryQueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // POD Dialog State
  const [podOpen, setPodOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryQueueOrder | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [podNote, setPodNote] = useState("");
  const [podUploading, setPodUploading] = useState(false);

  // Note/Incident Dialog State
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryQueue();
      setOrders(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Không thể tải danh sách đơn giao");
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
      toast.error(err?.response?.data?.message || err?.message || "Lỗi khi lưu ảnh xác nhận giao hàng");
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
      toast.error(err?.response?.data?.message || err?.message || "Lưu ghi chú thất bại");
    } finally {
      setNoteSaving(false);
    }
  };

  const copyText = (text: string, label = "Đã sao chép") => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(label),
      () => toast.error("Không thể sao chép")
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const addr = o.shippingAddress || {};
    return (
      o.code.toLowerCase().includes(q) ||
      (o.shippingOrderCode || "").toLowerCase().includes(q) ||
      (addr.fullName || "").toLowerCase().includes(q) ||
      (addr.phone || "").includes(q) ||
      (addr.address || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
            Danh sách vận đơn ({orders.length})
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo Mã đơn, Mã GHN, Tên khách, SĐT..."
          className="pl-10 h-11 rounded-xl bg-white border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800"
        />
      </div>

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
            const isPaid = payment?.status === "PAID" || payment?.status === "REFUNDED" || ["PAID", "DELIVERED", "COMPLETED", "REFUNDED"].includes(order.status);
            const codAmount = isPaid ? 0 : Number(order.total);
            const canConfirmDelivery = order.status === "SHIPPING";
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
                    ) : codAmount > 0 ? (
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
                      {canConfirmDelivery ? "Chụp ảnh & Xác nhận giao" : "Không cần xác nhận giao"}
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
    </div>
  );
}
