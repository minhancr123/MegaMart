"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Eye, Loader2, Package, Pause, Play, Plus, RefreshCw, Search, Sparkles, StopCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { salesApi, type CampaignVariantSearchResult, type SaleCampaign, type SaleCampaignDetail, type SaleTimingSuggestion, type SuggestedCampaignVariant } from "@/lib/salesApi";
import { toast } from "sonner";
import { formatPrice, getErrorMessage } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

const STATUS_LABELS: Record<string, string> = { DRAFT: "Bản nháp", ACTIVE: "Đang chạy", PAUSED: "Tạm dừng", ENDED: "Đã kết thúc" };

const formatMoney = (value: number) => formatPrice(value, "0 ₫");
const toLocalDateTimeInput = (date: Date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export default function CommercialCampaignsPage() {
  const [items, setItems] = useState<SaleCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CampaignVariantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<CampaignVariantSearchResult[]>([]);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailQuery, setDetailQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<SaleCampaignDetail | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "end" | "delete"; campaign: SaleCampaign } | null>(null);
  const [timingSuggestions, setTimingSuggestions] = useState<SaleTimingSuggestion[]>([]);
  const [suggestionSampleSize, setSuggestionSampleSize] = useState(0);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestedVariants, setSuggestedVariants] = useState<SuggestedCampaignVariant[]>([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [form, setForm] = useState({
    name: "Sale đầu tháng",
    description: "Chiến dịch khuyến mãi thương mại",
    startDate: "",
    endDate: "",
    defaultDiscount: "10",
  });

  const rawDiscount = useMemo(() => Number(form.defaultDiscount), [form.defaultDiscount]);
  const discount = useMemo(() => Math.min(90, Math.max(0, rawDiscount || 0)), [rawDiscount]);
  const selectedIds = useMemo(() => new Set(selectedVariants.map((variant) => variant.id)), [selectedVariants]);
  const visibleSelectedCount = searchResults.filter((variant) => selectedIds.has(variant.id)).length;
  const allVisibleSelected = searchResults.length > 0 && visibleSelectedCount === searchResults.length;
  const conflictCount = selectedVariants.filter((variant) => variant.activeCampaign).length;
  const filteredItems = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesText = !q || item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q);
      return matchesStatus && matchesText;
    });
  }, [campaignSearch, items, statusFilter]);
  const detailItems = useMemo(() => {
    const q = detailQuery.trim().toLowerCase();
    return (selectedCampaign?.items || []).filter((item) => {
      const variant = item.variant;
      return !q || variant?.sku?.toLowerCase().includes(q) || variant?.product?.name?.toLowerCase().includes(q);
    });
  }, [detailQuery, selectedCampaign]);

  const salePrice = (price: number) => Math.max(0, price * (1 - discount / 100));

  const load = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setItems(await salesApi.getCampaigns());
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không tải được chiến dịch bán hàng"));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshVariants = async (query = searchQuery) => {
    const results = await salesApi.searchVariantsForCampaign(query, 30);
    setSearchResults(results);
    return results;
  };

  const loadTimingSuggestions = async () => {
    try {
      setSuggestionsLoading(true);
      const res = await salesApi.getTimingSuggestions();
      setTimingSuggestions(res.suggestions || []);
      setSuggestionSampleSize(res.orderSampleSize || 0);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không tải được gợi ý thời điểm sale"));
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const loadSuggestedVariants = async () => {
    try {
      setSuggestedLoading(true);
      setSuggestedVariants(await salesApi.getSuggestedVariants({ limit: 12, minStock: 10, days: 30, maxSales: 2 }));
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không tải được gợi ý sản phẩm sale"));
    } finally {
      setSuggestedLoading(false);
    }
  };

  useEffect(() => {
    setForm((current) => ({
      ...current,
      startDate: current.startDate || toLocalDateTimeInput(new Date()),
      endDate: current.endDate || toLocalDateTimeInput(new Date(Date.now() + 3 * 86_400_000)),
    }));
    load(true);
    loadTimingSuggestions();
    loadSuggestedVariants();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await salesApi.searchVariantsForCampaign(searchQuery, 30);
        if (!cancelled) setSearchResults(results);
      } catch (err: any) {
        if (!cancelled) toast.error(getErrorMessage(err, "Không tìm được sản phẩm/SKU"));
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const toggleVariant = (variant: CampaignVariantSearchResult) => {
    setSelectedVariants((current) => current.some((item) => item.id === variant.id)
      ? current.filter((item) => item.id !== variant.id)
      : [...current, variant]);
  };

  const toggleVisibleVariants = () => {
    setSelectedVariants((current) => {
      if (allVisibleSelected) return current.filter((item) => !searchResults.some((variant) => variant.id === item.id));
      const merged = new Map(current.map((variant) => [variant.id, variant]));
      searchResults.forEach((variant) => merged.set(variant.id, variant));
      return Array.from(merged.values());
    });
  };

  const addAllSuggestedVariants = () => {
    setSelectedVariants((current) => {
      const merged = new Map(current.map((variant) => [variant.id, variant]));
      suggestedVariants.forEach((variant) => merged.set(variant.id, variant));
      return Array.from(merged.values());
    });
    toast.success("Đã thêm các sản phẩm gợi ý vào chiến dịch");
  };

  const applyTimingSuggestion = (suggestion: SaleTimingSuggestion) => {
    setForm((current) => ({
      ...current,
      name: suggestion.template.name,
      description: suggestion.template.description,
      startDate: toLocalDateTimeInput(new Date(suggestion.template.startDate)),
      endDate: toLocalDateTimeInput(new Date(suggestion.template.endDate)),
      defaultDiscount: String(suggestion.template.defaultDiscount),
    }));
    toast.success("Đã áp dụng gợi ý thời điểm sale");
  };

  const create = async () => {
    if (!form.name.trim()) return toast.error("Nhập tên chiến dịch");
    if (!selectedVariants.length) return toast.error("Vui lòng chọn ít nhất 1 sản phẩm/SKU");
    if (!form.startDate || !form.endDate) return toast.error("Vui lòng chọn ngày bắt đầu và ngày kết thúc");
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return toast.error("Thời gian chiến dịch không hợp lệ");
    if (startDate >= endDate) return toast.error("Ngày bắt đầu phải trước ngày kết thúc");
    if (!Number.isInteger(rawDiscount) || rawDiscount < 1 || rawDiscount > 90) return toast.error("% giảm phải là số nguyên từ 1 đến 90");
    try {
      setSaving(true);
      await salesApi.createCampaign({
        name: form.name,
        description: form.description,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        defaultDiscount: discount,
        variantIds: selectedVariants.map((variant) => variant.id),
      });
      toast.success("Đã tạo chiến dịch bán hàng");
      setSelectedVariants([]);
      await load();
      await refreshVariants();
      await loadSuggestedVariants();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Tạo chiến dịch thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const apply = async (id: string) => {
    try {
      setActionId(id);
      await salesApi.applyCampaign(id);
      toast.success("Đã kích hoạt chiến dịch");
      await load();
      await refreshVariants();
      await loadSuggestedVariants();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Kích hoạt thất bại"));
    } finally {
      setActionId(null);
    }
  };

  const deactivate = async (id: string) => {
    try {
      setActionId(id);
      await salesApi.deactivateCampaign(id);
      toast.success("Đã tạm dừng chiến dịch");
      await load();
      await refreshVariants();
      await loadSuggestedVariants();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Tạm dừng thất bại"));
    } finally {
      setActionId(null);
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailQuery("");
      setSelectedCampaign(null);
      setSelectedCampaign(await salesApi.getCampaign(id));
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không tải được chi tiết chiến dịch"));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmCampaignAction = async () => {
    if (!confirmAction) return;
    try {
      setActionId(confirmAction.campaign.id);
      if (confirmAction.type === "end") {
        await salesApi.endCampaign(confirmAction.campaign.id);
        toast.success("Đã kết thúc chiến dịch");
      } else {
        await salesApi.deleteCampaign(confirmAction.campaign.id);
        toast.success("Đã xóa chiến dịch nháp");
      }
      setConfirmAction(null);
      await load();
      await refreshVariants();
      await loadSuggestedVariants();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Thao tác thất bại"));
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-32 gap-3"><Loader2 className="h-9 w-9 animate-spin text-primary" /><p className="text-sm font-bold text-zinc-500">Đang tải chiến dịch bán hàng...</p></div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Chiến dịch bán hàng"
        description="Lên lịch sale dịp lễ, đầu tháng, cuối tháng hoặc xả kho theo danh sách SKU."
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Gợi ý thời điểm sale tối ưu</CardTitle>
          <p className="text-sm text-zinc-500">Dựa trên {suggestionSampleSize} đơn hàng 60 ngày gần đây và các mốc thương mại/lễ sắp tới.</p>
        </CardHeader>
        <CardContent>
          {suggestionsLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border p-4 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích thời điểm sale...</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {timingSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl border p-4 transition hover:border-primary/50 hover:bg-orange-50/40">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Badge variant={suggestion.type === "DATA_DRIVEN" ? "info" : "secondary"}>{suggestion.badge}</Badge>
                    <span className="text-xs font-semibold text-zinc-500">{new Date(suggestion.template.startDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="font-black text-zinc-900">{suggestion.title}</div>
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-500">{suggestion.reason}</p>
                  <div className="mt-3 rounded-xl bg-white p-3 text-xs text-zinc-600">
                    <div><span className="font-semibold">Thời gian:</span> {new Date(suggestion.template.startDate).toLocaleString("vi-VN")} → {new Date(suggestion.template.endDate).toLocaleString("vi-VN")}</div>
                    <div><span className="font-semibold">Mức giảm:</span> {suggestion.template.defaultDiscount}%</div>
                  </div>
                  <Button type="button" size="sm" className="mt-3 w-full bg-primary hover:bg-primary/90" onClick={() => applyTimingSuggestion(suggestion)}>Áp dụng gợi ý</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Tạo chiến dịch sale nhanh</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2 xl:col-span-2"><Label>Tên chiến dịch</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Ngày bắt đầu</Label><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Ngày kết thúc</Label><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          <div className="grid gap-2"><Label>% giảm mặc định</Label><Input type="number" min={1} max={90} value={form.defaultDiscount} onChange={(e) => setForm({ ...form, defaultDiscount: e.target.value })} /></div>
          <div className="grid gap-2 md:col-span-2 xl:col-span-3"><Label>Mô tả</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div className="space-y-3 md:col-span-2 xl:col-span-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Chọn SKU áp dụng</Label>
              <div className="text-sm font-semibold text-zinc-500">Đã chọn: <span className="text-primary">{selectedVariants.length}</span> SKU</div>
            </div>

            <div className="rounded-2xl border bg-gradient-to-br from-orange-50 to-white p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 font-black text-zinc-900"><Sparkles className="h-4 w-4 text-primary" /> Gợi ý sản phẩm nên sale</div>
                  <p className="text-xs text-zinc-500">Ưu tiên tồn cao, bán chậm 30 ngày và chưa nằm trong campaign khác.</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={loadSuggestedVariants} disabled={suggestedLoading}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${suggestedLoading ? "animate-spin" : ""}`} />Làm mới</Button>
                  <Button type="button" size="sm" className="bg-primary hover:bg-primary/90" onClick={addAllSuggestedVariants} disabled={!suggestedVariants.length}>Chọn tất cả ({suggestedVariants.length})</Button>
                </div>
              </div>
              {suggestedLoading ? (
                <div className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tìm sản phẩm phù hợp...</div>
              ) : !suggestedVariants.length ? (
                <div className="rounded-xl bg-white p-3 text-sm text-zinc-400">Chưa có sản phẩm phù hợp với tiêu chí tồn cao/bán chậm.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {suggestedVariants.map((variant) => {
                    const selected = selectedIds.has(variant.id);
                    return (
                      <div key={variant.id} className={`rounded-2xl border bg-white p-3 ${selected ? "border-primary" : ""}`}>
                        <div className="flex gap-3">
                          {variant.image ? <img src={variant.image} alt={variant.productName} className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100"><Package className="h-5 w-5 text-zinc-400" /></div>}
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 font-bold text-zinc-900">{variant.productName}</div>
                            <div className="mt-1 text-xs text-zinc-500">SKU: {variant.sku}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary">Tồn khả dụng: {variant.availableStock}</Badge>
                          <Badge variant={variant.soldCount === 0 ? "warning" : "info"}>Bán 30 ngày: {variant.soldCount}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{variant.reason}</p>
                        <div className="mt-2 text-sm"><span className="text-zinc-400 line-through">{formatMoney(variant.price)}</span><span className="mx-2 text-zinc-300">→</span><span className="font-black text-primary">{formatMoney(salePrice(variant.price))}</span></div>
                        <Button type="button" size="sm" variant={selected ? "outline" : "default"} className={selected ? "mt-3 w-full" : "mt-3 w-full bg-primary hover:bg-primary/90"} onClick={() => toggleVariant(variant)}>{selected ? "Đã chọn" : "+ Thêm"}</Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input className="pl-9 pr-20" placeholder="Tìm theo tên sản phẩm hoặc SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                {searchQuery && <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSearchQuery("")} aria-label="Xóa tìm kiếm"><X className="h-4 w-4" /></Button>}
              </div>
            </div>

            <div className="md:hidden">
              <div className="mb-2 flex items-center justify-between rounded-2xl border bg-muted/40 px-3 py-2">
                <span className="text-sm font-bold text-zinc-700">Kết quả đang hiển thị</span>
                <Button type="button" size="sm" variant="outline" className="h-9" onClick={toggleVisibleVariants} disabled={!searchResults.length}>
                  {allVisibleSelected ? "Bỏ chọn" : "Chọn tất cả"}
                </Button>
              </div>
              {!searchResults.length ? (
                <div className="rounded-2xl border py-8 text-center text-sm text-zinc-400">{isSearching ? "Đang tìm SKU..." : "Không có SKU phù hợp"}</div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((variant) => (
                    <div
                      role="button"
                      tabIndex={0}
                      key={variant.id}
                      onClick={() => toggleVariant(variant)}
                      aria-pressed={selectedIds.has(variant.id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleVariant(variant); } }}
                      className={`w-full rounded-2xl border p-3 text-left transition ${selectedIds.has(variant.id) ? "border-primary bg-orange-50" : "bg-white"}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${selectedIds.has(variant.id) ? "border-primary bg-primary text-white" : "border-zinc-300 bg-white"}`}>{selectedIds.has(variant.id) && <span className="text-xs font-black">✓</span>}</div>
                        {variant.image ? <img src={variant.image} alt={variant.productName} className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100"><Package className="h-5 w-5 text-zinc-400" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 font-bold text-zinc-900">{variant.productName}</div>
                          <div className="mt-1 text-xs text-zinc-500">SKU: {variant.sku} · Tồn: {variant.stock}</div>
                          <div className="mt-2 text-sm"><span className="text-zinc-400 line-through">{formatMoney(variant.price)}</span><span className="mx-2 text-zinc-300">→</span><span className="font-black text-primary">{formatMoney(salePrice(variant.price))}</span></div>
                          {variant.activeCampaign ? <Badge variant="warning" className="mt-2 max-w-full truncate"><AlertTriangle className="h-3 w-3" /> Đang trong: {variant.activeCampaign.name}</Badge> : <div className="mt-2 text-xs font-medium text-emerald-600">Sẵn sàng áp dụng</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border md:block">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-11"><Checkbox checked={allVisibleSelected} onCheckedChange={toggleVisibleVariants} aria-label="Chọn tất cả SKU đang hiển thị" /></TableHead>
                    <TableHead>Sản phẩm / SKU</TableHead>
                    <TableHead className="w-24">Tồn kho</TableHead>
                    <TableHead className="w-52">Giá dự kiến</TableHead>
                    <TableHead className="w-56">Cảnh báo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!searchResults.length ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-zinc-400">{isSearching ? "Đang tìm SKU..." : "Không có SKU phù hợp"}</TableCell></TableRow>
                  ) : searchResults.map((variant) => (
                    <TableRow key={variant.id} className={selectedIds.has(variant.id) ? "bg-orange-50/50" : undefined}>
                      <TableCell><Checkbox checked={selectedIds.has(variant.id)} onCheckedChange={() => toggleVariant(variant)} aria-label={`Chọn ${variant.productName}`} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {variant.image ? <img src={variant.image} alt={variant.productName} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100"><Package className="h-5 w-5 text-zinc-400" /></div>}
                          <div className="min-w-0">
                            <div className="truncate font-bold text-zinc-900">{variant.productName}</div>
                            <div className="text-xs text-zinc-500">SKU: {variant.sku}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{variant.stock}</TableCell>
                      <TableCell><div className="text-sm"><span className="text-zinc-400 line-through">{formatMoney(variant.price)}</span><span className="mx-2 text-zinc-300">→</span><span className="font-black text-primary">{formatMoney(salePrice(variant.price))}</span></div><div className="text-xs text-zinc-500">Giảm {discount}%</div></TableCell>
                      <TableCell>{variant.activeCampaign ? <Badge variant="warning" className="max-w-full truncate"><AlertTriangle className="h-3 w-3" /> Đang trong: {variant.activeCampaign.name} ({STATUS_LABELS[variant.activeCampaign.status] || variant.activeCampaign.status})</Badge> : <span className="text-xs text-zinc-400">Sẵn sàng</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedVariants.length > 0 && (
              <div className="space-y-3 rounded-2xl border bg-zinc-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-bold text-zinc-900">SKU đã chọn ({selectedVariants.length})</div>
                  <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedVariants([])}>Bỏ chọn tất cả</Button>
                </div>
                {conflictCount > 0 && <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4" /> {conflictCount} SKU đang thuộc chiến dịch khác. Khi kích hoạt, giá sale có thể bị ghi đè.</div>}
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                  {selectedVariants.map((variant) => (
                    <Badge key={variant.id} variant={variant.activeCampaign ? "warning" : "secondary"} className="max-w-full gap-2 py-1 pr-1">
                      <span className="max-w-[130px] truncate sm:max-w-[220px]">{variant.productName} · {formatMoney(salePrice(variant.price))}</span>
                      <button type="button" onClick={() => toggleVariant(variant)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-black/10" aria-label={`Bỏ chọn ${variant.productName}`}><X className="h-4 w-4" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 xl:col-span-4"><Button onClick={create} disabled={saving} className="w-full bg-primary hover:bg-primary/90 sm:w-auto"><Plus className="mr-2 h-4 w-4" />{saving ? "Đang tạo..." : "Tạo chiến dịch"}</Button></div>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="space-y-3 border-b bg-white p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input className="pl-9" placeholder="Tìm chiến dịch theo tên hoặc mô tả..." value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["ALL", "DRAFT", "ACTIVE", "PAUSED", "ENDED"].map((status) => (
              <Button key={status} type="button" size="sm" variant={statusFilter === status ? "default" : "outline"} className="shrink-0" onClick={() => setStatusFilter(status)}>
                {status === "ALL" ? "Tất cả" : STATUS_LABELS[status] || status}
              </Button>
            ))}
          </div>
        </div>
        <Table className="min-w-[860px]">
            <TableHeader className="bg-muted/50"><TableRow><TableHead>Tên chiến dịch</TableHead><TableHead>Thời gian</TableHead><TableHead>Giảm</TableHead><TableHead>Sản phẩm</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
            <TableBody>
              {!filteredItems.length ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-zinc-400">Không có chiến dịch phù hợp</TableCell></TableRow> : filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><div className="font-bold">{item.name}</div><div className="text-xs text-zinc-500">{item.description}</div></TableCell>
                  <TableCell className="text-xs"><div className="space-y-1"><div><span className="font-semibold text-zinc-500">Bắt đầu:</span> {new Date(item.startDate).toLocaleString("vi-VN")}</div><div><span className="font-semibold text-zinc-500">Kết thúc:</span> {new Date(item.endDate).toLocaleString("vi-VN")}</div></div></TableCell>
                  <TableCell className="font-bold text-primary">{item.defaultDiscount || 0}%</TableCell>
                  <TableCell>{item.itemCount || 0}</TableCell>
                  <TableCell><Badge variant={item.status === "ACTIVE" ? "success" : item.status === "ENDED" ? "secondary" : "info"}>{STATUS_LABELS[item.status] || item.status}</Badge></TableCell>
                  <TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openDetail(item.id)}><Eye className="mr-1 h-3.5 w-3.5" />Chi tiết</Button>{item.status !== "ACTIVE" && item.status !== "ENDED" && <Button size="sm" variant="outline" onClick={() => apply(item.id)} disabled={actionId === item.id}>{actionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="mr-1 h-3.5 w-3.5" />Kích hoạt</>}</Button>}{item.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => deactivate(item.id)} disabled={actionId === item.id}><Pause className="mr-1 h-3.5 w-3.5" />Tạm dừng</Button>}{["ACTIVE", "PAUSED"].includes(item.status) && <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "end", campaign: item })} disabled={actionId === item.id}><StopCircle className="mr-1 h-3.5 w-3.5" />Kết thúc</Button>}{item.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "delete", campaign: item })} disabled={actionId === item.id}><Trash2 className="mr-1 h-3.5 w-3.5" />Xóa</Button>}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </Card>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="flex w-full flex-col overflow-hidden p-4 sm:max-w-2xl sm:p-6" side="right">
          <SheetHeader>
            <SheetTitle>{selectedCampaign?.name || "Chi tiết chiến dịch"}</SheetTitle>
            <SheetDescription>Xem danh sách SKU, tồn kho và giá sale trong chiến dịch.</SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : selectedCampaign ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="grid gap-2 rounded-2xl bg-zinc-50 p-4 text-sm sm:grid-cols-2">
                <div><span className="font-semibold text-zinc-500">Trạng thái:</span> <Badge variant={selectedCampaign.status === "ACTIVE" ? "success" : selectedCampaign.status === "ENDED" ? "secondary" : "info"}>{STATUS_LABELS[selectedCampaign.status] || selectedCampaign.status}</Badge></div>
                <div><span className="font-semibold text-zinc-500">Giảm mặc định:</span> <span className="font-bold text-primary">{selectedCampaign.defaultDiscount || 0}%</span></div>
                <div><span className="font-semibold text-zinc-500">Bắt đầu:</span> {new Date(selectedCampaign.startDate).toLocaleString("vi-VN")}</div>
                <div><span className="font-semibold text-zinc-500">Kết thúc:</span> {new Date(selectedCampaign.endDate).toLocaleString("vi-VN")}</div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input className="pl-9" placeholder="Lọc theo tên sản phẩm hoặc SKU..." value={detailQuery} onChange={(e) => setDetailQuery(e.target.value)} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {!detailItems.length ? <div className="py-10 text-center text-sm text-zinc-400">Không có SKU phù hợp</div> : detailItems.map((item) => {
                  const variant = item.variant;
                  const image = variant?.product?.images?.[0]?.url;
                  return (
                    <div key={item.id} className="mb-3 rounded-2xl border p-3">
                      <div className="flex gap-3">
                        {image ? <img src={image} alt={variant?.product?.name || "Sản phẩm"} className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100"><Package className="h-5 w-5 text-zinc-400" /></div>}
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 font-bold text-zinc-900">{variant?.product?.name || "Sản phẩm"}</div>
                          <div className="mt-1 text-xs text-zinc-500">SKU: {variant?.sku || item.variantId} · Tồn: {variant?.stock ?? 0}</div>
                          <div className="mt-2 text-sm"><span className="text-zinc-400 line-through">{formatMoney(Number(variant?.price || 0))}</span><span className="mx-2 text-zinc-300">→</span><span className="font-black text-primary">{formatMoney(Number(item.salePrice || 0))}</span></div>
                          <div className="mt-1 text-xs text-zinc-500">Giảm {item.discountPercent}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        onConfirm={confirmCampaignAction}
        isLoading={!!actionId}
        variant={confirmAction?.type === "delete" ? "destructive" : "default"}
        title={confirmAction?.type === "delete" ? "Xóa chiến dịch nháp?" : "Kết thúc chiến dịch?"}
        description={confirmAction?.type === "delete" ? `Chiến dịch "${confirmAction?.campaign.name || ""}" sẽ bị xóa khỏi hệ thống.` : `Chiến dịch "${confirmAction?.campaign.name || ""}" sẽ kết thúc và giá sale sẽ được gỡ khỏi sản phẩm.`}
        confirmText={confirmAction?.type === "delete" ? "Xóa chiến dịch" : "Kết thúc"}
      />
    </div>
  );
}
