"use client";

import { useEffect, useState } from "react";
import { Camera, Truck, Copy, ExternalLink, PackageSearch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trackShippingOrder, getShipmentTimeline, type ShippingTracking, type DeliveryProofItem, type ShipmentTimelineEvent } from "@/lib/shippingApi";
import { shippingStatusBadgeTone, shippingStatusName } from "@/lib/shippingLabels";
import { formatDate } from "@/lib/utils";

interface ShippingCarrierCardProps {
  orderId?: string;
  /** Mã đơn MegaMart, dùng để tra cứu vận đơn thật trên GHN. */
  orderCode?: string;
  carrierName?: string;
  /** Chỉ hiện nút Hóa đơn điện tử khi đơn đã thanh toán (chưa thu tiền thì chưa xuất hóa đơn). */
  canShowInvoice?: boolean;
}

const formatDateTime = (iso: string | null | undefined) =>
  iso ? formatDate(iso, { withTime: true }) : "";

export const ShippingCarrierCard = ({
  orderId = "",
  orderCode = "",
  carrierName = "GHN Express",
  canShowInvoice = false,
}: ShippingCarrierCardProps) => {
  const [tracking, setTracking] = useState<ShippingTracking | null>(null);
  const [proofs, setProofs] = useState<DeliveryProofItem[]>([]);
  const [events, setEvents] = useState<ShipmentTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const doTrack = (code: string) => {
    const q = code.trim();
    if (!q) {
      toast.error("Vui lòng nhập mã đơn hàng hoặc mã vận đơn");
      return;
    }
    setLoading(true);
    trackShippingOrder(q)
      .then((res) => setTracking(res))
      .catch(() =>
        setTracking({ found: false, orderCode: q, carrier: carrierName }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!orderCode) return;
    doTrack(orderCode);
    if (orderId) {
      getShipmentTimeline(orderId)
        .then((res) => {
          setProofs(res.proofs || []);
          setEvents(res.events || []);
        })
        .catch(() => {
          setProofs([]);
          setEvents([]);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode, orderId]);

  const handleCopy = (code: string, label = "Đã sao chép mã vận đơn vào clipboard!") => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Trình duyệt không hỗ trợ sao chép tự động");
      return;
    }
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success(label))
      .catch(() => toast.error("Không thể sao chép vào clipboard"));
  };

  const code = tracking?.trackingCode || orderCode;

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Carrier Info Left */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Truck className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Đơn vị vận chuyển:</span>
              <span className="font-bold text-sm text-foreground">{carrierName}</span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tra cứu vận đơn...</span>
              </div>
            ) : tracking?.found && tracking.trackingCode ? (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">Mã vận đơn:</span>
                <span className="font-mono font-bold text-sm text-primary">
                  {tracking.trackingCode}
                </span>
                <button
                  onClick={() => handleCopy(tracking.trackingCode as string)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Sao chép mã"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`https://tracking.ghn.dev/?order_code=${encodeURIComponent(tracking.trackingCode)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  title="Mở trang theo dõi của GHN"
                >
                  Theo dõi trên GHN
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <PackageSearch className="w-3.5 h-3.5 shrink-0" />
                <span>Đơn hàng đang được chuẩn bị, chưa bàn giao cho GHN.</span>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Link Right */}
        <div className="self-end sm:self-center flex items-center gap-2">
          {tracking?.found && (tracking.statusName || tracking.status) && (
            <Badge variant={shippingStatusBadgeTone(tracking.status)}>{tracking.statusName || shippingStatusName(tracking.status)}</Badge>
          )}
          {canShowInvoice && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Hóa đơn điện tử đang được xử lý và gửi vào email của bạn.")}
              className="rounded-xl h-9 px-3.5 text-xs font-semibold border-border gap-1.5 hover:bg-muted"
            >
              <span>Hóa đơn điện tử</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Tracking timeline từ GHN */}
      {tracking?.found && tracking.logs && tracking.logs.length > 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-foreground mb-3">
            Hành trình vận chuyển
            {tracking.expectedDelivery && (
              <span className="font-normal text-muted-foreground">
                {" "}
                • Dự kiến giao: {formatDateTime(tracking.expectedDelivery)}
              </span>
            )}
          </p>
          <ol className="space-y-3">
            {tracking.logs.slice(0, 6).map((log, idx) => (
              <li key={idx} className="flex items-start gap-3 text-xs">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    idx === 0 ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{shippingStatusName(log.statusName || (log as { status?: string }).status)}</p>
                  {log.time && (
                    <p className="text-muted-foreground">{formatDateTime(log.time)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Ảnh xác nhận đã giao hàng (POD) cho khách xem */}
      {proofs.length > 0 && (
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Camera className="w-4 h-4" />
            <span>Ảnh xác nhận giao hàng thực tế (POD)</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {proofs.flatMap((p) => p.photoUrls).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Ảnh xác nhận giao hàng"
                  className="h-16 w-16 rounded-xl border border-border object-cover shadow-sm hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Ghi chú vận hành / cập nhật hẹn giao lại */}
      {events.filter((e) => e.kind === "NOTE" || e.kind === "INCIDENT" || e.kind === "TRACKING").length > 0 && (
        <div className="border-t border-border pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Cập nhật vận chuyển &amp; ghi chú giao hàng</p>
          <div className="space-y-1.5">
            {events.filter((e) => e.kind === "NOTE" || e.kind === "INCIDENT" || e.kind === "TRACKING").map((ev) => (
              <div key={ev.id} className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 flex items-start gap-2 border border-border/50">
                <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${ev.kind === "INCIDENT" ? "bg-red-500" : ev.kind === "TRACKING" ? "bg-blue-500" : "bg-orange-500"}`} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{ev.message || shippingStatusName(ev.status)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(ev.occurredAt || ev.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy mã đơn MegaMart khi chưa có vận đơn (tiện đối chiếu) */}
      {!loading && !tracking?.found && code && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Mã đơn hàng:</span>
          <span className="font-mono font-semibold text-foreground">{code}</span>
          <button
            onClick={() => handleCopy(code, "Đã sao chép mã đơn hàng!")}
            className="p-1 rounded-md hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Sao chép mã đơn"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
