"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Plus, PackageSearch, Search, AlertTriangle } from "lucide-react";
import { inventoryApi, type Lot, type Warehouse } from "@/lib/inventoryApi";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  EXHAUSTED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  EXPIRED: "bg-red-50 text-red-600 border-red-200",
  BLOCKED: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang dùng",
  EXHAUSTED: "Hết hàng",
  EXPIRED: "Quá HSD",
  BLOCKED: "Khóa",
};

const ITEMS_PER_PAGE = 20;

function daysLeft(expiry?: string): number | null {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
}

export function ExpiryBadge({ expiryDate, quantity }: { expiryDate?: string; quantity: number }) {
  if (!expiryDate) return <span className="text-xs text-muted-foreground">Không HSD</span>;
  const d = daysLeft(expiryDate);
  if (d == null) return <span className="text-xs">-</span>;
  const date = new Date(expiryDate).toLocaleDateString("vi-VN");
  if (d < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
        <AlertTriangle className="w-3 h-3" /> Quá hạn {Math.abs(d)} ngày ({date})
      </span>
    );
  }
  if (quantity > 0 && d <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
        <AlertTriangle className="w-3 h-3" /> Còn {d} ngày ({date})
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{date}</span>;
}

export default function LotsPage() {
  const searchParams = useSearchParams();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [expiry, setExpiry] = useState(searchParams.get("expiry") || "");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({ code: "", variantId: "", variantLabel: "", warehouseId: "", quantity: 0, mfgDate: "", expiryDate: "", notes: "" });
  const [variantSearch, setVariantSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await inventoryApi.getLots({
        search: search || undefined,
        status: status || undefined,
        expiry: expiry || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      const payload = res?.data ?? res;
      setLots(payload?.data ?? (Array.isArray(payload) ? payload : []));
      setTotal(payload?.meta?.total ?? 0);
      setTotalPages(payload?.meta?.totalPages ?? 1);
    } catch {
      toast.error("Không tải được danh sách lô");
    } finally {
      setLoading(false);
    }
  }, [page, status, expiry, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (variantSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res: any = await inventoryApi.searchVariants(variantSearch.trim());
        setSearchResults(res?.data ?? res ?? []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [variantSearch]);

  const openCreate = async () => {
    setForm({ code: "", variantId: "", variantLabel: "", warehouseId: "", quantity: 0, mfgDate: "", expiryDate: "", notes: "" });
    setVariantSearch("");
    setSearchResults([]);
    setDialogOpen(true);
    try {
      const res: any = await inventoryApi.getWarehouses();
      setWarehouses(res?.data ?? res ?? []);
    } catch {
      setWarehouses([]);
    }
  };

  const handleCreate = async () => {
    if (!form.variantId) return toast.error("Chọn biến thể cho lô");
    if (!Number.isInteger(form.quantity) || form.quantity < 0) return toast.error("Số lượng phải là số nguyên ≥ 0");
    try {
      await inventoryApi.createLot({
        code: form.code.trim() || undefined,
        variantId: form.variantId,
        warehouseId: form.warehouseId || undefined,
        quantity: form.quantity,
        mfgDate: form.mfgDate || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Đã tạo lô");
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Không tạo được lô");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Lô hàng & HSD"
        description={`Quản lý lô, hạn sử dụng và serial (${total})`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Tạo lô
          </Button>
        }
      />

      <Card className="gap-0 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm mã lô / SKU..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Select value={expiry || "all"} onValueChange={(v) => { setExpiry(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="HSD" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả HSD</SelectItem>
              <SelectItem value="expiring">Sắp hết (30 ngày)</SelectItem>
              <SelectItem value="expired">Quá hạn còn tồn</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.keys(STATUS_LABEL).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Mã lô</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>Kho</TableHead>
              <TableHead className="text-center">Tồn / Ban đầu</TableHead>
              <TableHead>HSD</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <AdminTableSkeleton columns={6} />
            ) : lots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <AdminEmptyState icon={PackageSearch} title="Chưa có lô nào" description="Nhập hàng có HSD/NSX ở bước QC để tự sinh lô, hoặc tạo tay." />
                </TableCell>
              </TableRow>
            ) : (
              lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>
                    <Link href={`/admin/inventory/lots/${lot.id}`}>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-bold text-primary hover:underline">{lot.code}</code>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      {lot.variant?.product?.images?.[0] && (
                        <img src={lot.variant.product.images[0].url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{lot.variant?.product?.name || "N/A"}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{lot.variant?.sku}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{lot.warehouse?.code || "-"}</TableCell>
                  <TableCell className="text-center text-sm font-bold">
                    {lot.quantity} <span className="font-normal text-muted-foreground">/ {lot.initialQty}</span>
                  </TableCell>
                  <TableCell>
                    <ExpiryBadge expiryDate={lot.expiryDate} quantity={lot.quantity} />
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[lot.status] ?? STATUS_STYLE.ACTIVE}`}>
                      {STATUS_LABEL[lot.status] ?? lot.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {!loading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={ITEMS_PER_PAGE} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Tạo lô hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Biến thể *</Label>
              <div className="relative">
                <Input
                  placeholder="Tìm theo SKU/tên (ít nhất 2 ký tự)..."
                  value={form.variantLabel || variantSearch}
                  onChange={(e) => {
                    setVariantSearch(e.target.value);
                    setForm({ ...form, variantId: "", variantLabel: "" });
                  }}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border bg-background shadow-lg max-h-56 overflow-auto">
                    {searchResults.map((v: any) => (
                      <button
                        key={v.variantId}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, variantId: v.variantId, variantLabel: v.sku });
                          setVariantSearch("");
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center gap-2 p-2 text-left hover:bg-muted/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{v.productName}</span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">{v.sku}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.variantId && <p className="text-xs text-green-700 font-mono">Đã chọn: {form.variantLabel}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mã lô (trống = tự sinh)</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="LOT-2026-..." className="font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Số lượng *</Label>
                <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Kho</Label>
                <Select value={form.warehouseId || "none"} onValueChange={(v) => setForm({ ...form, warehouseId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Không gắn kho" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không gắn kho</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 col-span-2 sm:col-span-1">
                <div className="space-y-2">
                  <Label>NSX</Label>
                  <Input type="date" value={form.mfgDate} onChange={(e) => setForm({ ...form, mfgDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>HSD</Label>
                  <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate}>Tạo lô</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
