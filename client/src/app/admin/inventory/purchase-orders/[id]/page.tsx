"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  FileText,
  Send,
  XCircle,
  PackagePlus,
  Loader2,
  Building2,
  Warehouse as WarehouseIcon,
  CalendarDays,
  Mail,
} from "lucide-react";
import { inventoryApi, type PurchaseOrder } from "@/lib/inventoryApi";
import ShipmentSimulator from "@/components/admin/ShipmentSimulator";
import { toast } from "sonner";

import {
  PO_STATUS_STYLE as STATUS_STYLE,
  PO_STATUS_LABEL_ADMIN as STATUS_LABEL,
} from "@/lib/inventoryStatus";
import { formatPrice } from "@/lib/utils";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadPO = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await inventoryApi.getPurchaseOrder(id);
      setPo(res?.data ?? res);
    } catch (error) {
      console.error("Failed to load PO", error);
      toast.error("Không tải được PO");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadPO();
  }, [id, loadPO]);

  // Realtime: NCC xác nhận / chạy xe thì admin thấy ngay không cần F5
  const prevPoRef = useRef<any>(null);
  useEffect(() => {
    if (!po || (po.status !== "SENT" && po.status !== "PARTIAL")) return;
    const timer = setInterval(async () => {
      try {
        const res: any = await inventoryApi.getPurchaseOrder(id);
        const fresh = res?.data ?? res;
        if (!fresh?.id) return;
        const prev = prevPoRef.current || po;
        if (fresh.status && fresh.status !== prev.status) {
          toast.info(`PO chuyển sang: ${STATUS_LABEL[fresh.status] ?? fresh.status}`);
        }
        if (!prev.confirmedAt && fresh.confirmedAt) {
          toast.success("NCC đã xác nhận đơn đặt hàng!");
        }
        if ((fresh.shipmentProgress ?? 0) >= 100 && (prev.shipmentProgress ?? 0) < 100) {
          toast.success("Xe giao hàng đã tới kho!");
        }
        prevPoRef.current = fresh;
        setPo(fresh);
      } catch {
        // Lỗi thoáng qua thì bỏ qua, lần sau poll tiếp
      }
    }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, po?.status]);

  const pushShipment = useCallback(
    (p: number) => {
      inventoryApi.updateShipment(id, p).catch(() => {});
    },
    [id]
  );

  const doAction = async (action: "send" | "cancel") => {
    try {
      setActing(true);
      if (action === "send") {
        await inventoryApi.sendPurchaseOrder(id);
        toast.success("Đã gửi PO cho nhà cung cấp");
      } else {
        await inventoryApi.cancelPurchaseOrder(id);
        toast.success("Đã hủy PO");
      }
      await loadPO();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Thao tác thất bại");
    } finally {
      setActing(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setActing(true);
      const res: any = await inventoryApi.sendPurchaseOrderEmail(id);
      toast.success(`Đã gửi mail PO tới ${res?.to || res?.data?.to || "NCC"}`);
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Không gửi được mail");
    } finally {
      setActing(false);
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
        <Link href="/admin/inventory/purchase-orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách PO
        </Link>
        <AdminEmptyState icon={FileText} title="Không tìm thấy PO" description="PO không tồn tại hoặc đã bị xóa." />
      </div>
    );
  }

  const totalOrdered = po.items.reduce((s, i) => s + i.orderedQty, 0);
  const totalReceived = po.items.reduce((s, i) => s + (i.receivedQty || 0), 0);
  const progress = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  const canReceive = po.status === "SENT" || po.status === "PARTIAL";

  return (
    <div className="space-y-6">
      <Link href="/admin/inventory/purchase-orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách PO
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-mono">{po.code}</h1>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[po.status] ?? STATUS_STYLE.DRAFT}`}>
                  {STATUS_LABEL[po.status] ?? po.status}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0" /> {po.supplier?.name} ({po.supplier?.code})
                </p>
                <p className="flex items-center gap-2">
                  <WarehouseIcon className="w-3.5 h-3.5 shrink-0" /> Kho nhận: {po.warehouse?.name} ({po.warehouse?.code})
                </p>
                {po.expectedDate && (
                  <p className="flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" /> Mong về: {new Date(po.expectedDate).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {po.notes && <p className="italic">“{po.notes}”</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {po.status === "DRAFT" && (
                <Button size="sm" onClick={() => doAction("send")} disabled={acting}>
                  <Send className="w-4 h-4 mr-1.5" /> Gửi NCC
                </Button>
              )}
              {po.status !== "CANCELLED" && (
                <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={acting}>
                  <Mail className="w-4 h-4 mr-1.5" /> Gửi mail
                </Button>
              )}
              {canReceive && (
                <Link href={`/admin/inventory/movements/new?purchaseOrderId=${po.id}`}>
                  <Button size="sm" variant="outline">
                    <PackagePlus className="w-4 h-4 mr-1.5" /> Tạo phiếu nhập
                  </Button>
                </Link>
              )}
              {(po.status === "DRAFT" || po.status === "SENT" || po.status === "PARTIAL") && (
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => doAction("cancel")} disabled={acting}>
                  <XCircle className="w-4 h-4 mr-1.5" /> Hủy PO
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Tiến độ nhận hàng</span>
              <span className="font-bold text-foreground">{totalReceived}/{totalOrdered} ({progress}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Giả lập chuyến xe giao hàng NCC -> kho (share 2 chiều với NCC) */}
      {(po.status === "SENT" || po.status === "PARTIAL") && (
        <ShipmentSimulator
          poId={po.id}
          poCode={po.code}
          supplierName={po.supplier?.name || "Nhà cung cấp"}
          supplierAddress={po.supplier?.address}
          supplierLat={po.supplier?.lat}
          supplierLng={po.supplier?.lng}
          warehouseName={po.warehouse?.name || "Kho nhận"}
          warehouseCode={po.warehouse?.code}
          syncedProgress={po.shipmentProgress ?? null}
          onProgress={pushShipment}
        />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Mặt hàng đặt ({po.items.length})</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Đã đặt</TableHead>
              <TableHead className="text-center">Đã nhận</TableHead>
              <TableHead className="text-center">Còn thiếu</TableHead>
              <TableHead className="text-right">Giá nhập</TableHead>
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
                  <TableCell className="text-right">{item.unitPrice ? formatPrice(item.unitPrice) : "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {po.movements && po.movements.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Phiếu nhập theo PO ({po.movements.length})</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã phiếu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Ngày tạo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/admin/inventory/movements/${m.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                      {m.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{m.type}</TableCell>
                  <TableCell className="text-sm">{m.status}{m.qcStatus && m.qcStatus !== "PENDING" ? ` · QC ${m.qcStatus}` : ""}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
