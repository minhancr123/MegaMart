"use client";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/ui/pagination";
import { Package, Search, AlertTriangle } from "lucide-react";
import {
  inventoryApi,
  WarehouseInventory,
  Warehouse,
} from "@/lib/inventoryApi";
import { getWarehouseRegion, regionBadgeClass } from "@/lib/warehouseRegion";
import { visibleAttributes, formatAttributeValue } from "@/lib/productAttributes";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

export default function StockPage() {
  const searchParams = useSearchParams();
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    warehouseId: "",
    search: "",
    // Chỉ đọc param URL 1 lần lúc mount; user đổi filter sau đó không bị URL ép ngược lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    lowStock: searchParams.get('lowStock') === 'true',
  });

  const ITEMS_PER_PAGE = 20;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [inventoryRes, warehousesRes] = await Promise.all([
        inventoryApi.getInventory({
          ...filters,
          page,
          limit: ITEMS_PER_PAGE,
        }),
        inventoryApi.getWarehouses(),
      ]);
      const rawInv = inventoryRes as any;
      const items = Array.isArray(rawInv) ? rawInv : (rawInv?.data || []);
      const meta = rawInv?.meta || {};

      setInventory(Array.isArray(items) ? items : []);
      setTotal(meta.total ?? (Array.isArray(items) ? items.length : 0));
      setTotalPages(meta.totalPages ?? 1);

      const rawWh = warehousesRes as any;
      setWarehouses(Array.isArray(rawWh) ? rawWh : (rawWh?.data || []));
    } catch {
      toast.error("Không thể tải dữ liệu tồn kho");
      setInventory([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const formatCurrency = (value: number) => formatPrice(value, "0 ₫");

  const isLowStock = (item: WarehouseInventory) => {
    return item.quantity <= item.minQuantity;
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tồn kho"
        description="Theo dõi số lượng tồn kho theo từng kho"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Kho hàng</Label>
              <Select
                value={filters.warehouseId}
                onValueChange={(value) => handleFilterChange("warehouseId", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả kho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kho</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tìm theo SKU</Label>
              <Input
                placeholder="Nhập mã SKU..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={filters.lowStock ? "low" : "all"}
                onValueChange={(value) => handleFilterChange("lowStock", value === "low")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="low">Sắp hết hàng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Danh sách tồn kho
          </CardTitle>
          <CardDescription>
            Hiển thị {inventory.length} / {total} bản ghi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!loading && inventory.length > 0) ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Miền</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Pallet</TableHead>
                    <TableHead className="text-center">Tồn kho</TableHead>
                    <TableHead className="text-center">Tối thiểu</TableHead>
                    <TableHead className="text-right">Giá trị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id} className={isLowStock(item) ? "bg-yellow-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.variant?.product?.images?.[0] && (
                            <img
                              src={item.variant.product.images[0].url}
                              alt=""
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium line-clamp-1 dark:text-white">
                              {item.variant?.product?.name || "N/A"}
                            </p>
                            {item.variant?.attributes &&
                              visibleAttributes(
                                item.variant.attributes as Record<string, unknown>
                              ).length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  {visibleAttributes(
                                    item.variant.attributes as Record<string, unknown>
                                  )
                                    .map(([, v]) => formatAttributeValue(v))
                                    .join(" / ")}
                                </p>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {item.variant?.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.warehouse?.code || item.warehouse?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const region = getWarehouseRegion(item.warehouse);
                          return (
                            <span
                              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${regionBadgeClass(region.tone)}`}
                            >
                              {region.label}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item.location || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.pallet?.code ? (
                          <span className="font-mono text-xs text-teal-700 dark:text-teal-300">
                            {item.pallet.code}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isLowStock(item) && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className={`font-medium ${isLowStock(item) ? "text-yellow-600 dark:text-yellow-500" : "dark:text-white"}`}>
                            {item.quantity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {item.minQuantity}
                      </TableCell>
                      <TableCell className="text-right font-medium dark:text-white">
                        {formatCurrency(item.quantity * Number(item.variant?.price || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={total}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            </>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kho</TableHead>
                  <TableHead>Miền</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Pallet</TableHead>
                  <TableHead className="text-center">Tồn kho</TableHead>
                  <TableHead className="text-center">Tối thiểu</TableHead>
                  <TableHead className="text-right">Giá trị</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <AdminTableSkeleton columns={9} rows={5} />
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <AdminEmptyState
                        icon={Package}
                        title="Không có dữ liệu tồn kho"
                        description="Dữ liệu tồn kho sẽ hiện ở đây khi có hàng trong kho."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
