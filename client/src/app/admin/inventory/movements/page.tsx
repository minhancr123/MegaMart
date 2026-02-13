"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { 
  inventoryApi, 
  StockMovement,
  Warehouse,
  StockMovementType,
  StockMovementStatus,
  stockMovementTypeLabels,
  stockMovementStatusLabels,
} from "@/lib/inventoryApi";
import { toast } from "sonner";

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    type: "",
    warehouseId: "",
    status: "",
    search: "",
  });

  const ITEMS_PER_PAGE = 20;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [movementsRes, warehousesRes] = await Promise.all([
        inventoryApi.getMovements({
          ...filters,
          type: filters.type as StockMovementType || undefined,
          status: filters.status as StockMovementStatus || undefined,
          page,
          limit: ITEMS_PER_PAGE,
        }),
        inventoryApi.getWarehouses(),
      ]);
      console.log('📦 Movements API response:', movementsRes);
      console.log('📦 Response type:', typeof movementsRes, 'Is array:', Array.isArray(movementsRes));
      
      // Handle both array and object responses
      let movementsData: StockMovement[] = [];
      let meta = { total: 0, page: 1, limit: 20, totalPages: 1 };
      
      if (Array.isArray(movementsRes)) {
        // Direct array response (no nested data)
        movementsData = movementsRes;
        meta = { total: movementsRes.length, page: 1, limit: 20, totalPages: 1 };
      } else if (movementsRes?.data) {
        // Nested data object
        movementsData = movementsRes.data.data || movementsRes.data || [];
        meta = movementsRes.data.meta || meta;
      }
      
      console.log('📦 Final movements data:', movementsData, 'Length:', movementsData.length);
      
      setMovements(movementsData);
      setTotal(meta.total);
      setTotalPages(meta.totalPages);
      setWarehouses(warehousesRes.data || warehousesRes || []);
    } catch (error: unknown) {
      toast.error("Không thể tải dữ liệu");
      setMovements([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value === "all" ? "" : value });
    setPage(1);
  };

  const handleComplete = async (id: string) => {
    if (!confirm("Xác nhận hoàn thành phiếu này? Tồn kho sẽ được cập nhật.")) return;
    try {
      await inventoryApi.completeMovement(id);
      toast.success("Đã hoàn thành phiếu kho");
      fetchData();
    } catch (error: unknown) {
      toast.error(error.response?.data?.message || "Không thể hoàn thành");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Bạn có chắc muốn hủy phiếu này?")) return;
    try {
      await inventoryApi.cancelMovement(id);
      toast.success("Đã hủy phiếu");
      fetchData();
    } catch (error: unknown) {
      toast.error(error.response?.data?.message || "Không thể hủy phiếu");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN");
  };

  const getTypeIcon = (type: StockMovementType) => {
    switch (type) {
      case StockMovementType.IMPORT:
      case StockMovementType.TRANSFER_IN:
      case StockMovementType.RETURN:
        return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case StockMovementType.EXPORT:
      case StockMovementType.TRANSFER_OUT:
      case StockMovementType.SALE:
      case StockMovementType.DAMAGE:
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      default:
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: StockMovementStatus) => {
    switch (status) {
      case StockMovementStatus.COMPLETED:
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Hoàn thành</Badge>;
      case StockMovementStatus.CANCELLED:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Đã hủy</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Chờ xử lý</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Phiếu Nhập/Xuất kho</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý các phiếu nhập, xuất, chuyển kho</p>
        </div>
        <Link href="/admin/inventory/movements/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Tạo phiếu mới
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Loại phiếu</Label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(stockMovementTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kho hàng</Label>
              <Select
                value={filters.warehouseId || "all"}
                onValueChange={(value) => handleFilterChange("warehouseId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả kho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả kho</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {Object.entries(stockMovementStatusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tìm kiếm</Label>
              <Input
                placeholder="Mã phiếu..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách phiếu kho</CardTitle>
          <CardDescription>
            Hiển thị {movements.length} / {total} phiếu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Chưa có phiếu kho nào.
              <Link href="/admin/inventory/movements/new" className="text-blue-600 dark:text-blue-400 ml-1">
                Tạo phiếu mới
              </Link>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>NCC/Kho đích</TableHead>
                    <TableHead className="text-center">Sản phẩm</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">
                          {movement.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(movement.type)}
                          <span className="text-sm">
                            {stockMovementTypeLabels[movement.type]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {movement.warehouse?.code || movement.warehouse?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                        {movement.supplier?.name || movement.toWarehouseId || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {movement.items?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.totalAmount 
                          ? formatCurrency(Number(movement.totalAmount))
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(movement.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(movement.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/inventory/movements/${movement.id}`}>
                            <Button variant="ghost" size="icon" title="Xem chi tiết">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {movement.status === StockMovementStatus.PENDING && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600"
                                onClick={() => handleComplete(movement.id)}
                                title="Hoàn thành"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleCancel(movement.id)}
                                title="Hủy"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
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
