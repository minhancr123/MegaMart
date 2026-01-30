"use client";
import { useState, useEffect } from "react";
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
import { Search, Calendar, User, History, Trash2, BarChart3, Image, Zap, FileText } from "lucide-react";
import { 
  auditLogApi, 
  AuditLog, 
  AuditLogStats,
  auditActionLabels, 
  auditEntityLabels 
} from "@/lib/auditLogApi";
import { toast } from "sonner";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    action: "",
    entity: "",
    startDate: "",
    endDate: "",
  });

  const ITEMS_PER_PAGE = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await auditLogApi.getAll({
        ...filters,
        page,
        limit: ITEMS_PER_PAGE,
      });
      
      // Handle response - could be direct data or nested
      const responseData = response.data;
      if (responseData && responseData.data) {
        setLogs(responseData.data || []);
        setTotal(responseData.meta?.total || 0);
        setTotalPages(responseData.meta?.totalPages || 1);
      } else if (Array.isArray(response.data)) {
        setLogs(response.data || []);
        setTotal(response.data.length || 0);
        setTotalPages(1);
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
    if (!confirm("Bạn có chắc chắn muốn xóa các log cũ hơn 90 ngày?")) return;
    try {
      const result = await auditLogApi.cleanup(90);
      toast.success(`Đã xóa ${result.data.deleted} bản ghi cũ`);
      fetchLogs();
      fetchStats();
    } catch (error) {
      toast.error("Không thể dọn dẹp log");
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
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký hệ thống</h1>
          <p className="text-gray-500 mt-1">Theo dõi tất cả hoạt động trong hệ thống</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2 text-red-600 hover:text-red-700"
          onClick={handleCleanup}
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
              <CardTitle className="text-sm font-medium text-gray-500">
                Tổng hoạt động (30 ngày)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.dailyActivity.reduce((sum, d) => sum + d.count, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Hoạt động phổ biến nhất
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.topActions[0]?.action 
                  ? auditActionLabels[stats.topActions[0].action] || stats.topActions[0].action
                  : "-"}
              </div>
              <p className="text-sm text-gray-500">
                {stats.topActions[0]?.count || 0} lần
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Trung bình/ngày
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
            <div className="text-center py-8 text-gray-500">
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
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        {log.user ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{log.user.name}</p>
                              <p className="text-xs text-gray-500">{log.user.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Hệ thống</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionColor(log.action)}>
                          {auditActionLabels[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {auditEntityLabels[log.entity] || log.entity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {log.entityId || "-"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">
                          {log.ipAddress || "-"}
                        </span>
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
