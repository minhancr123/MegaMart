"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import {
  ArrowLeft,
  PackageSearch,
  Loader2,
  Barcode,
  Plus,
} from "lucide-react";
import { inventoryApi, type Lot, type SerialNumber } from "@/lib/inventoryApi";
import { ExpiryBadge } from "../page";
import { toast } from "sonner";

const LOT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang dùng",
  EXHAUSTED: "Hết hàng",
  EXPIRED: "Quá HSD",
  BLOCKED: "Khóa",
};

const SERIAL_STATUS: Array<{ value: string; label: string }> = [
  { value: "IN_STOCK", label: "Còn hàng" },
  { value: "SOLD", label: "Đã bán" },
  { value: "DEFECTIVE", label: "Lỗi" },
  { value: "RETURNED", label: "Trả lại" },
];

const ITEMS_PER_PAGE = 20;

export default function LotDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lot, setLot] = useState<Lot | null>(null);
  const [loading, setLoading] = useState(true);
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [serialTotal, setSerialTotal] = useState(0);
  const [serialPages, setSerialPages] = useState(1);
  const [serialPage, setSerialPage] = useState(1);
  const [serialSearch, setSerialSearch] = useState("");
  const [serialStatus, setSerialStatus] = useState("");
  const [addText, setAddText] = useState("");
  const [adding, setAdding] = useState(false);

  const loadLot = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await inventoryApi.getLot(id);
      setLot(res?.data ?? res);
    } catch {
      toast.error("Không tải được lô");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSerials = useCallback(async () => {
    try {
      const res: any = await inventoryApi.getSerials({
        lotId: id,
        search: serialSearch.trim() || undefined,
        status: serialStatus || undefined,
        page: serialPage,
        limit: ITEMS_PER_PAGE,
      });
      const payload = res?.data ?? res;
      setSerials(payload?.data ?? (Array.isArray(payload) ? payload : []));
      setSerialTotal(payload?.meta?.total ?? 0);
      setSerialPages(payload?.meta?.totalPages ?? 1);
    } catch {
      toast.error("Không tải được serial");
    }
  }, [id, serialPage, serialStatus, serialSearch]);

  useEffect(() => {
    if (id) {
      loadLot();
      loadSerials();
    }
  }, [id, loadLot, loadSerials]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSerialPage(1);
      loadSerials();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialSearch, serialStatus]);

  const handleAddSerials = async () => {
    const list = addText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0 || !lot) return toast.error("Nhập ít nhất 1 serial (mỗi dòng 1 cái)");
    try {
      setAdding(true);
      const res: any = await inventoryApi.createSerials({ variantId: lot.variantId, lotId: id, serials: list });
      const payload = res?.data ?? res;
      toast.success(`Đã thêm ${payload?.created ?? list.length} serial${payload?.skipped ? ` (trùng ${payload.skipped})` : ""}`);
      setAddText("");
      loadSerials();
      loadLot();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Không thêm được serial");
    } finally {
      setAdding(false);
    }
  };

  const handleSerialStatus = async (sn: SerialNumber, status: string) => {
    try {
      await inventoryApi.updateSerial(sn.id, { status });
      toast.success(`Serial ${sn.serial} → ${status}`);
      loadSerials();
    } catch {
      toast.error("Không đổi được trạng thái");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="space-y-6">
        <Link href="/admin/inventory/lots" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Quay lại lô hàng
        </Link>
        <AdminEmptyState icon={PackageSearch} title="Không tìm thấy lô" description="Lô không tồn tại hoặc đã bị xóa." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/inventory/lots" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Quay lại lô hàng
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black font-mono">{lot.code}</h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-muted">
              {LOT_STATUS_LABEL[lot.status] ?? lot.status}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Sản phẩm</p>
              <p className="font-semibold line-clamp-1">{lot.variant?.product?.name || lot.variant?.sku}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{lot.variant?.sku}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kho</p>
              <p className="font-semibold">{lot.warehouse?.code || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tồn / Ban đầu</p>
              <p className="font-black text-lg">{lot.quantity} <span className="font-normal text-muted-foreground text-sm">/ {lot.initialQty}</span></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">HSD</p>
              <ExpiryBadge expiryDate={lot.expiryDate} quantity={lot.quantity} />
              {lot.mfgDate && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  NSX: {new Date(lot.mfgDate).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
          </div>
          {lot.notes && <p className="mt-2 text-sm text-muted-foreground italic">“{lot.notes}”</p>}
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Barcode className="w-4 h-4 text-primary" /> Serial trong lô ({serialTotal})
          </CardTitle>
        </CardHeader>
        <div className="px-4 sm:px-5 pb-3 space-y-3">
          <div>
            <Label className="text-xs">Nạp serial (mỗi dòng 1 cái, tối đa 500/lần)</Label>
            <Textarea
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder={"SN00123456\nSN00123457\n..."}
              className="mt-1 font-mono text-xs min-h-[70px]"
            />
            <Button size="sm" className="mt-2" onClick={handleAddSerials} disabled={adding}>
              <Plus className="w-4 h-4 mr-1.5" /> {adding ? "Đang nạp..." : "Nạp serial"}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Tìm serial..."
              className="h-9 text-xs font-mono"
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
            />
            <select
              value={serialStatus}
              onChange={(e) => { setSerialStatus(e.target.value); setSerialPage(1); }}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">Mọi trạng thái</option>
              {SERIAL_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serial</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Ngày nhập</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {serials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                  Lô chưa có serial nào. Serial tự sinh khi nhập hàng có khai báo, hoặc nạp tay ở trên.
                </TableCell>
              </TableRow>
            ) : (
              serials.map((sn) => (
                <TableRow key={sn.id}>
                  <TableCell className="font-mono text-xs font-bold">{sn.serial}</TableCell>
                  <TableCell>
                    <select
                      value={sn.status}
                      onChange={(e) => handleSerialStatus(sn, e.target.value)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full border bg-transparent ${SERIAL_STYLE[sn.status] ?? ""}`}
                    >
                      {SERIAL_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {sn.createdAt ? new Date(sn.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {serialPages > 1 && (
          <div className="p-4">
            <Pagination
              currentPage={serialPage}
              totalPages={serialPages}
              onPageChange={setSerialPage}
              totalItems={serialTotal}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

const SERIAL_STYLE: Record<string, string> = {
  IN_STOCK: "bg-green-50 text-green-700 border-green-200",
  SOLD: "bg-zinc-100 text-zinc-500 border-zinc-200",
  DEFECTIVE: "bg-red-50 text-red-600 border-red-200",
  RETURNED: "bg-amber-50 text-amber-700 border-amber-200",
};
