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
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [warehousesRes, suppliersRes, statsRes] = await Promise.all([
        inventoryApi.getWarehouses(true),
        inventoryApi.getSuppliers(true),
        inventoryApi.getStats(),
      ]);
      setWarehouses(warehousesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setStats(statsRes.data);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Kho</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Theo dõi tồn kho, nhập xuất và nhà cung cấp</p>
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
            <Link href="/admin/inventory/stock?lowStock=true" className="text-xs text-blue-600 hover:underline">
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/inventory/stock">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Chưa có kho hàng nào. 
              <Link href="/admin/inventory/warehouses" className="text-blue-600 dark:text-blue-400 ml-1">Tạo kho mới</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.slice(0, 6).map((warehouse) => (
                <div 
                  key={warehouse.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold dark:text-white">{warehouse.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{warehouse.code}</p>
                    </div>
                    <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                      {warehouse.isActive ? "Hoạt động" : "Tạm ngưng"}
                    </Badge>
                  </div>
                  {warehouse.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{warehouse.address}</p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
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
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Chưa có nhà cung cấp nào.
              <Link href="/admin/inventory/suppliers" className="text-blue-600 dark:text-blue-400 ml-1">Thêm nhà cung cấp</Link>
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
