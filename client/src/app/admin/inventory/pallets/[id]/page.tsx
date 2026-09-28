"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import BoxLabelDialog from "@/components/admin/BoxLabelDialog";
import { PalletStack } from "@/components/admin/PalletVisual";
import dynamic from "next/dynamic";
import { History, Weight, Box, ScanLine } from "lucide-react";

const PalletCanvas3D = dynamic(() => import("@/components/admin/PalletCanvas3D"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />,
});
const PalletTransferScene3D = dynamic(() => import("@/components/admin/PalletTransferScene3D"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-2xl" />,
});
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryApi } from "@/lib/inventoryApi";
import { getWarehouseRegion, regionBadgeClass } from "@/lib/warehouseRegion";
import { ArrowLeft, Boxes, Check, ChevronDown, ChevronRight, ClipboardList, Copy, Eye, Layers, Loader2, MapPin, Minus, Package, PackageOpen, Pencil, Plus, Printer, RefreshCw, RotateCcw, Search, Trash2, Truck, Warehouse as WarehouseIcon, X } from "lucide-react";
import { toast } from "sonner";

interface PalletBox {
  id: string;
  boxCode: string;
  level: number;
  slotIndex?: number | null;
  variantId?: string | null;
  quantity: number;
  notes?: string | null;
  tareWeight?: number | null;
  netWeight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  barcode?: string | null;
  poNumber?: string | null;
  exportPurpose?: string | null;
  exportTicketCode?: string | null;
  sealedBy?: string | null;
  sealedAt?: string | null;
  variant?: { id: string; sku: string; product?: { id: string; name: string; images?: Array<{ url: string }> } } | null;
}
interface PalletStats {
  boxCount: number;
  totalWeight: number;
  weightPercent: number;
  totalVolume: number;
  volumePercent: number;
  levelsUsed: number;
  maxLevels: number;
  skuCount: number;
}
interface PalletHistoryItem {
  id: string;
  action: string;
  detail?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}
interface PalletDetail {
  id: string;
  code: string;
  location?: string;
  status: string;
  maxLevels: number;
  maxWeight?: number | null;
  maxVolume?: number | null;
  notes?: string | null;
  warehouse?: { id: string; name: string; code: string };
  boxes: PalletBox[];
  stats?: PalletStats;
}
interface VariantSearchResult { variantId: string; sku: string; productName: string; imageUrl?: string; stock?: number; }

import {
  PALLET_STATUS_STYLE as STATUS_STYLE,
  PALLET_STATUS_LABEL as STATUS_LABEL,
} from "@/lib/inventoryStatus";

function DetailSkeleton() {
  return <div className="space-y-6"><Skeleton className="h-5 w-56" /><Card className="gap-0 p-6"><div className="flex gap-4"><Skeleton className="h-14 w-14 rounded-2xl" /><div className="flex-1 space-y-3"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-72" /></div></div></Card><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Card key={index} className="gap-3 p-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-full" /></Card>)}</div><Skeleton className="h-11 w-80" /><Skeleton className="h-[420px] w-full rounded-2xl" /></div>;
}
const HISTORY_ACTION_LABELS: Record<string, string> = {
  PALLET_BOX_CREATE: "Thêm thùng vào pallet",
  PALLET_BOX_DELETE: "Xóa thùng khỏi pallet",
  PALLET_BOX_TRANSFER: "Di dời thùng sang pallet khác",
};
function historyActionLabel(action: string) {
  return HISTORY_ACTION_LABELS[action] || action;
}
function StatCard({ icon: Icon, label, value, helper, tone }: { icon: typeof Layers; label: string; value: string | number; helper: string; tone: string }) {
  return <Card className="gap-0 p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-[11px] text-muted-foreground">{helper}</p></Card>;
}

