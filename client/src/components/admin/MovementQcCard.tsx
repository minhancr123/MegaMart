"use client";

import { useEffect, useState } from "react";
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
import { ClipboardCheck, Loader2, FileText } from "lucide-react";
import { inventoryApi, type StockMovement, type Pallet } from "@/lib/inventoryApi";
import { toast } from "sonner";

const QC_LABEL: Record<string, string> = {
  PENDING: "Chưa QC",
  PASSED: "QC đạt",
  PARTIAL: "QC một phần",
  FAILED: "QC không đạt",
};

interface QcRow {
  variantId: string;
  sku: string;
  productName: string;
  quantity: number;
  orderedQty?: number | null;
  passed: number;
  failed: number;
  note: string;
  location: string;
  palletId: string;
  lotCode: string;
  mfgDate: string;
  expiryDate: string;
  serials: string;
}

export default function MovementQcCard({
  movement,
  onSaved,
}: {
  movement: StockMovement;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<QcRow[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRows(
      (movement.items || []).map((item: any) => ({
        variantId: item.variantId,
        sku: item.variant?.sku || "",
        productName: item.variant?.product?.name || "",
        quantity: item.quantity,
        orderedQty: item.orderedQty ?? null,
        passed: item.qcPassedQty ?? item.quantity,
        failed: item.qcFailedQty ?? 0,
        note: item.qcNote || "",
        location: item.putawayLocation || "",
        palletId: item.palletId || "",
        lotCode: item.lotCode || item.lot?.code || "",
        mfgDate: item.mfgDate ? String(item.mfgDate).slice(0, 10) : "",
        expiryDate: item.expiryDate ? String(item.expiryDate).slice(0, 10) : "",
        serials: Array.isArray(item.serials) ? item.serials.join("\n") : (item.serials || ""),
      }))
    );
    if (movement.warehouseId) {
      inventoryApi
        .getPallets(movement.warehouseId)
        .then((res: any) => setPallets(res?.data ?? res ?? []))
        .catch(() => setPallets([]));
    }
  }, [movement]);

  const editable = movement.status === "PENDING";

  const setRow = (idx: number, patch: Partial<QcRow>) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };

  const handleSave = async () => {
    for (const r of rows) {
      if (!Number.isInteger(r.passed) || r.passed < 0 || !Number.isInteger(r.failed) || r.failed < 0) {
        toast.error(`SKU ${r.sku}: số đạt/lỗi phải là số nguyên ≥ 0`);
        return;
      }
      if (r.passed + r.failed > r.quantity) {
        toast.error(`SKU ${r.sku}: đạt (${r.passed}) + lỗi (${r.failed}) vượt thực nhận (${r.quantity})`);
        return;
      }
    }
    try {
      setSaving(true);
      await inventoryApi.updateMovementQc(movement.id, {
        items: rows.map((r) => ({
          variantId: r.variantId,
          qcPassedQty: r.passed,
          qcFailedQty: r.failed,
          qcNote: r.note || undefined,
          putawayLocation: r.location || undefined,
          palletId: r.palletId || undefined,
          lotCode: r.lotCode.trim() || undefined,
          mfgDate: r.mfgDate || undefined,
          expiryDate: r.expiryDate || undefined,
          serials: r.serials.trim() || undefined,
        })),
      });
      toast.success("Đã lưu kết quả QC. Duyệt phiếu để cộng tồn số đạt.");
      onSaved();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.errormassage || "Không lưu được QC");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          Kiểm hàng & QC
        </CardTitle>
        <span className="text-xs font-bold px-2 py-1 rounded-full border bg-muted">
          {QC_LABEL[(movement as any).qcStatus] ?? (movement as any).qcStatus ?? "Chưa QC"}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {movement.purchaseOrder && (
          <p className="text-sm text-muted-foreground">
            Phiếu nhập theo PO{" "}
            <Link
              href={`/admin/inventory/purchase-orders/${movement.purchaseOrder.id}`}
              className="font-mono font-bold text-primary hover:underline"
            >
              {movement.purchaseOrder.code}
            </Link>
          </p>
        )}
        {rows.map((row, idx) => (
          <div key={row.variantId} className="rounded-xl border p-3 space-y-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{row.productName || row.sku}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {row.sku} · Thực nhận: {row.quantity}
                {row.orderedQty != null ? ` · Đặt: ${row.orderedQty}` : ""}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[11px]">Đạt *</Label>
                <Input
                  type="number"
                  min={0}
                  value={row.passed}
                  disabled={!editable}
                  onChange={(e) => setRow(idx, { passed: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-[11px]">Lỗi</Label>
                <Input
                  type="number"
                  min={0}
                  value={row.failed}
                  disabled={!editable}
                  onChange={(e) => setRow(idx, { failed: Number(e.target.value) })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-[11px]">Vị trí kệ</Label>
                <Input
                  placeholder="A1-01"
                  value={row.location}
                  disabled={!editable}
                  onChange={(e) => setRow(idx, { location: e.target.value })}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-[11px]">Pallet</Label>
                <Select
                  value={row.palletId || "none"}
                  disabled={!editable}
                  onValueChange={(v) => setRow(idx, { palletId: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Không" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không</SelectItem>
                    {pallets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code}{p.location ? ` · ${p.location}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              placeholder="Ghi chú kiểm hàng (vd: 2 cái móp hộp)..."
              value={row.note}
              disabled={!editable}
              onChange={(e) => setRow(idx, { note: e.target.value })}
              className="h-9 text-xs"
            />
            <details className="rounded-lg border border-dashed border-border px-2.5 py-2">
              <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground hover:text-foreground">
                Lô · HSD · Serial {row.lotCode || row.expiryDate ? `(${row.lotCode || "có HSD"})` : "(tùy chọn)"}
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-[11px]">Mã lô</Label>
                  <Input
                    placeholder="Tự sinh nếu trống"
                    value={row.lotCode}
                    disabled={!editable}
                    onChange={(e) => setRow(idx, { lotCode: e.target.value })}
                    className="h-9 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">NSX</Label>
                  <Input
                    type="date"
                    value={row.mfgDate}
                    disabled={!editable}
                    onChange={(e) => setRow(idx, { mfgDate: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">HSD</Label>
                  <Input
                    type="date"
                    value={row.expiryDate}
                    disabled={!editable}
                    onChange={(e) => setRow(idx, { expiryDate: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-[11px]">
                    Serial ({row.serials.split(/[\n,;]+/).filter((s) => s.trim()).length || 0})
                  </Label>
                  <Textarea
                    placeholder={"SN001\nSN002\n..."}
                    value={row.serials}
                    disabled={!editable}
                    onChange={(e) => setRow(idx, { serials: e.target.value })}
                    className="font-mono text-xs min-h-[68px]"
                  />
                </div>
              </div>
              {row.serials.trim() !== "" && (
                <p className="text-[11px] text-muted-foreground pt-1">
                  {row.serials.split(/[\n,;]+/).filter((s) => s.trim()).length} serial sẽ được tạo khi duyệt
                </p>
              )}
            </details>
          </div>
        ))}
        {editable && (
          <Button onClick={handleSave} disabled={saving} className="w-full h-10 rounded-xl font-bold">
            {saving ? "Đang lưu..." : "Lưu kết quả QC"}
          </Button>
        )}
        {!editable && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Chỉ duyệt QC (số đạt) được cộng tồn khi hoàn thành phiếu.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
