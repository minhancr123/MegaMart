"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import { Search, Calendar, User, History, Trash2, BarChart3, Image, Zap, FileText } from "lucide-react";
import {
  auditLogApi,
  AuditLog,
  AuditLogResponse,
  AuditLogStats,
  auditActionLabels,
  auditEntityLabels
} from "@/lib/auditLogApi";
import { toast } from "sonner";

// Helper function for price formatting since formatPrice might not be exported fromutils
const formatPriceValue = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Dictionary for field translations
const fieldLabels: Record<string, string> = {
  name: "Tên",
  slug: "Slug",
  description: "Mô tả",
  price: "Giá",
  stock: "Tồn kho",
  categoryId: "ID Danh mục",
  images: "Hình ảnh",
  status: "Trạng thái",
  code: "Mã",
  total: "Tổng tiền",
  discountAmount: "Giảm giá",
  limit: "Giới hạn",
  used: "Đã sử dụng",
  startDate: "Ngày bắt đầu",
  endDate: "Ngày kết thúc",
  sku: "SKU",
  image: "Hình ảnh",
  type: "Loại",
  content: "Nội dung",
  title: "Tiêu đề",
  shippingAddress: "Địa chỉ giao hàng",
  paymentMethod: "Phương thức thanh toán",
  email: "Email",
  phone: "Điện thoại",
  address: "Địa chỉ",
  role: "Vai trò",
  active: "Kích hoạt",
  isPublished: "Đã xuất bản",
  itemCount: "Số lượng sản phẩm",
  before: "Trước khi thay đổi",
  after: "Sau khi thay đổi",
};

