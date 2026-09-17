"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Warehouse, AlertTriangle, Loader2 } from "lucide-react";
import { inventoryApi, type WarehouseInventory } from "@/lib/inventoryApi";
import { getWarehouseRegion, regionBadgeClass } from "@/lib/warehouseRegion";

/** Bảng tồn kho theo từng kho + miền của 1 sản phẩm (mọi biến thể). */
export default function ProductStockCard({ productId }: { productId: string }) {
  const [rows, setRows] = useState<WarehouseInventory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res: any = await inventoryApi.getInventory({ productId, limit: 100 });
        const items: WarehouseInventory[] = Array.isArray(res)
          ? res
          : (res?.data ?? []);
        if (alive) setRows(items);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  const totalQty = rows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Warehouse className="w-4 h-4 text-primary" />
          Tồn kho theo kho
        </CardTitle>
        <Link
          href="/admin/inventory/stock"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Quản lý tồn kho
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải tồn kho...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Sản phẩm chưa nhập kho nào. Tạo{" "}
            <Link href="/admin/inventory/movements/new" className="text-primary font-semibold hover:underline">
              phiếu nhập kho
            </Link>{" "}
            để ghi nhận tồn.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-3">
              <span className="col-span-3">Biến thể (SKU)</span>
              <span className="col-span-3">Kho</span>
              <span className="col-span-2">Miền</span>
              <span className="col-span-2 text-center">Tồn / Tối thiểu</span>
              <span className="col-span-2 text-right">Trạng thái</span>
            </div>
            {rows.map((r) => {
              const low = Number(r.quantity || 0) <= Number(r.minQuantity ?? 0);
              const region = getWarehouseRegion(r.warehouse);
              return (
                <div
                  key={r.id}
                  className={`grid grid-cols-2 sm:grid-cols-12 gap-2 items-center rounded-xl border px-3 py-2.5 text-sm ${
                    low ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30" : "border-border"
                  }`}
                >
                  <span className="col-span-2 sm:col-span-3 font-mono text-xs truncate" title={r.variant?.sku}>
                    {r.variant?.sku || r.variantId.slice(-6)}
                  </span>
                  <span className="sm:col-span-3 text-xs sm:text-sm font-medium truncate">
                    {r.warehouse?.name || r.warehouse?.code}
                  </span>
                  <span className="sm:col-span-2">
                    <span
                      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${regionBadgeClass(region.tone)}`}
                    >
                      {region.label}
                    </span>
                  </span>
                  <span className="sm:col-span-2 sm:text-center font-bold">
                    {r.quantity}
                    <span className="font-normal text-muted-foreground"> / {r.minQuantity}</span>
                  </span>
                  <span className="sm:col-span-2 sm:text-right">
                    {low ? (
                      <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 text-[11px]">
                        <AlertTriangle className="w-3 h-3" /> Sắp hết
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-700 border-green-300 text-[11px]">
                        Còn hàng
                      </Badge>
                    )}
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-right pt-1">
              Tổng tồn mọi kho: <strong className="text-foreground">{totalQty}</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
