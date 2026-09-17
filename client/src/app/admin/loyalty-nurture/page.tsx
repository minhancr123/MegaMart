"use client";

import { useEffect, useState } from "react";
import { 
  BadgeCheck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Mail, 
  Bot, 
  Star, 
  Ticket, 
  XCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchLoyaltyNurtureQueue, approveLoyaltyNurture, rejectLoyaltyNurture, type LoyaltyNurtureQueueItem } from "@/lib/loyaltyAdminApi";
import { toast } from "sonner";
import Link from "next/link";

export default function LoyaltyNurturePage() {
  const [queue, setQueue] = useState<LoyaltyNurtureQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await fetchLoyaltyNurtureQueue("PENDING");
      setQueue(data);
    } catch {
      toast.error("Không thể tải hàng chờ loyalty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("Xác nhận duyệt ưu đãi và gửi email tặng voucher cho khách?")) return;
    setProcessingId(id);
    try {
      await approveLoyaltyNurture(id);
      toast.success("Đã duyệt và gửi email thành công");
      loadQueue();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Duyệt thất bại");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const note = prompt("Lý do từ chối (tùy chọn):");
    if (note === null) return;
    setProcessingId(id);
    try {
      await rejectLoyaltyNurture(id, note);
      toast.success("Đã từ chối ưu đãi");
      loadQueue();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Từ chối thất bại");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Nuôi dưỡng Loyalty" 
        description="Duyệt các ưu đãi cá nhân hóa do AI Agent soạn thảo cho khách hàng tiềm năng."
      />

      <Card className="rounded-3xl overflow-hidden py-0 border-zinc-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Khách hàng</TableHead>
              <TableHead>Phân khúc</TableHead>
              <TableHead>Voucher đề xuất</TableHead>
              <TableHead>Nội dung gửi khách</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <AdminTableSkeleton columns={5} />
            ) : queue.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <AdminEmptyState 
                    icon={Bot} 
                    title="Hàng chờ trống" 
                    description="Hiện không có ưu đãi nào cần duyệt. AI Agent sẽ quét và soạn thảo vào sáng thứ 2 hàng tuần."
                  />
                </TableCell>
              </TableRow>
            ) : (
              queue.map((item) => (
                <TableRow key={item.id} className="align-top">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <Link href={`/admin/users/${item.user.id}`} className="font-bold text-zinc-900 hover:text-[#ff4d00] hover:underline">
                        {item.user.name || "Khách hàng"}
                      </Link>
                      <span className="text-[10px] text-zinc-500">{item.user.email}</span>
                      <span className="mt-1 text-[10px] text-zinc-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant={item.segment === 'NEAR_TIER' ? 'info' : item.segment === 'DORMANT' ? 'warning' : 'secondary'} className="text-[10px]">
                      {item.segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-2 text-xs">
                      <p className="font-black text-[#ff4d00]">{new Intl.NumberFormat('vi-VN').format(item.voucher.value)}₫</p>
                      <p className="text-[10px] text-zinc-500">Đơn từ {new Intl.NumberFormat('vi-VN').format(item.voucher.minOrderValue || 0)}₫</p>
                      <p className="mt-1 font-mono text-[9px] font-bold text-zinc-400">{item.voucher.code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 max-w-[300px]">
                    <p className="text-xs leading-relaxed text-zinc-600 line-clamp-3">{item.message}</p>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(item.id)}
                        disabled={!!processingId}
                        className="bg-[#ff4d00] hover:bg-[#d94100] h-8 rounded-xl text-[11px] font-bold shadow-sm"
                      >
                        {processingId === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />} Duyệt & Gửi
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleReject(item.id)}
                        disabled={!!processingId}
                        className="text-zinc-400 hover:text-red-600 h-8 rounded-xl text-[11px]"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" /> Từ chối
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