// Component to render data recursively
const DataViewer = ({ data }: { data: any }) => {
  if (data === null || data === undefined) return <span className="text-gray-400">-</span>;

  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'object' && parsed !== null) {
        return <DataViewer data={parsed} />;
      }
    } catch {
      // Not JSON or parse failed
    }
    return <span>{data}</span>;
  }

  if (typeof data !== 'object') {
    return <span>{String(data)}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400">[]</span>;
    return (
      <div className="pl-4 border-l-2 border-gray-200 space-y-1 mt-1">
        {data.map((item, index) => (
          <div key={index} className="flex gap-2">
            <span className="text-gray-400 text-xs mt-1">-</span>
            <div><DataViewer data={item} /></div>
          </div>
        ))}
      </div>
    );
  }

  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-gray-400">{"{}"}</span>;

  return (
    <div className="space-y-1">
      {keys.map((key) => {
        // Skip internal fields if needed
        if (key === 'password' || key === 'hash') return null;

        const label = fieldLabels[key] || key;
        const value = data[key];

        // Special formatting
        let formattedValue = value;
        if (typeof value === 'boolean') formattedValue = value ? "Có" : "Không";
        if (key === 'price' || key === 'total' || key === 'discountAmount') {
          formattedValue = (typeof value === 'number' || typeof value === 'bigint' || !isNaN(Number(value))) ? formatPriceValue(Number(value)) : value;
        }

        return (
          <div key={key} className="text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">{label}: </span>
            {typeof value === 'object' && value !== null ? (
              <div className="pl-2 mt-1 border-l-2 border-gray-100 dark:border-gray-700">
                <DataViewer data={value} />
              </div>
            ) : (
              <span className="text-gray-900 dark:text-white">{typeof formattedValue === 'string' || typeof formattedValue === 'number' ? formattedValue : String(formattedValue)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [filters, setFilters] = useState({
    action: "",
    entity: "",
    startDate: "",
    endDate: "",
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const ITEMS_PER_PAGE = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditLogApi.getAll({
        ...filters,
        page,
        limit: ITEMS_PER_PAGE,
      });

      // Handle response - assuming response matches AuditLogResponse interface
      // Note: axiosClient interceptor returns T instead of AxiosResponse<T> in some cases
      const rawResponse = response as unknown as AuditLogResponse;
      const data = rawResponse.data;
      const meta = rawResponse.meta;

      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(meta?.total || data.length);
        setTotalPages(meta?.totalPages || 1);
      } else {
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      toast.error("Không thể tải nhật ký hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await auditLogApi.getStats(30);
      setStats(response.data || null);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats(null);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  };

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await auditLogApi.cleanup(90);
      toast.success(`Đã xóa ${result.data.deleted} bản ghi cũ`);
      fetchLogs();
      fetchStats();
    } catch (error) {
      toast.error("Không thể dọn dẹp log");
    } finally {
      setIsCleaning(false);
      setShowCleanupConfirm(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("CANCEL")) return "destructive";
    if (action.includes("CREATE")) return "default";
    if (action.includes("UPDATE") || action.includes("CHANGE")) return "secondary";
    if (action === "LOGIN") return "outline";
    if (action === "LOGIN_FAILED") return "destructive";
    return "outline";
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity))];

  // Marketing quick filters
  const applyMarketingFilter = () => {
    setFilters({
      ...filters,
      entity: "",
      action: "",
    });
    setPage(1);
  };

  const applyBannerFilter = () => {
    setFilters({
      ...filters,
      entity: "BANNER",
      action: "",
    });
    setPage(1);
  };

  const applyFlashSaleFilter = () => {
    setFilters({
      ...filters,
      entity: "FLASHSALE",
      action: "",
    });
    setPage(1);
  };

  const applyPostFilter = () => {
    setFilters({
      ...filters,
      entity: "POST",
      action: "",
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nhật ký hệ thống</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Theo dõi tất cả hoạt động trong hệ thống</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-red-600 hover:text-red-700"
          onClick={() => setShowCleanupConfirm(true)}
        >
          <Trash2 className="w-4 h-4" />
          Dọn dẹp log cũ
        </Button>
      </div>

      {/* Marketing Quick Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc nhanh Marketing</CardTitle>
          <CardDescription>
            Xem nhanh các hoạt động marketing quan trọng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filters.entity === "" ? "default" : "outline"}
              onClick={applyMarketingFilter}
              className="gap-2"
            >
              Tất cả
            </Button>
            <Button
              variant={filters.entity === "BANNER" ? "default" : "outline"}
              onClick={applyBannerFilter}
              className="gap-2"
            >
              <Image className="w-4 h-4" />
              Banner
            </Button>
            <Button
              variant={filters.entity === "FLASHSALE" ? "default" : "outline"}
              onClick={applyFlashSaleFilter}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Flash Sale
            </Button>
            <Button
              variant={filters.entity === "POST" ? "default" : "outline"}
              onClick={applyPostFilter}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Bài viết
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tổng hoạt động (30 ngày)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {stats.dailyActivity.reduce((sum, d) => sum + d.count, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Hoạt động phổ biến nhất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {stats.topActions[0]?.action
                  ? auditActionLabels[stats.topActions[0].action] || stats.topActions[0].action
                  : "-"}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.topActions[0]?.count || 0} lần
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Trung bình/ngày
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {stats.dailyActivity.length > 0
                  ? Math.round(
                    stats.dailyActivity.reduce((sum, d) => sum + d.count, 0) /
                    stats.dailyActivity.length
                  )
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Hành động</Label>
              <Select
                value={filters.action}
                onValueChange={(value) => handleFilterChange("action", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả hành động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {auditActionLabels[action] || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Đối tượng</Label>
              <Select
                value={filters.entity}
                onValueChange={(value) => handleFilterChange("entity", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả đối tượng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {uniqueEntities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {auditEntityLabels[entity] || entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Lịch sử hoạt động
          </CardTitle>
          <CardDescription>
            Hiển thị {logs.length} / {total} bản ghi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Không có hoạt động nào được ghi nhận
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Đối tượng</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm dark:text-gray-300">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <div>
                              <p className="font-medium text-sm dark:text-white">{log.user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{log.user.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Hệ thống</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionColor(log.action)}>
                          {auditActionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm dark:text-gray-300">
                          {auditEntityLabels[log.entity] || log.entity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-1 py-0.5 rounded">
                          {log.entityId || "-"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {log.ipAddress || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                          Chi tiết
                        </Button>
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

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết nhật ký hoạt động</DialogTitle>
            <DialogDescription>
              ID: {selectedLog?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-500 dark:text-gray-400">Thời gian</h4>
                <p className="text-sm font-medium dark:text-white">{selectedLog && formatDate(selectedLog.createdAt)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-500 dark:text-gray-400">IP Address</h4>
                <p className="text-sm font-medium dark:text-white">{selectedLog?.ipAddress || "-"}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-500 dark:text-gray-400">Hành động</h4>
                <Badge variant={selectedLog ? getActionColor(selectedLog.action) : "default"}>
                  {selectedLog && (auditActionLabels[selectedLog.action] || selectedLog.action)}
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-500 dark:text-gray-400">Đối tượng</h4>
                <p className="text-sm font-medium dark:text-white">
                  {selectedLog && (auditEntityLabels[selectedLog.entity] || selectedLog.entity)}
                  <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">({selectedLog?.entityId})</span>
                </p>
              </div>
            </div>

            {selectedLog?.user && (
              <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                <h4 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">Người thực hiện</h4>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <div>
                    <span className="text-sm font-medium mr-2 dark:text-white">{selectedLog.user.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({selectedLog.user.email})</span>
                  </div>
                </div>
              </div>
            )}

            {selectedLog?.oldData && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-amber-600">
                  {selectedLog.action.includes('UPDATE') ? 'Dữ liệu cũ' : 'Chi tiết'}
                </h4>
                <div className="bg-gray-50 p-4 rounded-md border text-sm max-h-60 overflow-y-auto">
                  <DataViewer data={selectedLog.oldData} />
                </div>
              </div>
            )}

            {selectedLog?.newData && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-green-600">Dữ liệu mới</h4>
                <div className="bg-gray-50 p-4 rounded-md border text-sm max-h-60 overflow-y-auto">
                  <DataViewer data={selectedLog.newData} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showCleanupConfirm}
        onOpenChange={(open) => !open && setShowCleanupConfirm(false)}
        onConfirm={handleCleanup}
        title="Xác nhận dọn dẹp log"
        description="Bạn có chắc chắn muốn xóa các log cũ hơn 90 ngày? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        variant="destructive"
        isLoading={isCleaning}
      />
    </div>
  );
}

