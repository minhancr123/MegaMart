"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PackageSearch,
  Warehouse as WarehouseIcon,
  CalendarDays,
} from "lucide-react";
import { supplierApi, type SupplierPurchaseOrder } from "@/lib/supplierApi";
import ShipmentSimulator from "@/components/admin/ShipmentSimulator";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-500 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Mới (chờ xác nhận)",
  PARTIAL: "Nhập một phần",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );

export default function SupplierPurchaseOrderDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [po, setPo] = useState<SupplierPurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [expectedDate, setExpectedDate] = useState("");
  const [note, setNote] = useState("");

  const loadPO = useCallback(async () => {
    try {
      setLoading(true);
      setPo(await supplierApi.getPurchaseOrder(id));
    } catch (error) {
      console.error("Failed to load PO", error);
      toast.error("Không tải được đơn đặt hàng");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadPO();
  }, [id, loadPO]);

  // Realtime: admin bấm gì (duyệt phiếu...) thì NCC thấy ngay không cần F5
  useEffect(() => {
    if (!po || (po.status !== "SENT" && po.status !== "PARTIAL")) return;
    const timer = setInterval(async () => {
      try {
        const fresh = await supplierApi.getPurchaseOrder(id);
        if (fresh?.id && fresh.status !== po.status) {
          setPo(fresh);
          toast.info("Đơn hàng có cập nhật mới từ MegaMart");
        } else if (fresh?.id) {
          setPo(fresh);
        }
      } catch {
        // Bỏ qua lỗi thoáng qua
      }
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, po?.status]);

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await supplierApi.confirmPurchaseOrder(id, {
        expectedDate: expectedDate || undefined,
        note: note.trim() || undefined,
      });
      toast.success("Đã xác nhận đơn đặt hàng");
      await loadPO();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Xác nhận thất bại");
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="space-y-6">
        <Link href="/supplier" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </Link>
        <AdminEmptyState icon={PackageSearch} title="Không tìm thấy PO" description="PO không tồn tại hoặc không thuộc về bạn." />
      </div>
    );
  }

  const totalOrdered = po.items.reduce((s, i) => s + i.orderedQty, 0);
  const totalReceived = po.items.reduce((s, i) => s + (i.receivedQty || 0), 0);
  const progress = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/supplier")}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black font-mono">{po.code}</h1>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[po.status] ?? STATUS_STYLE.DRAFT}`}>
              {STATUS_LABEL[po.status] ?? po.status}
            </span>
            {po.confirmedAt && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                Đã xác nhận {new Date(po.confirmedAt).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <WarehouseIcon className="w-3.5 h-3.5 shrink-0" /> Giao tới: {po.warehouse?.name} ({po.warehouse?.code})
            </p>
            {po.expectedDate && (
              <p className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" /> Mong về: {new Date(po.expectedDate).toLocaleDateString("vi-VN")}
              </p>
            )}
            {po.notes && <p className="italic">“{po.notes}”</p>}
            {po.confirmedNote && <p className="italic">Ghi chú xác nhận: “{po.confirmedNote}”</p>}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Tiến độ giao hàng</span>
              <span className="font-bold text-foreground">{totalReceived}/{totalOrdered} ({progress}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {po.status === "SENT" && !po.confirmedAt && (
        <Card className="border-primary/30">
          <CardHeader className="py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Xác nhận đơn hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Xác nhận bạn đã nhận được đơn này và cho biết ngày giao dự kiến.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ngày giao dự kiến</Label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú (tùy chọn)</Label>
                <Input
                  placeholder="vd: Giao 2 đợt, đợt 1 ngày..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleConfirm} disabled={confirming} className="w-full sm:w-auto h-10 rounded-xl font-bold">
              {confirming ? "Đang xác nhận..." : "Xác nhận đã nhận đơn"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Giả lập chuyến xe giao hàng tới kho (NCC không có nút tạo phiếu nhập) */}
      {(po.status === "SENT" || po.status === "PARTIAL") && (
        <ShipmentSimulator
          poId={po.id}
          poCode={po.code}
          supplierName="Kho của bạn"
          supplierAddress={po.supplier?.address}
          warehouseName={po.warehouse?.name || "Kho MegaMart"}
          warehouseCode={po.warehouse?.code}
          syncedProgress={(po as any).shipmentProgress ?? null}
          onProgress={(p) => {
            supplierApi.updateShipment(id, p).catch(() => {});
          }}
          receiptHref={null}
        />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Mặt hàng ({po.items.length})</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Đặt</TableHead>
              <TableHead className="text-center">Đã giao</TableHead>
              <TableHead className="text-center">Còn thiếu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.items.map((item) => {
              const missing = Math.max(0, item.orderedQty - (item.receivedQty || 0));
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.variant?.product?.images?.[0] && (
                        <img src={item.variant.product.images[0].url} alt="" className="w-10 h-10 object-cover rounded" />
                      )}
                      <span className="font-medium line-clamp-1">{item.variant?.product?.name || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell><code className="bg-muted px-2 py-1 rounded text-xs">{item.variant?.sku}</code></TableCell>
                  <TableCell className="text-center font-bold">{item.orderedQty}</TableCell>
                  <TableCell className="text-center text-green-700 font-bold">{item.receivedQty || 0}</TableCell>
                  <TableCell className={`text-center font-bold ${missing > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {missing}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
