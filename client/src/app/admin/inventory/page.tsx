"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Warehouse, 
  Package, 
  Truck, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Plus,
  FileText,
  Layers,
  CalendarClock,
} from "lucide-react";
import { 
  inventoryApi, 
  Warehouse as WarehouseType,
  Supplier,
} from "@/lib/inventoryApi";
import { toast } from "sonner";

export default function InventoryPage() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<{ totalItems: number; lowStockCount: number; totalValue: number } | null>(null);
  const [expiry, setExpiry] = useState<{ expiredCount: number; expiringCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [warehousesRes, suppliersRes, statsRes, expiryRes] = await Promise.all([
        inventoryApi.getWarehouses(true),
        inventoryApi.getSuppliers(true),
        inventoryApi.getStats(),
        inventoryApi.getExpiryAlerts().catch(() => null),
      ]);
      setWarehouses(warehousesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      // getStats trả object trần {totalItems,...} (interceptor không bọc
      // thêm .data) nên fallback trực tiếp response khi thiếu .data.
      setStats((statsRes as any)?.data ?? statsRes);
      if (expiryRes) {
        const payload = (expiryRes as any)?.data ?? expiryRes;
        setExpiry({ expiredCount: payload?.expiredCount ?? 0, expiringCount: payload?.expiringCount ?? 0 });
      }
    } catch (error) {
      toast.error("Không thể tải dữ liệu kho");
      setWarehouses([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Kho</h1>
          <p className="text-muted-foreground mt-1">Theo dõi tồn kho, nhập xuất và nhà cung cấp</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/inventory/movements/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tạo phiếu kho
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sản phẩm tồn</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground">
              Trong tất cả các kho
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hàng</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.lowStockCount || 0}</div>
            <Link href="/admin/inventory/stock?lowStock=true" className="text-xs text-primary hover:underline">
              Xem chi tiết →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giá trị tồn kho</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Tổng giá trị hàng hóa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nhà cung cấp</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.filter(s => s.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              Đang hoạt động
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Banner cảnh báo HSD */}
      {(expiry?.expiredCount ?? 0) > 0 && (
        <Link href="/admin/inventory/lots?expiry=expired">
          <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 flex items-center gap-2.5 hover:shadow-md transition-shadow">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>{expiry?.expiredCount} lô đã quá HSD</strong> mà vẫn còn tồn. Bấm để xử lý.
            </p>
          </div>
        </Link>
      )}
      {(expiry?.expiredCount ?? 0) === 0 && (expiry?.expiringCount ?? 0) > 0 && (
        <Link href="/admin/inventory/lots?expiry=expiring">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 flex items-center gap-2.5 hover:shadow-md transition-shadow">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              <strong>{expiry?.expiringCount} lô sắp hết HSD</strong> trong 30 ngày tới.
            </p>
          </div>
        </Link>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/admin/inventory/stock">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Tồn kho
              </CardTitle>
              <CardDescription>Xem và quản lý tồn kho</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/inventory/movements">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
                Nhập/Xuất kho
              </CardTitle>
              <CardDescription>Phiếu nhập xuất và chuyển kho</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/inventory/warehouses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-purple-600" />
                Kho hàng
              </CardTitle>
              <CardDescription>Quản lý các chi nhánh kho</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/inventory/suppliers">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                Nhà cung cấp
              </CardTitle>
              <CardDescription>Quản lý nhà cung cấp</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/inventory/purchase-orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Đơn đặt hàng (PO)
              </CardTitle>
              <CardDescription>Đặt hàng NCC, nhận theo PO</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/inventory/pallets">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" />
                Pallet
              </CardTitle>
              <CardDescription>Quản lý pallet trong kho</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/inventory/lots">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-rose-600" />
                Lô & HSD
              </CardTitle>
              <CardDescription>Lô hàng, hạn dùng, serial</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Warehouses List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Danh sách Kho hàng</CardTitle>
            <CardDescription>Các chi nhánh kho trong hệ thống</CardDescription>
          </div>
          <Link href="/admin/inventory/warehouses">
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có kho hàng nào. 
              <Link href="/admin/inventory/warehouses" className="text-primary ml-1">Tạo kho mới</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.slice(0, 6).map((warehouse) => (
                <div 
                  key={warehouse.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold dark:text-white">{warehouse.name}</h3>
                      <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                    </div>
                    <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                      {warehouse.isActive ? "Hoạt động" : "Tạm ngưng"}
                    </Badge>
                  </div>
                  {warehouse.address && (
                    <p className="text-sm text-muted-foreground dark:text-gray-300 mb-2">{warehouse.address}</p>
                  )}
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{warehouse._count?.inventories || 0} sản phẩm</span>
                    <span>{warehouse._count?.stockMovements || 0} phiếu kho</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Suppliers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Nhà cung cấp</CardTitle>
            <CardDescription>Danh sách nhà cung cấp hàng hóa</CardDescription>
          </div>
          <Link href="/admin/inventory/suppliers">
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có nhà cung cấp nào.
              <Link href="/admin/inventory/suppliers" className="text-primary ml-1">Thêm nhà cung cấp</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.slice(0, 5).map((supplier) => (
                <div 
                  key={supplier.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium dark:text-white">{supplier.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {supplier.code} • {supplier.phone || supplier.email || 'Chưa có liên hệ'}
                    </p>
                  </div>
                  <Badge variant={supplier.isActive ? "outline" : "secondary"}>
                    {supplier._count?.stockMovements || 0} đơn nhập
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
