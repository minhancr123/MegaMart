"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Plus, FileText, Search } from "lucide-react";
import {
  inventoryApi,
  type PurchaseOrder,
  PurchaseOrderStatus,
} from "@/lib/inventoryApi";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-500 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi NCC",
  PARTIAL: "Nhập một phần",
  COMPLETED: "Nhập đủ",
  CANCELLED: "Đã hủy",
};

const ITEMS_PER_PAGE = 20;

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await inventoryApi.getPurchaseOrders({
        status: status || undefined,
        search: search || undefined,
        page,
        limit: ITEMS_PER_PAGE,
      });
      const payload = res?.data ?? res;
      setOrders(payload?.data ?? (Array.isArray(payload) ? payload : []));
      setTotal(payload?.meta?.total ?? 0);
      setTotalPages(payload?.meta?.totalPages ?? 1);
    } catch (error) {
      console.error("Failed to load purchase orders", error);
      toast.error("Không thể tải danh sách PO");
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Đơn đặt hàng NCC (PO)"
        description={`Quản lý đặt hàng nhà cung cấp (${total})`}
        actions={
          <Link href="/admin/inventory/purchase-orders/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Tạo PO
            </Button>
          </Link>
        }
      />

      <Card className="gap-0 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã PO..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.values(PurchaseOrderStatus).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Mã PO</TableHead>
              <TableHead>Nhà cung cấp</TableHead>
              <TableHead>Kho nhận</TableHead>
              <TableHead className="text-center">Mặt hàng</TableHead>
              <TableHead>Ngày mong về</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <AdminTableSkeleton columns={6} />
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <AdminEmptyState
                    icon={FileText}
                    title="Chưa có PO nào"
                    description="Tạo đơn đặt hàng đầu tiên gửi nhà cung cấp."
                  />
                </TableCell>
              </TableRow>
            ) : (
              orders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>
                    <Link
                      href={`/admin/inventory/purchase-orders/${po.id}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {po.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{po.supplier?.name || "-"}</TableCell>
                  <TableCell className="text-sm">{po.warehouse?.code || "-"}</TableCell>
                  <TableCell className="text-center text-sm">
                    {po._count?.items ?? po.items?.length ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("vi-VN") : "-"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[po.status] ?? STATUS_STYLE.DRAFT}`}
                    >
                      {STATUS_LABEL[po.status] ?? po.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={total}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}
    </div>
  );
}
