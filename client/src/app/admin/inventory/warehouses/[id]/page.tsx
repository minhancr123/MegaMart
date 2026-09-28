"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import {
  ArrowLeft,
  Warehouse as WarehouseIcon,
  MapPin,
  Phone,
  Package,
  AlertTriangle,
  Boxes,
  ReceiptText,
  Loader2,
} from "lucide-react";
import {
  inventoryApi,
  type Warehouse,
  type WarehouseInventory,
  type StockMovement,
  StockMovementType,
  StockMovementStatus,
} from "@/lib/inventoryApi";
import { getWarehouseRegion, regionBadgeClass } from "@/lib/warehouseRegion";
import { visibleAttributes, formatAttributeValue } from "@/lib/productAttributes";
import { PalletMiniMap } from "@/components/admin/PalletVisual";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";

const MOVEMENT_LABEL: Record<string, string> = {
  IMPORT: "Nhập kho",
  EXPORT: "Xuất kho",
  TRANSFER_IN: "Chuyển đến",
  TRANSFER_OUT: "Chuyển đi",
  ADJUSTMENT: "Điều chỉnh",
  RETURN: "Trả hàng",
  DAMAGE: "Hư hỏng",
  SALE: "Bán hàng",
};

import {
  STOCK_MOVEMENT_STATUS_STYLE as STATUS_STYLE,
  STOCK_MOVEMENT_STATUS_LABEL as STATUS_LABEL,
} from "@/lib/inventoryStatus";

const ITEMS_PER_PAGE = 10;

