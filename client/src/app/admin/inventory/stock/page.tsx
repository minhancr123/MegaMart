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
import { Pagination } from "@/components/ui/pagination";
import { Package, Search, AlertTriangle } from "lucide-react";
import { 
  inventoryApi, 
  WarehouseInventory,
  Warehouse,
} from "@/lib/inventoryApi";
import { toast } from "sonner";
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
      setInventory(inventoryRes.data?.data || []);
      setTotal(inventoryRes.data?.meta?.total || 0);
      setTotalPages(inventoryRes.data?.meta?.totalPages || 1);
      setWarehouses(warehousesRes.data || []);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const isLowStock = (item: WarehouseInventory) => {
    return item.quantity <= item.minQuantity;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tồn kho</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Theo dõi số lượng tồn kho theo từng kho</p>
        </div>
      </div>

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
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Không có dữ liệu tồn kho
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Vị trí</TableHead>
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
                            {item.variant?.attributes && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {Object.values(item.variant.attributes as Record<string, string>).join(" / ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {item.variant?.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.warehouse?.code || item.warehouse?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {item.location || "-"}
                        </span>
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
                      <TableCell className="text-center text-gray-500 dark:text-gray-400">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
