"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { inventoryApi, type Warehouse, type Supplier } from "@/lib/inventoryApi";
import { toast } from "sonner";

interface PoItem {
  variantId: string;
  sku: string;
  productName: string;
  orderedQty: number;
  unitPrice?: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PoItem[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [whRes, supRes]: any[] = await Promise.all([
          inventoryApi.getWarehouses(),
          inventoryApi.getSuppliers(),
        ]);
        setWarehouses(whRes?.data ?? whRes ?? []);
        const sups = supRes?.data ?? supRes ?? [];
        setSuppliers((Array.isArray(sups) ? sups : []).filter((s: any) => s.isActive !== false));
      } catch {
        toast.error("Không tải được kho / nhà cung cấp");
      }
    })();
  }, []);

  useEffect(() => {
    if (searchInput.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res: any = await inventoryApi.searchVariants(searchInput.trim());
        setSearchResults(res?.data ?? res ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const addItem = (v: any) => {
    if (items.some((i) => i.variantId === v.variantId)) {
      toast.error("Mặt hàng đã có trong PO");
      return;
    }
    setItems([
      ...items,
      { variantId: v.variantId, sku: v.sku, productName: v.productName, orderedQty: 1, unitPrice: v.price },
    ]);
    setSearchInput("");
    setSearchResults([]);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0);

  const totalAmount = items.reduce((s, i) => s + (i.unitPrice || 0) * i.orderedQty, 0);

  const handleSubmit = async () => {
    if (!supplierId) return toast.error("Vui lòng chọn nhà cung cấp");
    if (!warehouseId) return toast.error("Vui lòng chọn kho nhận");
    if (items.length === 0) return toast.error("Thêm ít nhất 1 mặt hàng");
    if (items.some((i) => !Number.isInteger(i.orderedQty) || i.orderedQty <= 0)) {
      return toast.error("Số lượng đặt phải là số nguyên dương");
    }
    try {
      setLoading(true);
      const res: any = await inventoryApi.createPurchaseOrder({
        supplierId,
        warehouseId,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          variantId: i.variantId,
          orderedQty: i.orderedQty,
          unitPrice: i.unitPrice,
        })),
      });
      const po = res?.data ?? res;
      toast.success(`Tạo PO ${po.code} thành công`);
      router.push(`/admin/inventory/purchase-orders/${po.id}`);
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Không tạo được PO");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tạo đơn đặt hàng (PO)</h1>
          <p className="text-muted-foreground mt-1">Đặt hàng nhà cung cấp, nhận hàng theo PO ở bước sau</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Thông tin PO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nhà cung cấp *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn NCC" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kho nhận dự kiến *</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ngày mong về hàng</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Điều khoản, yêu cầu đóng gói..." />
            </div>
            <div className="rounded-xl bg-muted/60 p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Tạm tính</span>
              <strong>{formatCurrency(totalAmount)}</strong>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Mặt hàng đặt ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Tìm theo SKU hoặc tên SP (gõ ít nhất 2 ký tự)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searching && <p className="text-xs text-muted-foreground mt-1">Đang tìm...</p>}
              {searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border bg-background shadow-lg max-h-64 overflow-auto">
                  {searchResults.map((v: any) => (
                    <button
                      key={v.variantId}
                      type="button"
                      onClick={() => addItem(v)}
                      className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-muted/60"
                    >
                      {v.imageUrl && <img src={v.imageUrl} alt="" className="w-9 h-9 rounded object-cover shrink-0" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{v.productName}</span>
                        <span className="block truncate text-xs text-muted-foreground font-mono">{v.sku}</span>
                      </span>
                      <Plus className="w-4 h-4 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Chưa có mặt hàng nào.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.variantId} className="grid grid-cols-12 gap-2 items-center rounded-xl border p-2.5">
                    <div className="col-span-12 sm:col-span-5 min-w-0">
                      <p className="truncate text-sm font-medium">{item.productName}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Label className="text-[11px]">SL đặt *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.orderedQty}
                        onChange={(e) => {
                          const next = [...items];
                          next[idx] = { ...next[idx], orderedQty: Number(e.target.value) };
                          setItems(next);
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-5 sm:col-span-3">
                      <Label className="text-[11px]">Giá nhập (VNĐ)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const next = [...items];
                          next[idx] = { ...next[idx], unitPrice: Number(e.target.value) };
                          setItems(next);
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 rounded-xl font-bold">
              {loading ? "Đang tạo..." : "Tạo đơn đặt hàng"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