export default function WarehouseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [stats, setStats] = useState<{ totalItems: number; lowStockCount: number; totalValue: number } | null>(null);
  const [items, setItems] = useState<WarehouseInventory[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pallets, setPallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [whRes, statsRes, invRes, movRes, palRes]: any[] = await Promise.all([
        inventoryApi.getWarehouse(id),
        inventoryApi.getStats(id),
        inventoryApi.getInventory({ warehouseId: id, page, limit: ITEMS_PER_PAGE }),
        inventoryApi.getMovements({ warehouseId: id, page: 1, limit: 5 }),
        inventoryApi.getPallets(id),
      ]);
      const wh = (whRes as any)?.data ?? whRes;
      setWarehouse(wh);
      const st = (statsRes as any)?.data ?? statsRes;
      setStats(st);
      // axiosClient đã bóc sẵn 1 lớp: invRes chính là {data: rows, meta}
      // (đừng bóc thêm .data nữa sẽ làm mất meta -> mất phân trang)
      const inv: any = invRes;
      const rows: WarehouseInventory[] = Array.isArray(inv) ? inv : (inv?.data ?? []);
      const meta = Array.isArray(inv) ? undefined : inv?.meta;
      setItems(rows);
      setTotalItems(meta?.total ?? rows.length);
      setTotalPages(meta?.totalPages ?? 1);
      const mv = (movRes as any)?.data ?? movRes;
      setMovements(mv?.data ?? (Array.isArray(mv) ? mv : []));
      const pl = (palRes as any)?.data ?? palRes;
      setPallets(Array.isArray(pl) ? pl : []);
    } catch (error) {
      console.error("Failed to load warehouse detail", error);
      toast.error("Không thể tải chi tiết kho");
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    if (id) loadAll();
  }, [id, loadAll]);



  if (loading && !warehouse) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loading && !warehouse) {
    return (
      <div className="space-y-6">
        <Link href="/admin/inventory/warehouses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách kho
        </Link>
        <AdminEmptyState
          icon={WarehouseIcon}
          title="Không tìm thấy kho"
          description="Kho không tồn tại hoặc đã bị xóa."
        />
      </div>
    );
  }

  const region = getWarehouseRegion(warehouse);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/inventory/warehouses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách kho
      </Link>

      {/* Thông tin kho */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <WarehouseIcon className="w-6 h-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{warehouse?.name}</h1>
                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{warehouse?.code}</code>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${regionBadgeClass(region.tone)}`}
                >
                  {region.label}
                </span>
                <Badge variant={warehouse?.isActive ? "default" : "secondary"}>
                  {warehouse?.isActive ? "Hoạt động" : "Tạm ngưng"}
                </Badge>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {warehouse?.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" /> {warehouse.address}
                  </p>
                )}
                {warehouse?.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 shrink-0" /> {warehouse.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link href={`/admin/inventory/stock?warehouseId=${id}`}>
                <Button variant="outline" size="sm">Xem tồn kho</Button>
              </Link>
              <Link href="/admin/inventory/movements/new">
                <Button size="sm">Tạo phiếu kho</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 thẻ số liệu */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Package className="w-5 h-5" />
            </span>
            <div>
              <p className="text-2xl font-black text-foreground">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Dòng sản phẩm trong kho</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <p className="text-2xl font-black text-amber-600">{stats?.lowStockCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Món sắp hết hàng</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-100 text-green-600">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <p className="text-2xl font-black text-foreground">{formatPrice(stats?.totalValue ?? 0, "0 ₫")}</p>
              <p className="text-xs text-muted-foreground">Giá trị tồn kho</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sơ đồ kho: pallet thật + hàng lẻ chưa xếp pallet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Sơ đồ kho</h2>
          <Link href="/admin/inventory/pallets" className="text-xs font-semibold text-primary hover:underline">
            Quản lý pallet
          </Link>
        </div>
        {pallets.length === 0 ? (
          <Card>
            <CardContent className="py-5 text-sm text-muted-foreground">
              Kho chưa có pallet nào.{" "}
              <Link href="/admin/inventory/pallets" className="text-primary font-semibold hover:underline">
                Tạo pallet
              </Link>{" "}
              trước để gán hàng khi nhập kho (bước QC → chọn pallet).
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {pallets.map((p: any) => (
              <Link key={p.id} href={`/admin/inventory/pallets/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer p-4 flex items-center gap-3">
                  <PalletMiniMap
                    boxes={(p.boxes || []).map((b: any) => ({ id: b.id, boxCode: b.boxCode, level: b.level, quantity: b.quantity }))}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-primary truncate">{p.code}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.location || "Chưa đặt vị trí"} · {(p.boxes || []).length} thùng
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        {(stats as any)?.looseItems > 0 && (
          <p className="text-xs text-muted-foreground rounded-xl border border-dashed px-3 py-2">
            Còn <strong className="text-foreground">{(stats as any).looseItems} dòng hàng lẻ</strong> chưa
            xếp lên pallet nào (xem ở bảng bên dưới).
          </p>
        )}
      </div>

      {/* Sản phẩm trong kho */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Sản phẩm trong kho</CardTitle>
        </CardHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title="Kho chưa có sản phẩm nào"
            description="Tạo phiếu nhập kho để đưa hàng vào kho này."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Tồn kho</TableHead>
                <TableHead className="text-center">Tối thiểu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const low = Number(item.quantity || 0) <= Number(item.minQuantity ?? 0);
                return (
                  <TableRow key={item.id} className={low ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.variant?.product?.images?.[0] && (
                          <img
                            src={item.variant.product.images[0].url}
                            alt=""
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-1">{item.variant?.product?.name || "N/A"}</p>
                          {item.variant?.attributes &&
                            visibleAttributes(item.variant.attributes as Record<string, unknown>).length > 0 && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {visibleAttributes(item.variant.attributes as Record<string, unknown>)
                                  .map(([, v]) => formatAttributeValue(v))
                                  .join(" / ")}
                              </p>
                            )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-xs">{item.variant?.sku}</code>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center gap-1.5 font-bold ${low ? "text-amber-600" : ""}`}>
                        {low && <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.minQuantity}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!loading && totalPages > 1 && (
          <div className="p-4">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        )}
      </Card>

      {/* Phiếu kho gần đây */}
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" /> Phiếu kho gần đây
          </CardTitle>
          <Link href="/admin/inventory/movements" className="text-xs font-semibold text-primary hover:underline">
            Xem tất cả
          </Link>
        </CardHeader>
        {movements.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Chưa có phiếu kho nào cho kho này.</p>
        ) : (
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
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/admin/inventory/movements/${m.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {m.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {MOVEMENT_LABEL[m.type as StockMovementType] ?? m.type}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[m.status as StockMovementStatus] ?? STATUS_STYLE.PENDING}`}
                    >
                      {STATUS_LABEL[m.status as StockMovementStatus] ?? m.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
