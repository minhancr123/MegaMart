"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { PackageSearch, Building2, Inbox } from "lucide-react";
import { supplierApi, type SupplierProfile, type SupplierPurchaseOrder } from "@/lib/supplierApi";
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
  SENT: "Mới (chờ xác nhận)",
  PARTIAL: "Nhập một phần",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const ITEMS_PER_PAGE = 10;

export default function SupplierDashboard() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [orders, setOrders] = useState<SupplierPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prof, list] = await Promise.all([
        supplierApi.getProfile(),
        supplierApi.getPurchaseOrders({ status: status || undefined, page, limit: ITEMS_PER_PAGE }),
      ]);
      setProfile(prof);
      setOrders(list.items);
      setTotal(list.meta.total);
      setTotalPages(list.meta.totalPages);
    } catch (error) {
      console.error("Failed to load supplier data", error);
      toast.error("Không tải được dữ liệu. Vui lòng đăng nhập lại.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black truncate">
              {profile?.name || "Nhà cung cấp"} ({profile?.code || "..."})
            </h1>
            <p className="text-xs text-muted-foreground">
              {profile?.email || ""}{profile?.phone ? ` · ${profile.phone}` : ""}
            </p>
          </div>
          <div className="flex gap-5 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-black text-primary">{profile?.openPurchaseOrders ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">PO đang mở</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black">{profile?.totalPurchaseOrders ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Tổng PO</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Inbox className="w-4 h-4 text-primary" /> Đơn đặt hàng ({total})
        </h2>
        <Select
          value={status || "all"}
          onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-52 sm:ml-auto">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="SENT">Mới (chờ xác nhận)</SelectItem>
            <SelectItem value="PARTIAL">Nhập một phần</SelectItem>
            <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <AdminTableSkeleton columns={4} />
      ) : orders.length === 0 ? (
        <AdminEmptyState
          icon={PackageSearch}
          title="Chưa có đơn đặt hàng"
          description="Khi MegaMart đặt hàng, PO sẽ hiện ở đây để bạn xác nhận."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <Link key={po.id} href={`/supplier/${po.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-bold text-primary">{po.code}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Kho {po.warehouse?.name || ""} · {po._count?.items ?? po.items?.length ?? 0} mặt hàng
                      {po.expectedDate ? ` · Mong về ${new Date(po.expectedDate).toLocaleDateString("vi-VN")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      // 1 badge duy nhất, ưu tiên trạng thái cuối: Hủy > Đã xác nhận > trạng thái PO
                      if (po.status === "CANCELLED") {
                        return (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">
                            Đã hủy
                          </span>
                        );
                      }
                      if (po.confirmedAt) {
                        return (
                          <Badge variant="outline" className="text-green-700 border-green-300 text-[11px]">
                            Đã xác nhận
                          </Badge>
                        );
                      }
                      return (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[po.status] ?? STATUS_STYLE.DRAFT}`}>
                          {STATUS_LABEL[po.status] ?? po.status}
                        </span>
                      );
                    })()}
                    <Button size="sm" variant="outline">Chi tiết</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={ITEMS_PER_PAGE} />
      )}
    </div>
  );
}
