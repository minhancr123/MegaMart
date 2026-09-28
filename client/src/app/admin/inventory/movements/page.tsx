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
import {
  STOCK_MOVEMENT_STATUS_STYLE,
  STOCK_MOVEMENT_STATUS_LABEL,
} from "@/lib/inventoryStatus";
import { toast } from "sonner";
import { formatDate, formatPrice, getErrorMessage } from "@/lib/utils";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

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
  const [confirmAction, setConfirmAction] = useState<{ type: "complete" | "cancel"; id: string } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

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
    if (actingId) return;
    setActingId(id);
    try {
      await inventoryApi.completeMovement(id);
      toast.success("Đã hoàn thành phiếu kho");
      setConfirmAction(null);
      fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể hoàn thành"));
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (actingId) return;
    setActingId(id);
    try {
      await inventoryApi.cancelMovement(id);
      toast.success("Đã hủy phiếu");
      setConfirmAction(null);
      fetchData();
    } catch (error: any) {
      toast.error(getErrorMessage(error, "Không thể hủy phiếu"));
    } finally {
      setActingId(null);
    }
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
    const style = STOCK_MOVEMENT_STATUS_STYLE[status] ?? STOCK_MOVEMENT_STATUS_STYLE.PENDING;
    const label = STOCK_MOVEMENT_STATUS_LABEL[status] ?? status;
    const Icon =
      status === StockMovementStatus.COMPLETED
        ? CheckCircle
        : status === StockMovementStatus.CANCELLED
          ? XCircle
          : Clock;
    return (
      <Badge variant="outline" className={style}>
        <Icon className="w-3 h-3 mr-1" /> {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Phiếu Nhập/Xuất kho"
        description="Quản lý các phiếu nhập, xuất, chuyển kho"
        actions={
          <Link href="/admin/inventory/movements/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Tạo phiếu mới
            </Button>
          </Link>
        }
      />

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
          {(!loading && movements.length > 0) ? (
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
                        <code className="bg-muted px-2 py-1 rounded text-sm font-medium">
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
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.supplier?.name || movement.toWarehouseId || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {movement.items?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.totalAmount 
                          ? formatPrice(Number(movement.totalAmount))
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(movement.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(movement.createdAt, { withTime: true })}
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
                                onClick={() => setConfirmAction({ type: "complete", id: movement.id })}
                                title="Hoàn thành"
                                disabled={actingId !== null}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary"
                                onClick={() => setConfirmAction({ type: "cancel", id: movement.id })}
                                title="Hủy"
                                disabled={actingId !== null}
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
          ) : (
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
                {loading ? (
                  <AdminTableSkeleton columns={9} rows={5} />
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="p-0">
                      <AdminEmptyState
                        icon={Clock}
                        title="Chưa có phiếu kho nào"
                        description="Tạo phiếu nhập, xuất hoặc chuyển kho đầu tiên."
                        action={
                          <Button asChild>
                            <Link href="/admin/inventory/movements/new">Tạo phiếu mới</Link>
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && !actingId && setConfirmAction(null)}
        onConfirm={() =>
          confirmAction &&
          (confirmAction.type === "complete"
            ? handleComplete(confirmAction.id)
            : handleCancel(confirmAction.id))
        }
        title={confirmAction?.type === "complete" ? "Xác nhận hoàn thành phiếu" : "Xác nhận hủy phiếu"}
        description={
          confirmAction?.type === "complete"
            ? "Xác nhận hoàn thành phiếu này? Tồn kho sẽ được cập nhật."
            : "Bạn có chắc muốn hủy phiếu này?"
        }
        confirmText={confirmAction?.type === "complete" ? "Hoàn thành" : "Hủy phiếu"}
        variant={confirmAction?.type === "cancel" ? "destructive" : "default"}
        isLoading={actingId !== null}
      />
    </div>
  );
}
