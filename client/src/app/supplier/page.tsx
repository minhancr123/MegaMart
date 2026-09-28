"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { PackageSearch, Building2, Inbox } from "lucide-react";
import { supplierApi, type SupplierProfile, type SupplierPurchaseOrder } from "@/lib/supplierApi";
import { toast } from "sonner";

import {
  PO_STATUS_STYLE as STATUS_STYLE,
  PO_STATUS_LABEL_SUPPLIER as STATUS_LABEL,
} from "@/lib/inventoryStatus";

const ITEMS_PER_PAGE = 10;

function SupplierOrderCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SupplierDashboard() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [orders, setOrders] = useState<SupplierPurchaseOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const initialLoadedRef = useRef(false);
  const ordersSeqRef = useRef(0);

  const loadInitial = useCallback(async () => {
    try {
      setInitialLoading(true);
      const [prof, list] = await Promise.all([
        supplierApi.getProfile(),
        supplierApi.getPurchaseOrders({ status: undefined, page: 1, limit: ITEMS_PER_PAGE }),
      ]);
      setProfile(prof);
      setOrders(list.items);
      setTotal(list.meta.total);
      setTotalPages(list.meta.totalPages);
    } catch (error) {
      console.error("Failed to load supplier data", error);
      toast.error("Không tải được dữ liệu. Vui lòng đăng nhập lại.");
    } finally {
      setInitialLoading(false);
      initialLoadedRef.current = true;
    }
  }, []);

  const loadOrders = useCallback(async (nextPage: number, nextStatus: string) => {
    const seq = (ordersSeqRef.current += 1);
    try {
      setOrdersLoading(true);
      const list = await supplierApi.getPurchaseOrders({
        status: nextStatus || undefined,
        page: nextPage,
        limit: ITEMS_PER_PAGE,
      });
      if (seq !== ordersSeqRef.current) return;
      setOrders(list.items);
      setTotal(list.meta.total);
      setTotalPages(list.meta.totalPages);
    } catch (error) {
      if (seq !== ordersSeqRef.current) return;
      console.error("Failed to load supplier orders", error);
      toast.error("Không tải được danh sách đơn đặt hàng.");
    } finally {
      if (seq === ordersSeqRef.current) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!initialLoadedRef.current) return;
    loadOrders(page, status);
  }, [page, status, loadOrders]);

  return (
    <div className="space-y-6">
      <Card>
        {initialLoading ? (
          <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-56 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </div>
            <div className="flex gap-5 shrink-0">
              <div className="text-center space-y-1.5">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-center space-y-1.5">
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </CardContent>
        ) : (
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
            {(() => {
              const extra = [profile?.ward, profile?.district, profile?.province].filter(Boolean).join(", ");
              const base = profile?.address?.trim() || "";
              const full = base && extra && !base.includes(extra.split(", ")[0] as string)
                ? `${base}, ${extra}`
                : base || extra;
              return full ? (
                <p className="mt-1 text-xs text-muted-foreground truncate">{full}</p>
              ) : null;
            })()}
            {profile?.lat != null && profile?.lng != null && Number.isFinite(Number(profile.lat)) && Number.isFinite(Number(profile.lng)) && Number(profile.lat) !== 0 && Number(profile.lng) !== 0 ? (
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => window.open(`https://www.google.com/maps?q=${profile.lat},${profile.lng}`, "_blank")}
              >
                Xem vị trí kho trên Google Maps
              </button>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">Kho chưa được ghim vị trí Google Maps</p>
            )}
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
        )}
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Inbox className="w-4 h-4 text-primary" /> Đơn đặt hàng ({total})
        </h2>
        <Select
          value={status || "all"}
          onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}
          disabled={initialLoading}
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

      {initialLoading || ordersLoading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <SupplierOrderCardSkeleton />
          <SupplierOrderCardSkeleton />
          <SupplierOrderCardSkeleton />
        </div>
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
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE.CANCELLED}`}>
                            {STATUS_LABEL.CANCELLED}
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

      {!initialLoading && !ordersLoading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={ITEMS_PER_PAGE} />
      )}
    </div>
  );
}
