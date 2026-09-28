"use client";

import { useEffect, useState } from "react";
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
import { Truck, Copy, Loader2, PackageX, Camera, AlertTriangle, RotateCcw, Banknote, History, Zap } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import {
  createGhnShipment,
  cancelGhnShipment,
  printGhnShipment,
  handoverGhnShipment,
  getGhnProvinces,
  getGhnDistricts,
  getGhnWards,
  getShipmentTimeline,
  addShipmentNote,
  uploadDeliveryProof,
  requestRefund,
  listRefundRequests,
  reviewRefundRequest,
  simulateGhnWebhook,
  type GhnProvince,
  type GhnDistrict,
  type GhnWard,
  type ShipmentTimelineEvent,
  type DeliveryProofItem,
  type RefundRequestItem,
} from "@/lib/shippingApi";
import { getOrderStatusConfig } from "@/components/admin/OrderStatusBadge";
import { updateOrderStatus } from "@/lib/adminApi";
import { refundMethodName, refundStatusName, refundChannelName } from "@/lib/paymentLabels";
import { shippingStatusBadgeTone, shippingStatusName } from "@/lib/shippingLabels";

interface GhnShipmentCardProps {
  orderId: string;
  orderCode: string;
  orderStatus: string;
  shippingAddress?: {
    districtId?: number | null;
    wardCode?: string | null;
    provinceId?: number | null;
  } | null;
  shippingOrderCode?: string | null;
  shippingStatus?: string | null;
  shippingFeeReal?: number | null;
  onChanged?: () => void;
}

const CREATABLE = ["CONFIRMED", "PROCESSING"];