export default function PalletDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [pallet, setPallet] = useState<PalletDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBox, setEditingBox] = useState<PalletBox | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchingVariants, setSearchingVariants] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<VariantSearchResult[]>([]);
  const [manifestSearch, setManifestSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [labelBox, setLabelBox] = useState<PalletBox | null>(null);
  const [deleteBox, setDeleteBox] = useState<PalletBox | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [transferBox, setTransferBox] = useState<PalletBox | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [destPreview, setDestPreview] = useState<PalletDetail | null>(null);
  const [destLoading, setDestLoading] = useState(false);
  const [palletOptions, setPalletOptions] = useState<Array<{ id: string; code: string; maxLevels: number; status: string }>>([]);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferLevel, setTransferLevel] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({ boxCode: "", level: 1, variantId: "", variantLabel: "", variantName: "", variantImage: "", quantity: 0, notes: "", tareWeight: "", netWeight: "", length: "", width: "", height: "", volume: "", barcode: "", poNumber: "", exportPurpose: "", exportTicketCode: "", sealedBy: "" });
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [view3d, setView3d] = useState(false);
  const [viewPreset, setViewPreset] = useState<"perspective" | "front" | "top">("perspective");
  const [history, setHistory] = useState<PalletHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const loadPallet = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const response: any = await inventoryApi.getPallet(id);
      const data = response?.data ?? response;
      const boxes: PalletBox[] = data?.boxes ?? [];
      const configuredLevels = Number(data?.maxLevels);
      const validLevels = boxes.map((box) => Number(box.level)).filter((level) => Number.isInteger(level) && level >= 1);
      const highestLevel = Math.max(1, ...validLevels);
      const maxLevels = Math.max(Number.isInteger(configuredLevels) && configuredLevels >= 1 ? configuredLevels : 1, highestLevel);
      setPallet({ ...data, boxes, maxLevels });
      inventoryApi.getPalletHistory(id, 20).then((res: any) => {
        const list = res?.data ?? res ?? [];
        setHistory(Array.isArray(list) ? list : []);
      }).catch(() => setHistory([]));
    } catch { setLoadError(true); toast.error("Không tải được pallet"); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { if (id) loadPallet(); }, [id, loadPallet]);

  useEffect(() => {
    if (searchInput.trim().length < 2 || form.variantId) { setSearchResults([]); setSearchingVariants(false); return; }
    let active = true;
    setSearchingVariants(true);
    const timer = window.setTimeout(async () => {
      try { const response: any = await inventoryApi.searchVariants(searchInput.trim()); if (active) setSearchResults(response?.data ?? response ?? []); }
      catch { if (active) setSearchResults([]); }
      finally { if (active) setSearchingVariants(false); }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [searchInput, form.variantId]);

  const filteredBoxes = useMemo(() => {
    if (!pallet) return [];
    const keyword = manifestSearch.trim().toLowerCase();
    return pallet.boxes.filter((box) => (!levelFilter || box.level === Number(levelFilter)) && (!keyword || `${box.boxCode} ${box.variant?.sku || ""} ${box.variant?.product?.name || ""} ${box.notes || ""}`.toLowerCase().includes(keyword)));
  }, [pallet, manifestSearch, levelFilter]);

  const emptyBoxForm = (level: number) => ({ boxCode: "", level, variantId: "", variantLabel: "", variantName: "", variantImage: "", quantity: 0, notes: "", tareWeight: "", netWeight: "", length: "", width: "", height: "", volume: "", barcode: "", poNumber: "", exportPurpose: "", exportTicketCode: "", sealedBy: "" });
  const numOrNull = (v: string) => (v === "" ? null : Number(v));
  const hasAdvancedData = (box: PalletBox) => [box.tareWeight, box.netWeight, box.length, box.width, box.height, box.volume, box.barcode, box.poNumber, box.exportPurpose, box.exportTicketCode, box.sealedBy].some((value) => value !== null && value !== undefined && value !== "");
  const nextFormWithDimension = (field: "length" | "width" | "height", value: string) => {
    const next = { ...form, [field]: value };
    const l = Number(next.length);
    const w = Number(next.width);
    const h = Number(next.height);
    if (next.length === "" || next.width === "" || next.height === "") return { ...next, volume: "" };
    if (Number.isFinite(l) && Number.isFinite(w) && Number.isFinite(h) && l > 0 && w > 0 && h > 0) return { ...next, volume: ((l * w * h) / 1_000_000_000).toFixed(6) };
    return next;
  };
  
  const openAddBox = (level: number) => { setEditingBox(null); setForm(emptyBoxForm(level)); setSearchInput(""); setSearchResults([]); setSearchOpen(false); setShowAdvanced(false); setDialogOpen(true); };
  const openEditBox = (box: PalletBox) => {
    setEditingBox(box);
    setForm({
      ...emptyBoxForm(box.level),
      boxCode: box.boxCode,
      variantId: box.variantId || "",
      variantLabel: box.variant?.sku || "",
      variantName: box.variant?.product?.name || "",
      variantImage: box.variant?.product?.images?.[0]?.url || "",
      quantity: box.quantity,
      notes: box.notes || "",
      tareWeight: box.tareWeight != null ? String(box.tareWeight) : "",
      netWeight: box.netWeight != null ? String(box.netWeight) : "",
      length: box.length != null ? String(box.length) : "",
      width: box.width != null ? String(box.width) : "",
      height: box.height != null ? String(box.height) : "",
      volume: box.volume != null ? String(box.volume) : "",
      barcode: box.barcode || "",
      poNumber: box.poNumber || "",
      exportPurpose: box.exportPurpose || "",
      exportTicketCode: box.exportTicketCode || "",
      sealedBy: box.sealedBy || "",
    });
    setShowAdvanced(hasAdvancedData(box));
    setSearchInput(""); setSearchResults([]); setSearchOpen(false); setDialogOpen(true);
  };
  const boxDetailPayload = () => ({
    tareWeight: numOrNull(form.tareWeight),
    netWeight: numOrNull(form.netWeight),
    length: numOrNull(form.length),
    width: numOrNull(form.width),
    height: numOrNull(form.height),
    volume: numOrNull(form.volume),
    barcode: form.barcode.trim() || null,
    poNumber: form.poNumber.trim() || null,
    exportPurpose: form.exportPurpose.trim() || null,
    exportTicketCode: form.exportTicketCode.trim() || null,
    sealedBy: form.sealedBy.trim() || null,
  });
  const handleSaveBox = async () => {
    if (!pallet) return;
    if (form.level < 1 || form.level > pallet.maxLevels) return toast.error("Tầng không hợp lệ");
    if (!Number.isInteger(form.quantity) || form.quantity < 0) return toast.error("Số lượng phải là số nguyên từ 0 trở lên");
    const invalidMeasurement = [form.tareWeight, form.netWeight, form.length, form.width, form.height, form.volume].some((value) => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0));
    if (invalidMeasurement) return toast.error("Thông số cân nặng/kích thước phải là số từ 0 trở lên");
    try {
      setSaving(true);
      if (editingBox) { await inventoryApi.updatePalletBox(id, editingBox.id, { level: form.level, quantity: form.quantity, notes: form.notes.trim() || null, variantId: form.variantId || null, ...boxDetailPayload() }); toast.success("Đã cập nhật thùng"); }
      else { await inventoryApi.createPalletBox(id, { boxCode: form.boxCode.trim() || undefined, level: form.level, variantId: form.variantId || undefined, quantity: form.quantity, notes: form.notes.trim() || undefined, ...boxDetailPayload() }); toast.success("Đã thêm thùng vào pallet"); }
      setDialogOpen(false); await loadPallet();
    } catch (error: any) { toast.error(error?.data?.message || error?.message || "Không lưu được thùng"); }
    finally { setSaving(false); }
  };
  const targetMaxLevels =
    destPreview?.maxLevels ?? palletOptions.find((p) => p.id === transferTarget)?.maxLevels ?? 4;
  const openTransferBox = async (box: PalletBox) => {
    setTransferBox(box);
    setTransferLevel(1);
    setTransferTarget("");
    setDestPreview(null);
    setDestLoading(false);
    try {
      const res: any = await inventoryApi.getPallets(pallet?.warehouse?.id);
      const list = res?.data ?? res ?? [];
      setPalletOptions(
        (Array.isArray(list) ? list : [])
          .filter((p: any) => p.id !== id)
          .map((p: any) => ({ id: p.id, code: p.code, maxLevels: p.maxLevels ?? 4, status: p.status })),
      );
    } catch {
      setPalletOptions([]);
    }
    setTransferTarget("");
  };
  const handleTransferBox = async () => {
    if (!transferBox || !transferTarget) return toast.error("Chọn pallet đích");
    try {
      setTransferring(true);
      await inventoryApi.transferPalletBox({ boxId: transferBox.id, toPalletId: transferTarget, targetLevel: transferLevel });
      toast.success(`Đã di dời ${transferBox.boxCode} sang pallet mới`);
      setTransferBox(null);
      setSelectedBoxId(null);
      await loadPallet();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || "Không di dời được thùng");
    } finally {
      setTransferring(false);
    }
  };
  const handleDeleteBox = async () => {
    if (!deleteBox) return;
    try { setDeleting(true); await inventoryApi.deletePalletBox(id, deleteBox.id); toast.success(`Đã xóa thùng ${deleteBox.boxCode}`); setDeleteBox(null); await loadPallet(); }
    catch (error: any) { toast.error(error?.data?.message || error?.message || "Không xóa được thùng"); }
    finally { setDeleting(false); }
  };
  const handleMoveBox = async (boxId: string, toLevel: number) => {
    const box = pallet?.boxes.find((item) => item.id === boxId);
    if (!box || !pallet || box.level === toLevel) return;
    if (toLevel < 1 || toLevel > pallet.maxLevels) return toast.error("Tầng đích không hợp lệ");
    try { await inventoryApi.updatePalletBox(id, boxId, { level: toLevel }); toast.success(`Đã chuyển ${box.boxCode} sang tầng ${toLevel}`); await loadPallet(); }
    catch (error: any) { toast.error(error?.data?.message || error?.message || "Không chuyển được thùng"); await loadPallet(); }
  };
  const copyCode = async () => {
    if (!pallet) return;
    try { await navigator.clipboard.writeText(pallet.code); setCopied(true); toast.success("Đã sao chép mã pallet"); window.setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Không thể sao chép mã pallet"); }
  };

  if (loading) return <DetailSkeleton />;
  if (!pallet || loadError) return <div className="space-y-6"><Button variant="ghost" size="sm" asChild><Link href="/admin/inventory/pallets"><ArrowLeft className="h-4 w-4" />Quay lại danh sách</Link></Button><Card className="gap-0 py-0"><AdminEmptyState icon={Layers} title={loadError ? "Không tải được pallet" : "Không tìm thấy pallet"} description={loadError ? "Đường truyền có thể đang gián đoạn." : "Pallet không tồn tại hoặc đã bị xóa."} action={loadError ? <Button variant="outline" onClick={loadPallet}><RotateCcw className="h-4 w-4" />Thử lại</Button> : undefined} /></Card></div>;

  const region = getWarehouseRegion(pallet.warehouse);
  const totalQty = pallet.boxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
  const occupiedLevels = new Set(pallet.boxes.map((box) => Number(box.level)).filter((level) => Number.isInteger(level) && level >= 1)).size;
  const fillRate = Math.min(100, Math.round(occupiedLevels / pallet.maxLevels * 100));
  const skuCount = new Set(pallet.boxes.map((box) => box.variant?.sku).filter(Boolean)).size;
  const hasManifestFilters = Boolean(manifestSearch || levelFilter);

  return <div className="space-y-6">
    <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb"><Link href="/admin/inventory" className="hover:text-foreground">Quản lý kho</Link><ChevronRight className="h-3.5 w-3.5" /><Link href="/admin/inventory/pallets" className="hover:text-foreground">Pallet</Link><ChevronRight className="h-3.5 w-3.5" /><span className="font-mono font-semibold text-foreground">{pallet.code}</span></nav>

    <Card className="gap-0 overflow-hidden py-0 shadow-sm"><div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-primary" /><CardContent className="p-5 sm:p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Layers className="h-7 w-7" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="truncate font-mono text-2xl font-black sm:text-3xl">{pallet.code}</h1><Button variant="ghost" size="icon-sm" onClick={copyCode} aria-label="Sao chép mã pallet">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</Button></div><div className="mt-2 flex flex-wrap gap-1.5"><Badge variant="outline" className={STATUS_STYLE[pallet.status] ?? STATUS_STYLE.ACTIVE}>{STATUS_LABEL[pallet.status] ?? pallet.status}</Badge><Badge variant="outline" className={regionBadgeClass(region.tone)}>{region.label}</Badge></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><WarehouseIcon className="h-3.5 w-3.5" />{pallet.warehouse?.name || "Chưa gán kho"} ({pallet.warehouse?.code || "-"})</span><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><strong className="font-mono text-foreground">{pallet.location || "Chưa có vị trí"}</strong></span></div>{pallet.notes && <p className="mt-2 text-xs text-muted-foreground">{pallet.notes}</p>}</div></div><div className="flex gap-2"><Button variant="outline" onClick={loadPallet}><RefreshCw className="h-4 w-4" />Làm mới</Button><Button onClick={() => openAddBox(1)}><Plus className="h-4 w-4" />Thêm thùng</Button></div></div></CardContent></Card>

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard icon={Boxes} label="Tổng số thùng" value={pallet.stats?.boxCount ?? pallet.boxes.length} helper="Thùng hiện có trên pallet" tone="bg-primary/10 text-primary" />
      <StatCard icon={Weight} label={`Tải trọng (${pallet.stats?.totalWeight ?? "?"} kg)`} value={`${pallet.stats?.totalWeight ?? "?"} / ${pallet.maxWeight ?? 500} kg`} helper={pallet.stats ? `${pallet.stats.weightPercent}% tải trọng cho phép` : "Tổng khối lượng đang lưu"} tone="bg-orange-500/10 text-orange-600" />
      <StatCard icon={Package} label="Tổng sản phẩm" value={totalQty} helper={`${pallet.stats?.skuCount ?? skuCount} SKU điện máy`} tone="bg-sky-500/10 text-sky-600" />
      <StatCard icon={Box} label={`Thể tích (${pallet.stats?.volumePercent ?? "?"}%)`} value={`${pallet.stats?.totalVolume ?? "?"} m³`} helper={`Trống ${pallet.maxVolume != null && pallet.stats ? Math.max(0, Math.round((pallet.maxVolume - pallet.stats.totalVolume) * 100) / 100) : "?"} m³`} tone="bg-violet-500/10 text-violet-600" />
    </div>

    <Tabs defaultValue="visual" className="gap-4"><TabsList className="h-11 w-full justify-start overflow-x-auto rounded-xl sm:w-fit"><TabsTrigger value="visual" className="h-9 px-4"><Eye className="h-4 w-4" />Mô phỏng trực quan</TabsTrigger><TabsTrigger value="manifest" className="h-9 px-4"><ClipboardList className="h-4 w-4" />Danh sách thùng<Badge variant="secondary" className="ml-1 h-5 px-1.5">{pallet.boxes.length}</Badge></TabsTrigger></TabsList>
      <TabsContent value="visual" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border bg-card p-1">
            <Button variant={!view3d ? "secondary" : "ghost"} size="sm" className="h-8 rounded-lg" onClick={() => setView3d(false)}>2D Mặt phẳng</Button>
            <Button variant={view3d ? "secondary" : "ghost"} size="sm" className="h-8 rounded-lg" onClick={() => setView3d(true)}>3D Không gian</Button>
          </div>
          {view3d && (
            <div className="flex rounded-xl border bg-card p-1">
              {(["perspective", "front", "top"] as const).map((v) => (
                <Button key={v} variant={viewPreset === v ? "secondary" : "ghost"} size="sm" className="h-8 rounded-lg" onClick={() => setViewPreset(v)}>
                  {v === "perspective" ? "Phối cảnh" : v === "front" ? "Chính diện" : "Từ trên (Top)"}
                </Button>
              ))}
            </div>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">Kéo chuột để xoay 3D 360° • Bấm thùng để xem chi tiết</span>
        </div>

        {/* Dải chọn nhanh thùng BX-01.. */}
        {pallet.boxes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Chọn thùng:</span>
            {[...pallet.boxes]
              .sort((a, b) => a.boxCode.localeCompare(b.boxCode))
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={`${b.boxCode} • Tầng ${b.level}`}
                  onClick={() => setSelectedBoxId(selectedBoxId === b.id ? null : b.id)}
                  className={`rounded-lg border px-2 py-1 font-mono text-[11px] font-bold transition-colors cursor-pointer ${selectedBoxId === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}
                >
                  {(b.boxCode.split("-").pop() || b.boxCode) + `·T${b.level}`}
                </button>
              ))}
          </div>
        )}

        {/* Panel thùng đang chọn */}
        {(() => {
          const box = pallet.boxes.find((b) => b.id === selectedBoxId);
          if (!box) return null;
          const gross = (box.netWeight ?? 0) + (box.tareWeight ?? 0);
          return (
            <Card className="gap-0 border-primary/30 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {box.boxCode} • Tầng {box.level}
                    {box.slotIndex != null ? ` • Ô ${box.slotIndex}` : ""}
                  </p>
                  <h3 className="mt-1 text-base font-bold">
                    {box.variant?.product?.name || "Thùng trống"}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {box.barcode ? `Barcode: ${box.barcode}` : `SKU: ${box.variant?.sku || "—"}`}
                    {box.poNumber ? ` • PO: ${box.poNumber}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>SL: <strong className="text-foreground">{box.quantity}</strong></span>
                    {box.netWeight != null && <span>Tịnh: <strong className="text-foreground">{box.netWeight} kg</strong></span>}
                    {box.tareWeight != null && <span>Bì: <strong className="text-foreground">{box.tareWeight} kg</strong></span>}
                    {(box.length || box.width || box.height) && (
                      <span>Kích thước: <strong className="text-foreground">{box.length || "?"} × {box.width || "?"} × {box.height || "?"} mm</strong></span>
                    )}
                    {box.volume != null && <span>Thể tích: <strong className="text-foreground">{box.volume} m³</strong></span>}
                    {gross > 0 && <span>Tổng: <strong className="text-foreground">{gross} kg</strong></span>}
                  </div>
                  {(box.exportPurpose || box.exportTicketCode || box.sealedBy) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {box.exportPurpose && <span>Mục đích: <strong className="text-foreground">{box.exportPurpose}</strong></span>}
                      {box.exportTicketCode && <span>Phiếu xuất: <strong className="font-mono text-foreground">{box.exportTicketCode}</strong></span>}
                      {box.sealedBy && <span>Niêm phong: <strong className="text-foreground">{box.sealedBy}</strong></span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setLabelBox(box)} aria-label="In tem QR"><Printer className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEditBox(box)} aria-label="Chỉnh sửa"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setSelectedBoxId(null)} aria-label="Đóng"><X className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button size="sm" onClick={() => openTransferBox(box)} className="mt-3 w-full gap-2 rounded-xl sm:w-auto">
                <Truck className="h-4 w-4" />
                Di dời thùng này sang pallet khác
              </Button>
            </Card>
          );
        })()}

        {view3d ? (
          <PalletCanvas3D
            boxes={pallet.boxes.map((b) => ({ id: b.id, boxCode: b.boxCode, level: b.level, slotIndex: b.slotIndex, length: b.length, width: b.width, height: b.height, sealedBy: b.sealedBy }))}
            maxLevels={pallet.maxLevels}
            selectedBoxId={selectedBoxId}
            onSelectBox={setSelectedBoxId}
            view={viewPreset}
            autoRotate={!selectedBoxId}
          />
        ) : (
        <PalletStack boxes={pallet.boxes.map((box) => ({ id: box.id, boxCode: box.boxCode, level: box.level, quantity: box.quantity, sku: box.variant?.sku, productName: box.variant?.product?.name, imageUrl: box.variant?.product?.images?.[0]?.url, notes: box.notes || undefined }))} maxLevels={pallet.maxLevels} onAddBox={openAddBox} onMoveBox={handleMoveBox} renderActions={(box) => {
        const fullBox = pallet.boxes.find((item) => item.id === box.id);
        if (!fullBox) return null;
        return <><button type="button" onClick={() => setLabelBox(fullBox)} className="grid h-7 w-7 place-items-center rounded-full border bg-background shadow-md hover:bg-muted" aria-label={`In nhãn ${fullBox.boxCode}`}><Printer className="h-3.5 w-3.5" /></button><button type="button" onClick={() => openEditBox(fullBox)} className="grid h-7 w-7 place-items-center rounded-full border bg-background shadow-md hover:bg-muted" aria-label={`Sửa ${fullBox.boxCode}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDeleteBox(fullBox)} className="grid h-7 w-7 place-items-center rounded-full border border-red-200 bg-background text-red-600 shadow-md hover:bg-red-50" aria-label={`Xóa ${fullBox.boxCode}`}><Trash2 className="h-3.5 w-3.5" /></button></>;
      }} />)}</TabsContent>
      <TabsContent value="manifest"><Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="text-base">Danh sách thùng hàng</CardTitle><p className="mt-1 text-xs text-muted-foreground">Đối soát mã thùng, SKU và vị trí tầng.</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={manifestSearch} onChange={(event) => setManifestSearch(event.target.value)} placeholder="Tìm mã thùng, SKU..." className="pl-9" /></div><Select value={levelFilter || "all"} onValueChange={(value) => setLevelFilter(value === "all" ? "" : value)}><SelectTrigger className="sm:w-36"><SelectValue placeholder="Tất cả tầng" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả tầng</SelectItem>{Array.from({ length: pallet.maxLevels }, (_, index) => index + 1).map((level) => <SelectItem key={level} value={String(level)}>Tầng {level}</SelectItem>)}</SelectContent></Select></div></div></CardHeader>
        {filteredBoxes.length === 0 ? <AdminEmptyState icon={PackageOpen} title={hasManifestFilters ? "Không tìm thấy thùng phù hợp" : "Pallet chưa có thùng"} description={hasManifestFilters ? "Thử thay đổi từ khóa hoặc bộ lọc tầng." : "Thêm thùng đầu tiên để bắt đầu xếp hàng."} action={hasManifestFilters ? <Button variant="outline" onClick={() => { setManifestSearch(""); setLevelFilter(""); }}>Đặt lại bộ lọc</Button> : <Button onClick={() => openAddBox(1)}><Plus className="h-4 w-4" />Thêm thùng</Button>} /> :
          <Table><TableHeader><TableRow><TableHead>Mã thùng</TableHead><TableHead>Tầng</TableHead><TableHead>Mặt hàng</TableHead><TableHead>Số lượng</TableHead><TableHead>Ghi chú</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader><TableBody>{filteredBoxes.map((box) => <TableRow key={box.id}><TableCell><code className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{box.boxCode}</code></TableCell><TableCell><Badge variant="outline">Tầng {box.level}</Badge></TableCell><TableCell><div className="flex min-w-52 items-center gap-3">{box.variant?.product?.images?.[0]?.url ? <img src={box.variant.product.images[0].url} alt="" className="h-10 w-10 rounded-lg border bg-white object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg border bg-muted"><Package className="h-4 w-4" /></span>}<div className="min-w-0"><p className="max-w-56 truncate font-medium">{box.variant?.product?.name || "Thùng trống"}</p><p className="font-mono text-xs text-muted-foreground">{box.variant?.sku || "Chưa gán SKU"}</p></div></div></TableCell><TableCell className="font-bold">{box.quantity}</TableCell><TableCell className="max-w-48 truncate text-xs text-muted-foreground">{box.notes || "—"}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setLabelBox(box)} aria-label={`In nhãn ${box.boxCode}`}><Printer className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => openTransferBox(box)} aria-label={`Di dời ${box.boxCode}`}><Truck className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => openEditBox(box)} aria-label={`Sửa ${box.boxCode}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => setDeleteBox(box)} className="text-red-600 hover:bg-red-50" aria-label={`Xóa ${box.boxCode}`}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}
      </Card></TabsContent>
    </Tabs>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-0 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold"><History className="h-4 w-4 text-primary" />Lịch sử thao tác gần nhất</h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setHistoryOpen((v) => !v)}>
            {historyOpen ? "Thu gọn" : `Xem tất cả (${history.length})`}
          </Button>
        </div>
        {history.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Chưa ghi nhận thao tác nào trên pallet này.</p>
        ) : (
          <ul className="space-y-3">
            {(historyOpen ? history : history.slice(0, 4)).map((h) => (
              <li key={h.id} className="flex gap-2.5 text-xs">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${String(h.action).includes("DELETE") ? "bg-red-500" : String(h.action).includes("TRANSFER") ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{historyActionLabel(h.action)}</p>
                  <p className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("vi-VN")} {h.user?.name ? `• bởi ${h.user.name}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="gap-0 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><ScanLine className="h-4 w-4 text-primary" />Thông tin kiểm duyệt</h3>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Trạng thái QC</dt><dd className="font-semibold">{(pallet as any).qcStatus || "Chưa kiểm định"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Khu vực kho</dt><dd className="font-semibold">{pallet.warehouse?.name || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Mã pallet</dt><dd className="font-mono font-semibold">{pallet.code}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Vị trí</dt><dd className="font-semibold">{pallet.location || "—"}</dd></div>
          {(pallet as any).qcNote && <p className="rounded-lg bg-muted p-2.5 text-muted-foreground">{(pallet as any).qcNote}</p>}
        </dl>
      </Card>
    </div>

    {labelBox && <BoxLabelDialog open onOpenChange={(open) => !open && setLabelBox(null)} boxCode={labelBox.boxCode} sku={labelBox.variant?.sku} productName={labelBox.variant?.product?.name} quantity={labelBox.quantity} warehouseName={pallet.warehouse?.name} />}

    <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editingBox ? `Cập nhật ${editingBox.boxCode}` : "Thêm thùng vào pallet"}</DialogTitle></DialogHeader><div className="space-y-5 py-2">
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="box-code">Mã thùng</Label><Input id="box-code" value={form.boxCode} disabled={Boolean(editingBox)} onChange={(event) => setForm({ ...form, boxCode: event.target.value.toUpperCase() })} placeholder={`${pallet.code}-T${form.level}-B..`} className="font-mono" /><p className="text-[11px] text-muted-foreground">Bỏ trống để hệ thống tự sinh mã.</p></div><div className="space-y-2"><Label>Tầng *</Label><Select value={String(form.level)} onValueChange={(value) => setForm({ ...form, level: Number(value) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: pallet.maxLevels }, (_, index) => index + 1).map((level) => <SelectItem key={level} value={String(level)}>Tầng {level}{level === 1 ? " · sát pallet" : ""}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="space-y-2"><Label>Mặt hàng trong thùng</Label>{form.variantId ? <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">{form.variantImage ? <img src={form.variantImage} alt="" className="h-11 w-11 rounded-lg border bg-white object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-lg border bg-background"><Package className="h-4 w-4" /></span>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{form.variantName || "Sản phẩm đã chọn"}</p><p className="font-mono text-xs text-muted-foreground">{form.variantLabel}</p></div><Button variant="ghost" size="icon-sm" onClick={() => setForm({ ...form, variantId: "", variantLabel: "", variantName: "", variantImage: "" })} aria-label="Bỏ chọn sản phẩm"><X className="h-4 w-4" /></Button></div> : <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input role="combobox" aria-expanded={searchOpen && (searchResults.length > 0 || searchInput.trim().length >= 2 && !searchingVariants)} aria-controls="variant-search-results" aria-autocomplete="list" value={searchInput} onFocus={() => setSearchOpen(true)} onChange={(event) => { setSearchInput(event.target.value); setSearchOpen(true); }} onBlur={(event) => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) setSearchOpen(false); }} placeholder="Tìm theo SKU hoặc tên sản phẩm..." className="pl-9 pr-9" />{searchingVariants && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />}{searchOpen && (searchResults.length > 0 || searchInput.trim().length >= 2 && !searchingVariants) && <div id="variant-search-results" role="listbox" onMouseDown={(event) => event.preventDefault()} className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-xl">{searchResults.length > 0 ? searchResults.map((variant) => <button key={variant.variantId} type="button" role="option" aria-selected="false" onClick={() => { setForm({ ...form, variantId: variant.variantId, variantLabel: variant.sku, variantName: variant.productName, variantImage: variant.imageUrl || "" }); setSearchInput(""); setSearchResults([]); setSearchOpen(false); }} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted">{variant.imageUrl ? <img src={variant.imageUrl} alt="" className="h-10 w-10 rounded-lg border bg-white object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-lg border bg-muted"><Package className="h-4 w-4" /></span>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{variant.productName}</span><span className="block font-mono text-xs text-muted-foreground">{variant.sku}</span></span>{typeof variant.stock === "number" && <Badge variant="outline">Tồn {variant.stock}</Badge>}</button>) : <p className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy mặt hàng phù hợp</p>}</div>}</div>}<p className="text-[11px] text-muted-foreground">Có thể bỏ trống để tạo thùng rỗng.</p></div>
      <div className="rounded-2xl border bg-muted/20">
        <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <div>
            <p className="text-sm font-semibold">Thông số nâng cao <span className="font-normal text-muted-foreground">(không bắt buộc)</span></p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Có thể bỏ trống nếu chưa biết cân nặng, kích thước, barcode, PO hoặc phiếu xuất.</p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        </button>
        {showAdvanced && <div className="space-y-4 border-t px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Mã vạch thùng</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Nếu có" className="font-mono" /></div>
            <div className="space-y-2"><Label>Mã PO</Label><Input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="Nếu có" className="font-mono" /></div>
            <div className="space-y-2"><Label>Người niêm phong</Label><Input value={form.sealedBy} onChange={(e) => setForm({ ...form, sealedBy: e.target.value })} placeholder="Nếu đã QC/niêm phong" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2"><Label>Bì (kg)</Label><Input type="number" min={0} step="0.1" value={form.tareWeight} onChange={(e) => setForm({ ...form, tareWeight: e.target.value })} placeholder="0.0" /></div>
            <div className="space-y-2"><Label>Tịnh (kg)</Label><Input type="number" min={0} step="0.1" value={form.netWeight} onChange={(e) => setForm({ ...form, netWeight: e.target.value })} placeholder="0.0" /></div>
            <div className="space-y-2"><Label>D×R×C (mm)</Label><div className="flex gap-1"><Input type="number" min={0} value={form.length} onChange={(e) => setForm(nextFormWithDimension("length", e.target.value))} placeholder="D" /><Input type="number" min={0} value={form.width} onChange={(e) => setForm(nextFormWithDimension("width", e.target.value))} placeholder="R" /><Input type="number" min={0} value={form.height} onChange={(e) => setForm(nextFormWithDimension("height", e.target.value))} placeholder="C" /></div><p className="text-[11px] text-muted-foreground">Nhập đủ 3 số để tự tính thể tích.</p></div>
            <div className="space-y-2"><Label>Thể tích (m³)</Label><Input type="number" min={0} step="0.000001" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} placeholder="Tự tính nếu có D×R×C" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Mục đích xuất</Label><Input value={form.exportPurpose} onChange={(e) => setForm({ ...form, exportPurpose: e.target.value })} placeholder="VD: Flash Sale 9.9" /></div>
            <div className="space-y-2"><Label>Phiếu xuất liên kết</Label><Input value={form.exportTicketCode} onChange={(e) => setForm({ ...form, exportTicketCode: e.target.value })} placeholder="#XK-... nếu có" className="font-mono" /></div>
          </div>
        </div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Số lượng</Label><div className="flex"><Button type="button" variant="outline" size="icon" className="rounded-r-none" onClick={() => setForm({ ...form, quantity: Math.max(0, form.quantity - 1) })} aria-label="Giảm số lượng"><Minus className="h-4 w-4" /></Button><Input type="number" min={0} step={1} value={form.quantity} onChange={(event) => { const value = event.target.valueAsNumber; setForm({ ...form, quantity: Number.isFinite(value) ? Math.max(0, value) : 0 }); }} className="rounded-none border-x-0 text-center font-bold" /><Button type="button" variant="outline" size="icon" className="rounded-l-none" onClick={() => setForm({ ...form, quantity: form.quantity + 1 })} aria-label="Tăng số lượng"><Plus className="h-4 w-4" /></Button></div></div><div className="space-y-2"><Label htmlFor="box-notes">Ghi chú</Label><Input id="box-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Hàng dễ vỡ..." /></div></div>
    </div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Hủy</Button><Button onClick={handleSaveBox} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu</> : editingBox ? "Lưu thay đổi" : "Thêm thùng"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={Boolean(transferBox)} onOpenChange={(open) => { if (!open && !transferring) setTransferBox(null); }}>      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Di dời {transferBox?.boxCode} sang pallet khác</DialogTitle></DialogHeader><div className="space-y-4 py-2">
      <div className="space-y-2"><Label>Pallet đích</Label><Select value={transferTarget}                     onValueChange={(v) => {
                      setTransferTarget(v);
                      setTransferLevel(1);
                      setDestPreview(null);
                      if (v && v !== "none") {
                        setDestLoading(true);
                        inventoryApi.getPallet(v).then((res: any) => {
                          setDestPreview(res?.data ?? res ?? null);
                        }).catch(() => setDestPreview(null)).finally(() => setDestLoading(false));
                      }
                    }}><SelectTrigger><SelectValue placeholder="Chọn pallet đích" /></SelectTrigger><SelectContent>{palletOptions.length === 0 ? <SelectItem value="none" disabled>Không có pallet khác</SelectItem> : palletOptions.map((p) => <SelectItem key={p.id} value={p.id} disabled={p.status === "LOCKED"}>{p.code}{p.status === "LOCKED" ? " (đang khóa)" : ""}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Tầng đích</Label><Select value={String(transferLevel)} onValueChange={(v) => setTransferLevel(Number(v))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: Math.max(1, targetMaxLevels) }, (_, i) => i + 1).map((lv) => <SelectItem key={lv} value={String(lv)}>Tầng {lv}</SelectItem>)}</SelectContent></Select></div>
      {transferTarget && transferTarget !== "none" && (
        <div className="space-y-2">
          <Label>Mô phỏng di dời 3D — kéo thùng cam sang pallet đích</Label>
          {destLoading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : destPreview ? (
            <PalletTransferScene3D
              sourceBoxes={pallet.boxes.map((b) => ({ id: b.id, boxCode: b.boxCode, level: b.level, slotIndex: b.slotIndex, length: b.length, width: b.width, height: b.height, sealedBy: b.sealedBy }))}
              sourceCode={pallet.code}
              destBoxes={(destPreview.boxes || []).map((b: PalletBox) => ({ id: b.id, boxCode: b.boxCode, level: b.level, slotIndex: b.slotIndex, length: b.length, width: b.width, height: b.height, sealedBy: b.sealedBy }))}
              destCode={destPreview.code}
              destMaxLevels={targetMaxLevels}
              dragBoxId={transferBox?.id || null}
              onDrop={(boxId, level) => {
                if (boxId === transferBox?.id) {
                  setTransferLevel(level);
                  toast.success(`Đã ngắm tầng ${level} — bấm "Xác nhận di dời" để hoàn tất`);
                }
              }}
              height={300}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Không tải được pallet đích.</p>
          )}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Hệ thống kiểm tra pallet khóa, tầng hợp lệ và tải trọng trước khi di dời.</p>
    </div><DialogFooter><Button variant="outline" onClick={() => setTransferBox(null)} disabled={transferring}>Hủy</Button><Button onClick={handleTransferBox} disabled={transferring || !transferTarget}>{transferring ? <><Loader2 className="h-4 w-4 animate-spin" />Đang di dời</> : "Xác nhận di dời"}</Button></DialogFooter></DialogContent></Dialog>

    <AlertDialog open={Boolean(deleteBox)} onOpenChange={(open) => { if (!open && !deleting) setDeleteBox(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xóa thùng khỏi pallet?</AlertDialogTitle><AlertDialogDescription>Thùng <strong className="font-mono text-foreground">{deleteBox?.boxCode}</strong>{deleteBox?.quantity ? ` đang chứa ${deleteBox.quantity} sản phẩm` : ""} sẽ bị xóa. Thao tác này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); handleDeleteBox(); }} disabled={deleting} className="bg-destructive text-white hover:bg-destructive/90">{deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Đang xóa</> : <><Trash2 className="h-4 w-4" />Xóa thùng</>}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
