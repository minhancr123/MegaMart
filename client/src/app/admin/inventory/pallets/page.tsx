"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PalletMiniMap } from "@/components/admin/PalletVisual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryApi, type Pallet, type Warehouse } from "@/lib/inventoryApi";
import { getWarehouseRegion, regionBadgeClass } from "@/lib/warehouseRegion";
import { Boxes, Check, Clipboard, Copy, Eye, Grid2X2, Layers, List, Loader2, LockKeyhole, MapPin, PackageCheck, Plus, RotateCcw, Search, Warehouse as WarehouseIcon, X } from "lucide-react";
import { toast } from "sonner";

import {
  PALLET_STATUS_STYLE as STATUS_STYLE,
  PALLET_STATUS_LABEL as STATUS_LABEL,
} from "@/lib/inventoryStatus";
const ITEMS_PER_PAGE = 20;

function getMetrics(pallet: Pallet) {
  const boxes = pallet.boxes || [];
  const boxCount = boxes.length || pallet._count?.boxes || 0;
  const totalQty = boxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
  const validLevels = boxes.map((box) => Number(box.level)).filter((level) => Number.isInteger(level) && level >= 1);
  const configuredLevels = Number(pallet.maxLevels);
  const highestLevel = Math.max(1, ...validLevels);
  const maxLevels = Math.max(Number.isInteger(configuredLevels) && configuredLevels >= 1 ? configuredLevels : 1, highestLevel);
  const occupiedLevels = new Set(validLevels).size;
  const fillRate = Math.min(100, Math.round(occupiedLevels / maxLevels * 100));
  return { boxes, boxCount, totalQty, maxLevels, occupiedLevels, fillRate };
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status] ?? STATUS_STYLE.ACTIVE}`}>{STATUS_LABEL[status] ?? status}</span>;
}

function MetricCard({ icon: Icon, label, value, helper, tone }: { icon: typeof Layers; label: string; value: number; helper: string; tone: string }) {
  return <Card className="gap-0 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-[11px] text-muted-foreground">{helper}</p></Card>;
}

function PalletCardSkeleton() {
  return <Card className="gap-0 overflow-hidden py-0"><div className="space-y-4 p-5"><div className="flex justify-between"><Skeleton className="h-7 w-32" /><Skeleton className="h-16 w-28" /></div><Skeleton className="h-16 w-full" /><Skeleton className="h-2 w-full" /><Skeleton className="h-5 w-40" /></div><div className="flex justify-end gap-2 border-t p-3"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-28" /></div></Card>;
}

export default function PalletsPage() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pallet | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", warehouseId: "", location: "", status: "ACTIVE", notes: "" });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [palletResponse, warehouseResponse]: any[] = await Promise.all([inventoryApi.getPallets(warehouseFilter || undefined), inventoryApi.getWarehouses()]);
      setPallets(Array.isArray(palletResponse) ? palletResponse : palletResponse?.data ?? []);
      setWarehouses(warehouseResponse?.data ?? warehouseResponse ?? []);
    } catch {
      setLoadError(true);
      toast.error("Không tải được danh sách pallet");
    } finally { setLoading(false); }
  }, [warehouseFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const filteredPallets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return pallets.filter((pallet) => {
      if (statusFilter && pallet.status !== statusFilter) return false;
      if (!keyword) return true;
      const boxText = (pallet.boxes || []).map((box) => `${box.boxCode} ${box.variant?.sku || ""} ${box.variant?.product?.name || ""}`).join(" ");
      return `${pallet.code} ${pallet.location || ""} ${pallet.notes || ""} ${pallet.warehouse?.name || ""} ${pallet.warehouse?.code || ""} ${boxText}`.toLowerCase().includes(keyword);
    });
  }, [pallets, search, statusFilter]);

  const stats = useMemo(() => ({
    total: pallets.length,
    active: pallets.filter((pallet) => pallet.status === "ACTIVE").length,
    empty: pallets.filter((pallet) => pallet.status === "EMPTY").length,
    locked: pallets.filter((pallet) => pallet.status === "LOCKED").length,
    warehouses: new Set(pallets.map((pallet) => pallet.warehouseId)).size,
  }), [pallets]);
  const totalPages = Math.max(1, Math.ceil(filteredPallets.length / ITEMS_PER_PAGE));
  const paged = filteredPallets.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const hasFilters = Boolean(search || statusFilter || warehouseFilter);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const clearFilters = () => { setSearch(""); setStatusFilter(""); setWarehouseFilter(""); setPage(1); };
  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopiedCode(code); toast.success(`Đã sao chép ${code}`); window.setTimeout(() => setCopiedCode(null), 1500); }
    catch { toast.error("Không thể sao chép mã pallet"); }
  };
  const openCreate = () => { setEditing(null); setForm({ code: "", warehouseId: warehouseFilter || "", location: "", status: "ACTIVE", notes: "" }); setDialogOpen(true); };
  const openEdit = (pallet: Pallet) => { setEditing(pallet); setForm({ code: pallet.code, warehouseId: pallet.warehouseId, location: pallet.location || "", status: pallet.status, notes: pallet.notes || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing && !form.code.trim()) return toast.error("Nhập mã pallet (ví dụ PL-HCM-001)");
    if (!editing && !form.warehouseId) return toast.error("Chọn kho cho pallet");
    try {
      setSaving(true);
      if (editing) {
        await inventoryApi.updatePallet(editing.id, { location: form.location.trim() || null, status: form.status, notes: form.notes.trim() || null });
        toast.success("Đã cập nhật pallet");
      } else {
        await inventoryApi.createPallet({ code: form.code.trim(), warehouseId: form.warehouseId, location: form.location.trim() || undefined, notes: form.notes.trim() || undefined });
        toast.success("Đã tạo pallet");
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error: any) { toast.error(error?.data?.message || error?.message || "Không lưu được pallet"); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <AdminPageHeader title="Trung tâm Pallet" description="Theo dõi sức chứa, vị trí và luồng xếp thùng trong kho." actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />Tạo pallet</Button>} />

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <MetricCard icon={Layers} label="Tổng pallet" value={stats.total} helper={`${stats.warehouses} kho đang quản lý`} tone="bg-primary/10 text-primary" />
      <MetricCard icon={PackageCheck} label="Đang sử dụng" value={stats.active} helper={stats.total ? `${Math.round(stats.active / stats.total * 100)}% tổng pallet` : "Chưa có dữ liệu"} tone="bg-emerald-500/10 text-emerald-600" />
      <MetricCard icon={Boxes} label="Sẵn sàng nhập" value={stats.empty} helper="Pallet trống có thể sử dụng" tone="bg-sky-500/10 text-sky-600" />
      <MetricCard icon={LockKeyhole} label="Đang khóa" value={stats.locked} helper={stats.locked ? "Cần kiểm tra trạng thái" : "Không có cảnh báo"} tone="bg-red-500/10 text-red-600" />
    </div>

    <Card className="gap-0 p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã pallet, vị trí, SKU hoặc sản phẩm..." className="pl-9 pr-9" />{search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Xóa tìm kiếm"><X className="h-3.5 w-3.5" /></button>}</div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={warehouseFilter || "all"} onValueChange={(value) => { setWarehouseFilter(value === "all" ? "" : value); setPage(1); }}><SelectTrigger className="w-full sm:w-56"><WarehouseIcon className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="Tất cả kho" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả kho</SelectItem>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem><SelectItem value="ACTIVE">Đang dùng</SelectItem><SelectItem value="EMPTY">Trống</SelectItem><SelectItem value="LOCKED">Đang khóa</SelectItem></SelectContent></Select>
        </div>
        <div className="flex items-center gap-2">{hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><RotateCcw className="h-3.5 w-3.5" />Đặt lại</Button>}<div className="ml-auto flex rounded-lg border bg-muted/40 p-1"><button type="button" onClick={() => setViewMode("grid")} className={`grid h-7 w-8 place-items-center rounded-md ${viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"}`} aria-label="Xem dạng lưới"><Grid2X2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setViewMode("table")} className={`grid h-7 w-8 place-items-center rounded-md ${viewMode === "table" ? "bg-background shadow-sm" : "text-muted-foreground"}`} aria-label="Xem dạng bảng"><List className="h-3.5 w-3.5" /></button></div></div>
      </div>
      {!loading && !loadError && <p className="mt-3 text-xs text-muted-foreground">Hiển thị <strong className="text-foreground">{filteredPallets.length}</strong> trên {pallets.length} pallet</p>}
    </Card>

    {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <PalletCardSkeleton key={index} />)}</div> : loadError ? <Card className="gap-0 py-0"><AdminEmptyState icon={Layers} title="Không tải được danh sách pallet" description="Đường truyền có thể đang gián đoạn." action={<Button variant="outline" onClick={fetchData}><RotateCcw className="h-4 w-4" />Thử lại</Button>} /></Card> : paged.length === 0 ? <Card className="gap-0 py-0"><AdminEmptyState icon={Layers} title={hasFilters ? "Không tìm thấy pallet phù hợp" : "Chưa có pallet nào"} description={hasFilters ? "Thử thay đổi từ khóa hoặc đặt lại bộ lọc." : "Tạo pallet đầu tiên để bắt đầu phân tầng."} action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Đặt lại bộ lọc</Button> : <Button onClick={openCreate}><Plus className="h-4 w-4" />Tạo pallet</Button>} /></Card> : viewMode === "grid" ?
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{paged.map((pallet) => {
        const { boxes, boxCount, totalQty, maxLevels, occupiedLevels, fillRate } = getMetrics(pallet);
        const region = getWarehouseRegion(pallet.warehouse);
        const thumbs = boxes.map((box) => box.variant?.product?.images?.[0]?.url).filter((url): url is string => Boolean(url)).filter((url, index, all) => all.indexOf(url) === index).slice(0, 3);
        return <Card key={pallet.id} className="group gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
          <div className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-1"><Link href={`/admin/inventory/pallets/${pallet.id}`} className="truncate font-mono text-base font-black hover:text-primary">{pallet.code}</Link><button type="button" onClick={() => copyCode(pallet.code)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={`Sao chép ${pallet.code}`}>{copiedCode === pallet.code ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button></div><div className="mt-2 flex flex-wrap gap-1.5"><StatusBadge status={pallet.status} /><Badge variant="outline" className={regionBadgeClass(region.tone)}>{region.label}</Badge></div></div><PalletMiniMap boxes={boxes.map((box) => ({ id: box.id, boxCode: box.boxCode, level: box.level, quantity: box.quantity }))} maxLevels={maxLevels} /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/45 p-3 text-xs"><div><p className="text-[10px] uppercase text-muted-foreground">Kho</p><p className="mt-1 truncate font-semibold">{pallet.warehouse?.code || "Chưa gán"}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Vị trí</p><p className="mt-1 flex items-center gap-1 truncate font-mono font-bold"><MapPin className="h-3 w-3 text-primary" />{pallet.location || "Chưa đặt"}</p></div></div>
          <div className="mt-4 space-y-2"><div className="flex justify-between text-xs"><span className="text-muted-foreground">Tầng đang dùng</span><span className="font-bold">{occupiedLevels}/{maxLevels} · {fillRate}%</span></div><Progress value={fillRate} className="h-1.5" /></div>
          <div className="mt-4 flex items-center justify-between"><div className="flex gap-3 text-xs text-muted-foreground"><span><strong className="text-foreground">{boxCount}</strong> thùng</span><span><strong className="text-foreground">{totalQty}</strong> SP</span></div>{thumbs.length > 0 && <div className="flex -space-x-2">{thumbs.map((url) => <img key={url} src={url} alt="" loading="lazy" className="h-8 w-8 rounded-lg border-2 border-card bg-white object-cover" />)}</div>}</div></div>
          <div className="flex justify-end gap-2 border-t bg-muted/20 p-3"><Button variant="ghost" size="sm" onClick={() => openEdit(pallet)}>Sửa</Button><Button asChild size="sm"><Link href={`/admin/inventory/pallets/${pallet.id}`}><Eye className="h-4 w-4" />Chi tiết & xếp tầng</Link></Button></div>
        </Card>;
      })}</div> :
      <Card className="gap-0 overflow-hidden py-0"><Table><TableHeader><TableRow><TableHead>Pallet</TableHead><TableHead>Kho & vị trí</TableHead><TableHead>Trạng thái</TableHead><TableHead>Sức chứa tầng</TableHead><TableHead>Hàng hóa</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader><TableBody>{paged.map((pallet) => { const { boxCount, totalQty, maxLevels, occupiedLevels, fillRate } = getMetrics(pallet); return <TableRow key={pallet.id}><TableCell><div className="flex items-center gap-1"><Link href={`/admin/inventory/pallets/${pallet.id}`} className="font-mono font-bold hover:text-primary">{pallet.code}</Link><Button variant="ghost" size="icon-sm" onClick={() => copyCode(pallet.code)} aria-label={`Sao chép ${pallet.code}`}><Copy className="h-3.5 w-3.5" /></Button></div></TableCell><TableCell><p className="font-medium">{pallet.warehouse?.name || "Chưa gán kho"}</p><p className="font-mono text-xs text-muted-foreground">{pallet.location || "Chưa có vị trí"}</p></TableCell><TableCell><StatusBadge status={pallet.status} /></TableCell><TableCell className="min-w-40"><div className="flex justify-between text-xs"><span>{occupiedLevels}/{maxLevels} tầng</span><span>{fillRate}%</span></div><Progress value={fillRate} className="mt-2 h-1.5" /></TableCell><TableCell><p className="font-semibold">{boxCount} thùng</p><p className="text-xs text-muted-foreground">{totalQty} sản phẩm</p></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => openEdit(pallet)}>Sửa</Button><Button variant="outline" size="sm" asChild><Link href={`/admin/inventory/pallets/${pallet.id}`}>Chi tiết</Link></Button></div></TableCell></TableRow>; })}</TableBody></Table></Card>}

    {!loading && !loadError && totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredPallets.length} itemsPerPage={ITEMS_PER_PAGE} />}

    <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{editing ? `Cập nhật ${editing.code}` : "Tạo pallet mới"}</DialogTitle></DialogHeader><div className="space-y-5 py-2">
      {!editing && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="pallet-code">Mã pallet *</Label><Input id="pallet-code" autoFocus placeholder="PL-HCM-001" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className="font-mono" /></div><div className="space-y-2"><Label>Kho *</Label><Select value={form.warehouseId} onValueChange={(value) => setForm({ ...form, warehouseId: value })}><SelectTrigger><SelectValue placeholder="Chọn kho" /></SelectTrigger><SelectContent>{warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</SelectItem>)}</SelectContent></Select></div></div>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="pallet-location">Vị trí pallet</Label><Input id="pallet-location" placeholder="Kệ A1-01" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></div>{editing && <div className="space-y-2"><Label>Trạng thái</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Đang dùng</SelectItem><SelectItem value="EMPTY">Trống</SelectItem><SelectItem value="LOCKED">Đang khóa</SelectItem></SelectContent></Select></div>}</div>
      <div className="space-y-2"><Label htmlFor="pallet-notes">Ghi chú vận hành</Label><Input id="pallet-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Gần cửa nhập, ưu tiên hàng dễ vỡ..." /></div>
      {!editing && <div className="flex gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground"><Clipboard className="h-4 w-4 shrink-0 text-primary" /><p>Sau khi tạo, mở trang chi tiết để thêm thùng và sắp xếp tầng.</p></div>}
    </div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button><Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu</> : editing ? "Lưu thay đổi" : "Tạo pallet"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