export function GhnShipmentCard({
  orderId,
  orderCode,
  orderStatus,
  shippingAddress,
  shippingOrderCode,
  shippingStatus,
  shippingFeeReal,
  onChanged,
}: GhnShipmentCardProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [weight, setWeight] = useState("1000");
  const [note, setNote] = useState("");
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);
  const [provinceId, setProvinceId] = useState<number | null>(shippingAddress?.provinceId ?? null);
  const [districtId, setDistrictId] = useState<number | null>(shippingAddress?.districtId ?? null);
  const [wardCode, setWardCode] = useState<string | null>(shippingAddress?.wardCode ?? null);
  const [events, setEvents] = useState<ShipmentTimelineEvent[]>([]);
  const [proofs, setProofs] = useState<DeliveryProofItem[]>([]);
  const [refunds, setRefunds] = useState<RefundRequestItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [podFiles, setPodFiles] = useState<File[]>([]);
  const [podNote, setPodNote] = useState("");
  const [podSaving, setPodSaving] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [incidentSaving, setIncidentSaving] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("MANUAL");
  const [refundSaving, setRefundSaving] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState<{ id: string; action: "approve" | "reject" | "complete"; title: string; description: string } | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [simulatingStatus, setSimulatingStatus] = useState("delivering");
  const [simulatingLoading, setSimulatingLoading] = useState(false);

  const loadTimeline = async () => {
    setTimelineLoading(true);
    try {
      const [timeline, refundList] = await Promise.all([
        getShipmentTimeline(orderId).catch(() => null),
        listRefundRequests(orderId).catch(() => [] as RefundRequestItem[]),
      ]);
      setEvents(timeline?.events || []);
      setProofs(timeline?.proofs || []);
      setRefunds(refundList || []);
    } catch {
      // Đơn chưa có vận đơn hoặc chưa có event: giữ timeline rỗng, không spam toast.
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, shippingOrderCode]);

  useEffect(() => {
    if (!open) releasePointerEvents();

    return () => {
      releasePointerEvents();
    };
  }, [open]);

  const releasePointerEvents = () => {
    document.body.style.pointerEvents = "";
  };

  const refreshAll = async () => {
    await loadTimeline();
    onChanged?.();
  };

  const handleIncident = async (kind: "lost" | "damage") => {
    const label = kind === "lost" ? "thất lạc" : "hư hỏng";
    if (!confirm(`Xác nhận đơn hàng bị ${label}? Đơn sẽ chuyển sang Thất bại và hoàn kho.`)) return;
    setIncidentSaving(kind);
    try {
      await updateOrderStatus(orderId, "FAILED", { reason: `Admin xác nhận hàng bị ${label} (${shippingOrderCode || orderCode})` });
      await addShipmentNote(orderId, `Xác nhận hàng bị ${label}, chờ xử lý hoàn tiền/giao lại.`).catch(() => null);
      toast.success(`Đã đánh dấu đơn bị ${label}`);
      await refreshAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Cập nhật thất bại"));
    } finally {
      setIncidentSaving(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      toast.error("Vui lòng nhập nội dung ghi chú");
      return;
    }
    setNoteSaving(true);
    try {
      await addShipmentNote(orderId, noteText.trim());
      setNoteText("");
      toast.success("Đã ghi chú lên timeline");
      await loadTimeline();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Ghi chú thất bại"));
    } finally {
      setNoteSaving(false);
    }
  };

  const handlePodUpload = async () => {
    if (podFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh xác nhận");
      return;
    }
    setPodSaving(true);
    try {
      await uploadDeliveryProof(orderId, podFiles, podNote || undefined);
      setPodFiles([]);
      setPodNote("");
      toast.success("Đã lưu ảnh xác nhận, đơn tự chuyển sang Đã giao");
      await refreshAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Lưu ảnh POD thất bại"));
    } finally {
      setPodSaving(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!refundReason.trim()) {
      toast.error("Vui lòng nhập lý do hoàn tiền");
      return;
    }
    setRefundSaving(true);
    try {
      await requestRefund(orderId, {
        reason: refundReason.trim(),
        method: refundMethod,
        amount: refundAmount ? Number(refundAmount) : undefined,
      });
      setRefundReason("");
      setRefundAmount("");
      toast.success("Đã tạo yêu cầu hoàn tiền");
      await loadTimeline();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Tạo yêu cầu hoàn tiền thất bại"));
    } finally {
      setRefundSaving(false);
    }
  };

  const askReviewRefund = (refund: RefundRequestItem, action: "approve" | "reject" | "complete") => {
    const amount = new Intl.NumberFormat("vi-VN").format(Number(refund.amount || 0));
    const channel = refundChannelName((refund as any).channel);
    const map = {
      approve: {
        title: "Duyệt yêu cầu hoàn tiền",
        description: `Xác nhận duyệt yêu cầu hoàn ${amount}₫ qua ${refundMethodName(refund.method)}?`,
      },
      reject: {
        title: "Từ chối yêu cầu hoàn tiền",
        description: `Xác nhận từ chối yêu cầu hoàn ${amount}₫ này?`,
      },
      complete: {
        title: (refund as any).channel === "WALLET" ? "Hoàn tiền vào Ví MegaMart" : "Hoàn tất yêu cầu hoàn tiền",
        description:
          (refund as any).channel === "WALLET"
            ? `Hệ thống sẽ cộng ${amount}₫ vào Ví MegaMart của khách và chuyển đơn sang Hoàn tiền.`
            : `Xác nhận đã xử lý hoàn ${amount}₫ qua kênh ${channel}. Đơn sẽ chuyển sang Hoàn tiền.`,
      },
    } as const;
    setConfirmRefund({ id: refund.id, action, ...map[action] });
  };

  const handleReviewRefund = async () => {
    if (!confirmRefund) return;
    setReviewSaving(true);
    try {
      await reviewRefundRequest(confirmRefund.id, { action: confirmRefund.action });
      toast.success("Đã cập nhật yêu cầu hoàn tiền");
      setConfirmRefund(null);
      await refreshAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Duyệt hoàn tiền thất bại"));
    } finally {
      setReviewSaving(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setSimulatingLoading(true);
    try {
      await simulateGhnWebhook({
        orderCode,
        ghnCode: shippingOrderCode || undefined,
        status: simulatingStatus,
      });
      toast.success(`Đã bắn thử Webhook GHN "${simulatingStatus}"`);
      await refreshAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Bắn thử webhook thất bại"));
    } finally {
      setSimulatingLoading(false);
    }
  };

  const missingGeo = !shippingAddress?.districtId || !shippingAddress?.wardCode;

  useEffect(() => {
    if (!open) return;
    // Đồng bộ địa chỉ đã lưu mỗi lần mở modal (state khởi tạo 1 lần lúc mount có thể còn rỗng).
    const nextProvinceId = shippingAddress?.provinceId ?? null;
    const nextDistrictId = shippingAddress?.districtId ?? null;
    setProvinceId(nextProvinceId);
    setDistrictId(nextDistrictId);
    setWardCode(shippingAddress?.wardCode ?? null);
    getGhnProvinces().then(setProvinces).catch(() => setProvinces([]));
    if (nextProvinceId) {
      getGhnDistricts(nextProvinceId).then(setDistricts).catch(() => setDistricts([]));
    }
    if (nextDistrictId) {
      getGhnWards(nextDistrictId).then(setWards).catch(() => setWards([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      // Đơn cũ thiếu mã GHN: admin bổ sung trong modal, backend đọc từ đây
      // qua shippingAddress đã lưu — nên lưu lại địa chỉ trước khi tạo đơn.
      if (missingGeo && (!districtId || !wardCode)) {
        toast.error("Vui lòng chọn Quận/Huyện và Phường/Xã cho đơn hàng");
        return;
      }
      await createGhnShipment(orderId, {
        weight: Number(weight) || 1000,
        note: note || undefined,
        provinceId,
        districtId,
        wardCode,
      });
      toast.success("Tạo đơn GHN thành công");
      setOpen(false);
      releasePointerEvents();
      window.setTimeout(() => onChanged?.(), 0);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Tạo đơn GHN thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Hủy đơn vận chuyển trên GHN? Đơn MegaMart giữ nguyên.")) return;
    setCancelling(true);
    try {
      await cancelGhnShipment(orderId);
      toast.success("Đã hủy đơn GHN");
      onChanged?.();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Hủy đơn GHN thất bại"));
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await printGhnShipment(orderId);
      if (res.printUrl) window.open(res.printUrl, "_blank", "noopener,noreferrer");
      toast.success("Đã mở trang in vận đơn GHN");
      await refreshAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không tạo được link in vận đơn"));
    } finally {
      setPrinting(false);
    }
  };

  const handleHandover = async () => {
    if (!confirm("Xác nhận đã in vận đơn và bàn giao đơn này cho shipper?")) return;
    setHandoverLoading(true);
    try {
      await handoverGhnShipment(orderId);
      toast.success("Đã chuyển đơn sang Đang giao hàng");
      await refreshAll();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Bàn giao shipper thất bại"));
    } finally {
      setHandoverLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Đã sao chép"),
      () => toast.error("Không sao chép được"),
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Vận chuyển GHN</h2>
        </div>
        {shippingStatus && <Badge variant={shippingStatusBadgeTone(shippingStatus)}>{shippingStatusName(shippingStatus)}</Badge>}
      </div>

      {shippingOrderCode ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Mã vận đơn:</span>
            <span className="font-mono font-bold text-primary">{shippingOrderCode}</span>
            <button
              onClick={() => copy(shippingOrderCode)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Sao chép"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          {shippingFeeReal != null && Number(shippingFeeReal) > 0 && (
            <p className="text-sm text-muted-foreground">
              Cước thực tế:{" "}
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(shippingFeeReal))}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={printing}
              className="gap-2"
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              In vận đơn GHN
            </Button>
            <Button
              size="sm"
              onClick={handleHandover}
              disabled={handoverLoading || orderStatus === "SHIPPING" || orderStatus === "DELIVERED"}
              className="gap-2"
            >
              {handoverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              Bàn giao shipper
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageX className="w-4 h-4" />}
              Hủy đơn GHN
            </Button>
          </div>

          {/* Giả lập Webhook GHN (Test Simulator) */}
          <div className="mt-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold text-primary">Giả lập Webhook GHN (Test chuyển trạng thái)</p>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Bắn thử trạng thái từ GHN mà không cần shipper thật: xem đơn tự động nhảy trạng thái, trừ/hoàn kho và lưu timeline.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                value={simulatingStatus}
                onChange={(e) => setSimulatingStatus(e.target.value)}
                className="flex h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none"
              >
                <option value="picking">Đang lấy hàng (picking)</option>
                <option value="transporting">Đang luân chuyển → tự lên ĐANG GIAO (transporting)</option>
                <option value="delivering">Shipper đang đi giao (delivering)</option>
                <option value="delivered">Giao thành công → tự lên ĐÃ GIAO + COD Paid (delivered)</option>
                <option value="delivery_fail">Giao thất bại → giữ Đang giao chờ hẹn (delivery_fail)</option>
                <option value="lost">Thất lạc → tự sang THẤT BẠI + hoàn kho (lost)</option>
                <option value="damage">Hư hỏng → tự sang THẤT BẠI + hoàn kho (damage)</option>
              </select>
              <Button
                size="sm"
                onClick={handleSimulateWebhook}
                disabled={simulatingLoading}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground"
              >
                {simulatingLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Bắn thử Webhook
              </Button>
            </div>
          </div>
        </div>
      ) : CREATABLE.includes(orderStatus) ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Đơn {orderCode} chưa có vận đơn. Tạo đơn trên GHN để lấy mã và theo dõi hành trình.
          </p>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
            <Truck className="w-4 h-4" />
            Tạo đơn GHN
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Đơn ở trạng thái {getOrderStatusConfig(orderStatus).label}, chưa thể tạo vận đơn GHN.
        </p>
      )}

      {/* Timeline vận chuyển + POD */}
      <div className="mt-6 border-t pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Hành trình & xác nhận giao hàng</h3>
          {timelineLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>

        {proofs.length > 0 && (
          <div className="space-y-2">
            {proofs.map((p) => (
              <div key={p.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-xs font-bold text-emerald-700">Ảnh xác nhận giao hàng · {new Date(p.createdAt).toLocaleString("vi-VN")}</p>
                {p.note && <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.photoUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Ảnh xác nhận giao hàng" className="h-16 w-16 rounded-lg border object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {["SHIPPING", "DELIVERED"].includes(orderStatus) && (
          <div className="rounded-xl border p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold">Chụp ảnh xác nhận đã giao (tối đa 5 ảnh)</p>
            </div>
            <Input type="file" accept="image/*" multiple onChange={(e) => setPodFiles(Array.from(e.target.files || []).slice(0, 5))} />
            {podFiles.length > 0 && <p className="text-xs text-muted-foreground">Đã chọn {podFiles.length} ảnh</p>}
            <Input value={podNote} onChange={(e) => setPodNote(e.target.value)} placeholder="Ghi chú POD (tùy chọn)" />
            <Button size="sm" onClick={handlePodUpload} disabled={podSaving || podFiles.length === 0}>
              {podSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Lưu ảnh & xác nhận đã giao
            </Button>
          </div>
        )}

        {events.length > 0 ? (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${ev.kind === "INCIDENT" ? "bg-destructive" : ev.kind === "POD" ? "bg-emerald-500" : "bg-primary"}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {ev.kind === "POD" ? "Ảnh xác nhận giao hàng" : ev.kind === "INCIDENT" ? `Sự cố: ${shippingStatusName(ev.status)}` : ev.kind === "NOTE" ? "Ghi chú vận hành" : shippingStatusName(ev.status)}
                  </p>
                  {ev.message && <p className="text-muted-foreground">{ev.message}</p>}
                  <p className="text-[11px] text-muted-foreground">{new Date(ev.occurredAt || ev.createdAt).toLocaleString("vi-VN")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Chưa có sự kiện vận chuyển nào được ghi nhận.</p>
        )}

        {!["COMPLETED", "CANCELED", "FAILED", "REFUNDED"].includes(orderStatus) && (
          <div className="flex gap-2">
            <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Ghi chú: hẹn giao lại, liên hệ khách..." />
            <Button size="sm" variant="outline" onClick={handleAddNote} disabled={noteSaving}>
              {noteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Ghi chú"}
            </Button>
          </div>
        )}
      </div>

      {/* Xử lý sự cố */}
      {orderStatus === "SHIPPING" && (
        <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-bold">Xử lý sự cố giao hàng</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30" onClick={() => handleIncident("lost")} disabled={!!incidentSaving}>
              {incidentSaving === "lost" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackageX className="h-3.5 w-3.5" />} Thất lạc
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30" onClick={() => handleIncident("damage")} disabled={!!incidentSaving}>
              {incidentSaving === "damage" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />} Hư hỏng
            </Button>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Giao thất bại: giữ SHIPPING + ghi chú hẹn giao lại ở trên.
            </span>
          </div>
        </div>
      )}

      {/* Hoàn tiền */}
      {!["COMPLETED", "CANCELED", "FAILED", "REFUNDED"].includes(orderStatus) && (
        <div className="mt-4 rounded-xl border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold">Hoàn tiền</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            COD đã giao hoàn ngay vào Ví MegaMart · BANK_TRANSFER thử SePay tự động (fallback thủ công nếu lỗi) · VNPay/MoMo hoàn tay. Đơn đã hoàn thành sẽ không thể tạo yêu cầu hoàn tiền.
          </p>
          <div className="grid gap-2">
            <Input value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Lý do hoàn tiền (bắt buộc)" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} type="number" min={0} placeholder="Số tiền (để trống = toàn bộ đã thu)" />
              <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="MANUAL">Hoàn thủ công</option>
                <option value="WALLET">Ví nội bộ (nhận ngay)</option>
                <option value="ORIGINAL_GATEWAY">Hoàn về cổng thanh toán</option>
                <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
              </select>
            </div>
            <Button size="sm" onClick={handleRequestRefund} disabled={refundSaving}>
              {refundSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />} Tạo yêu cầu hoàn tiền
            </Button>
          </div>
          {refunds.length > 0 && (
            <div className="space-y-2">
              {refunds.map((r) => (
                <div key={r.id} className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{new Intl.NumberFormat("vi-VN").format(Number(r.amount))}₫ · {refundMethodName(r.method)} · Kênh: {refundChannelName((r as any).channel)}</p>
                    <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "REJECTED" ? "destructive" : "info"}>{refundStatusName(r.status)}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{r.reason}</p>
                  {r.reviewedNote && <p className="mt-1 text-muted-foreground italic">Duyệt: {r.reviewedNote}</p>}
                  {(r as any).failureReason && (
                    <p className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                      {(r as any).failureReason}
                      {(r as any).channel === "MANUAL" && r.status === "APPROVED" ? " — vui lòng chuyển tiền thủ công rồi bấm hoàn tất." : ""}
                    </p>
                  )}
                  {(r.status === "PENDING" || r.status === "APPROVED") && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.status === "PENDING" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => askReviewRefund(r, "approve")}>Duyệt</Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => askReviewRefund(r, "reject")}>Từ chối</Button>
                        </>
                      )}
                      {r.status === "APPROVED" && (
                        <Button size="sm" onClick={() => askReviewRefund(r, "complete")}>
                          {(r as any).channel === "WALLET" ? "Hoàn vào ví · Hoàn tất" : (r as any).failureReason ? "Xác nhận đã chuyển tiền thủ công" : "Đã chuyển tiền · Hoàn tất"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lịch sử hoàn tiền cho đơn đã lock (luôn hiện nếu có dữ liệu) */}
      {["COMPLETED", "CANCELED", "FAILED", "REFUNDED"].includes(orderStatus) && refunds.length > 0 && (
        <div className="mt-4 rounded-xl border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold">Lịch sử hoàn tiền</p>
          </div>
          <div className="space-y-2">
            {refunds.map((r) => (
              <div key={r.id} className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{new Intl.NumberFormat("vi-VN").format(Number(r.amount))}₫ · {refundMethodName(r.method)} · Kênh: {refundChannelName((r as any).channel)}</p>
                  <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "REJECTED" ? "destructive" : "info"}>{refundStatusName(r.status)}</Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{r.reason}</p>
                {r.reviewedNote && <p className="mt-1 text-muted-foreground italic">Duyệt: {r.reviewedNote}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Tạo đơn vận chuyển GHN</DialogTitle>
            <DialogDescription>
              Đơn {orderCode} sẽ được đẩy sang GHN staging. Kiểm tra kỹ khối lượng và địa chỉ.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="ghn-weight">Khối lượng gói hàng (gram)</Label>
              <Input
                id="ghn-weight"
                type="number"
                min={50}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            {missingGeo && (
              <div className="grid gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3">
                <p className="text-xs text-muted-foreground">
                  Đơn cũ thiếu mã Quận/Xã GHN — chọn bổ sung (sẽ dùng cho lần tạo này):
                </p>
                <div className="grid gap-2">
                  <Label>Tỉnh/Thành</Label>
                  <select
                    value={provinceId ?? ""}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      setProvinceId(id);
                      setDistrictId(null);
                      setWardCode(null);
                      setDistricts([]);
                      setWards([]);
                      if (id) getGhnDistricts(id).then(setDistricts).catch(() => setDistricts([]));
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map((p) => (
                      <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label>Quận/Huyện</Label>
                    <select
                      value={districtId ?? ""}
                      disabled={!provinceId}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        setDistrictId(id);
                        setWardCode(null);
                        setWards([]);
                        if (id) getGhnWards(id).then(setWards).catch(() => setWards([]));
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
                    >
                      <option value="">Chọn quận/huyện</option>
                      {districts.map((d) => (
                        <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Phường/Xã</Label>
                    <select
                      value={wardCode ?? ""}
                      disabled={!districtId}
                      onChange={(e) => setWardCode(e.target.value || null)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
                    >
                      <option value="">Chọn phường/xã</option>
                      {wards.map((w) => (
                        <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="ghn-note">Ghi chú giao hàng (tùy chọn)</Label>
              <Input
                id="ghn-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Gọi trước khi giao"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tạo đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmRefund} onOpenChange={(v) => !v && !reviewSaving && setConfirmRefund(null)}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              {confirmRefund?.title}
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              {confirmRefund?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmRefund(null)} disabled={reviewSaving}>
              Hủy
            </Button>
            <Button
              variant={confirmRefund?.action === "reject" ? "destructive" : "default"}
              onClick={handleReviewRefund}
              disabled={reviewSaving}
            >
              {reviewSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmRefund?.action === "reject" ? "Từ chối" : confirmRefund?.action === "approve" ? "Duyệt" : "Xác nhận hoàn tất"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
