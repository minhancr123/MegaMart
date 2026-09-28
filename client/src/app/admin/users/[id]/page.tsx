"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  BadgeCheck, 
  Calendar, 
  Clock, 
  CreditCard, 
  Eye, 
  Gift, 
  History, 
  MessageSquare,
  Tag,
  Ticket,
  Copy,
  Activity,
  Loader2, 
  Mail, 
  MoreVertical, 
  Package, 
  Phone, 
  Plus, 
  RotateCcw, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  User, 
  Wallet 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchCustomer360, adjustUserWallet, adjustUserPoints, type Customer360Response } from "@/lib/adminApi";
import { crmApi, getCrmSegmentLabel, getCrmTimelineTypeLabel, type CustomerNote, type CustomerTag, type TimelineItem } from "@/lib/crmApi";
import { getAssignedVouchers, type AssignedVoucher } from "@/lib/voucherApi";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { toast } from "sonner";
import { formatDate, formatPrice, getErrorMessage } from "@/lib/utils";
import Link from "next/link";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<Customer360Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [vouchers, setVouchers] = useState<AssignedVoucher[]>([]);
  const [selectedTagId, setSelectedTagId] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [activeTab, setActiveTab] = useState("orders");

  // Modals
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletForm, setWalletModalForm] = useState({ amount: "", reason: "", type: "ADJUSTMENT" });
  const [walletSaving, setWalletSaving] = useState(false);

  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [pointsForm, setPointsModalForm] = useState({ amount: "", reason: "", type: "BONUS" });
  const [pointsSaving, setPointsSaving] = useState(false);

  const loadData = async () => {
    try {
      if (!data) setLoading(true);
      const [res, crmTags, crmTimeline, crmNotes, assignedVouchers] = await Promise.all([
        fetchCustomer360(userId),
        crmApi.getTags().catch(() => []),
        crmApi.getTimeline(userId).catch(() => []),
        crmApi.getNotes(userId).catch(() => []),
        getAssignedVouchers(userId).catch(() => []),
      ]);
      setData(res);
      setTags(crmTags);
      setTimeline(crmTimeline);
      setNotes(crmNotes);
      setVouchers(assignedVouchers);
    } catch (err: any) {
      toast.error("Không thể tải thông tin khách hàng");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  const handleAdjustWallet = async () => {
    if (!walletForm.amount || !walletForm.reason) return toast.error("Vui lòng nhập đầy đủ");
    setWalletSaving(true);
    try {
      await adjustUserWallet(userId, Number(walletForm.amount), walletForm.reason);
      toast.success("Đã điều chỉnh ví thành công");
      setWalletModalOpen(false);
      setWalletModalForm({ amount: "", reason: "", type: "ADJUSTMENT" });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Điều chỉnh thất bại");
    } finally {
      setWalletSaving(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!pointsForm.amount || !pointsForm.reason) return toast.error("Vui lòng nhập đầy đủ");
    setPointsSaving(true);
    try {
      await adjustUserPoints(userId, Number(pointsForm.amount), pointsForm.reason, pointsForm.type);
      toast.success("Đã điều chỉnh điểm thành công");
      setPointsModalOpen(false);
      setPointsModalForm({ amount: "", reason: "", type: "BONUS" });
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Điều chỉnh thất bại");
    } finally {
      setPointsSaving(false);
    }
  };

  const handleAssignTag = async () => {
    if (!selectedTagId) return toast.error("Chọn tag cần gắn");
    try {
      await crmApi.assignTag(userId, selectedTagId);
      toast.success("Đã gắn tag khách hàng");
      setSelectedTagId("");
      loadData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không gắn được tag"));
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return toast.error("Nhập nội dung ghi chú");
    try {
      await crmApi.createNote(userId, { content: noteContent.trim() });
      toast.success("Đã thêm ghi chú");
      setNoteContent("");
      loadData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Không thêm được ghi chú"));
    }
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-zinc-500">Đang tải hồ sơ 360...</p>
      </div>
    );
  }

  const { user, financial, stats } = data;
  const crm = (data as any).crm || {};
  const assignedTags: CustomerTag[] = crm.tags || [];
  const formatVoucherValue = (voucher: AssignedVoucher) => voucher.type === "PERCENT"
    ? `${voucher.value}%${voucher.maxDiscount ? ` (tối đa ${formatPrice(voucher.maxDiscount)})` : ""}`
    : formatPrice(voucher.value ?? 0, "0 ₫");
  const voucherStatus = (voucher: AssignedVoucher) => {
    const now = new Date();
    if (!voucher.active) return { label: "Vô hiệu hóa", className: "bg-zinc-100 text-zinc-600" };
    if ((voucher.usages?.length || 0) > 0 || (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit)) return { label: "Đã sử dụng", className: "bg-blue-100 text-blue-700" };
    if (voucher.endDate && new Date(voucher.endDate) < now) return { label: "Hết hạn", className: "bg-red-100 text-red-700" };
    if (voucher.startDate && new Date(voucher.startDate) > now) return { label: "Chưa kích hoạt", className: "bg-amber-100 text-amber-700" };
    return { label: "Khả dụng", className: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/admin/users")} className="rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">{user.name || "Khách hàng"}</h1>
              <Badge variant={user.role === 'ADMIN' ? 'info' : user.role === 'SHIPPER' ? 'warning' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5" /> {user.email} · <Calendar className="h-3.5 w-3.5" /> Tham gia {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm">
        <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">
              Sức khỏe {crm.healthScore ?? "--"}/100
            </Badge>
            <Badge className="rounded-full bg-orange-50 text-primary border-orange-200" variant="outline">
              Phân khúc: {getCrmSegmentLabel(crm.segment)}
            </Badge>
            {assignedTags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="rounded-full gap-1" style={{ borderColor: tag.color, color: tag.color }}>
                <Tag className="h-3 w-3" />{tag.name}
                <button
                  type="button"
                  className="ml-1 rounded-full px-1 hover:bg-zinc-100"
                  onClick={async () => {
                    try {
                      await crmApi.removeTag(userId, tag.id);
                      toast.success("Đã gỡ tag");
                      loadData();
                    } catch {
                      toast.error("Không gỡ được tag");
                    }
                  }}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 sm:min-w-[320px]">
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Gắn nhãn khách hàng" /></SelectTrigger>
              <SelectContent>
                {tags.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAssignTag} className="rounded-xl ">Gắn nhãn</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-3xl border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-primary">
                <Wallet className="h-6 w-6" />
              </div>
              <Button size="sm" variant="ghost" className="text-[11px] font-bold text-primary" onClick={() => setWalletModalOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Nạp/Trừ tiền
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Ví MegaMart</p>
              <p className="text-3xl font-black text-zinc-900 mt-1">{formatPrice(financial.walletBalance, "0 ₫")}</p>
              <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">Trạng thái: {financial.walletStatus}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-600">
                <Award className="h-6 w-6" />
              </div>
              <Button size="sm" variant="ghost" className="text-[11px] font-bold text-blue-600" onClick={() => setPointsModalOpen(true)}>
                <Gift className="mr-1 h-3 w-3" /> Tặng điểm
              </Button>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Hạng: {financial.tierIcon} {financial.tierName}</p>
              </div>
              <p className="text-3xl font-black text-zinc-900 mt-1">{financial.loyaltyPoints.toLocaleString("vi-VN")} đ</p>
              <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">Tích lũy trọn đời: {financial.lifetimePoints.toLocaleString("vi-VN")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-600">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Mua sắm (LTV)</p>
              <p className="text-3xl font-black text-zinc-900 mt-1">{formatPrice(stats.totalSpent, "0 ₫")}</p>
              <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">Tổng {stats.totalOrders} đơn hàng</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-100 p-1 rounded-2xl">
          <TabsTrigger value="orders" className="rounded-xl gap-2"><Package className="h-4 w-4" /> Đơn hàng</TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-xl gap-2"><Wallet className="h-4 w-4" /> Ví tiền</TabsTrigger>
          <TabsTrigger value="points" className="rounded-xl gap-2"><Award className="h-4 w-4" /> Điểm thưởng</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-xl gap-2"><Activity className="h-4 w-4" /> Timeline</TabsTrigger>
          <TabsTrigger value="vouchers" className="rounded-xl gap-2"><Ticket className="h-4 w-4" /> Mã giảm ({vouchers.length})</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-xl gap-2"><MessageSquare className="h-4 w-4" /> Ghi chú</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="rounded-3xl overflow-hidden py-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Ngày đặt</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.recentOrders.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-400">Chưa có đơn hàng nào</TableCell></TableRow>
                ) : data.recentOrders.map(o => (
                  <TableRow key={o.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/admin/orders/${o.id}`)}>
                    <TableCell className="font-mono font-bold text-primary">#{o.code}</TableCell>
                    <TableCell className="text-xs text-zinc-500">{formatDate(o.createdAt, { withTime: true })}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-xs">{o.itemCount} SP</TableCell>
                      <TableCell className="text-right font-bold">{formatPrice(o.total, "0 ₫")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card className="rounded-3xl overflow-hidden py-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Biến động</TableHead>
                  <TableHead>Số dư sau</TableHead>
                  <TableHead>Nội dung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.recentWalletTransactions.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-400">Chưa có giao dịch ví nào</TableCell></TableRow>
                ) : data.recentWalletTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-zinc-500">{formatDate(t.createdAt, { withTime: true })}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.type === "BONUS" ? "Thưởng" : t.type === "ADJUSTMENT" || t.type === "ADJUST" ? "Điều chỉnh" : t.type}</Badge></TableCell>
                    <TableCell className={`font-bold ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.amount > 0 ? "+" : ""}{formatPrice(t.amount, "0 ₫")}
                    </TableCell>
                      <TableCell className="text-xs font-medium">{formatPrice(t.balanceAfter, "0 ₫")}</TableCell>
                    <TableCell className="text-xs text-zinc-600">{t.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card className="rounded-3xl overflow-hidden py-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Số dư sau</TableHead>
                  <TableHead>Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.recentPointTransactions.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-400">Chưa có lịch sử điểm</TableCell></TableRow>
                ) : data.recentPointTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-zinc-500">{formatDate(t.createdAt, { withTime: true })}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.type === "BONUS" ? "Thưởng" : t.type === "ADJUSTMENT" || t.type === "ADJUST" ? "Điều chỉnh" : t.type}</Badge></TableCell>
                    <TableCell className={`font-black ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.amount > 0 ? "+" : ""}{Number(t.amount).toLocaleString("vi-VN")} điểm
                    </TableCell>
                      <TableCell className="text-xs font-medium">{Number(t.balanceAfter).toLocaleString("vi-VN")} điểm</TableCell>
                    <TableCell className="text-xs text-zinc-600">{t.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="rounded-3xl p-5">
            <div className="space-y-4">
              {!timeline.length ? (
                <p className="py-10 text-center text-sm text-zinc-400">Chưa có hoạt động chăm sóc khách hàng</p>
              ) : timeline.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4">
                  <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-primary shadow-sm">
                    {item.type === 'ORDER' ? <Package className="h-4 w-4" /> : item.type === 'WALLET' ? <Wallet className="h-4 w-4" /> : item.type === 'LOYALTY' ? <Award className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-sm text-zinc-900">{item.title || getCrmTimelineTypeLabel(item.type)}</p>
                      <span className="text-[11px] text-zinc-400">{formatDate(item.timestamp, { withTime: true })}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="vouchers">
          <Card className="rounded-3xl overflow-hidden py-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Mã giảm</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Điều kiện</TableHead>
                  <TableHead>Thời hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Đơn đã dùng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!vouchers.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-400">Khách hàng chưa được cấp mã giảm riêng</TableCell></TableRow>
                ) : vouchers.map((voucher) => {
                  const status = voucherStatus(voucher);
                  const usedOrder = voucher.usages?.[0]?.order;
                  return (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{voucher.code}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard?.writeText(voucher.code); toast.success("Đã copy mã giảm"); }}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-zinc-500">{voucher.title}</p>
                      </TableCell>
                      <TableCell className="font-bold">{formatVoucherValue(voucher)}</TableCell>
                      <TableCell className="text-xs text-zinc-600">Đơn tối thiểu {formatPrice(voucher.minOrderValue ?? 0, "0 ₫")}</TableCell>
                      <TableCell className="text-xs text-zinc-500">{voucher.endDate ? formatDate(voucher.endDate) : "Không giới hạn"}</TableCell>
                      <TableCell><Badge className={status.className}>{status.label}</Badge></TableCell>
                      <TableCell className="text-xs">{usedOrder ? <Link href={`/admin/orders/${usedOrder.id}`} className="font-bold text-primary hover:underline">#{usedOrder.code}</Link> : "Chưa dùng"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="rounded-3xl p-5 space-y-4">
            <div className="flex gap-2">
              <Input placeholder="Thêm ghi chú CSKH..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Button onClick={handleAddNote}>Thêm</Button>
            </div>
            <div className="space-y-3">
              {!notes.length ? (
                <p className="py-8 text-center text-sm text-zinc-400">Chưa có ghi chú</p>
              ) : notes.map((note) => (
                <div key={note.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-zinc-500">{note.author?.name || note.author?.email || 'Admin'} · {formatDate(note.createdAt, { withTime: true })}</p>
                    <div className="flex items-center gap-2">
                      {note.isPinned && <Badge variant="outline" className="rounded-full text-[10px]">Đã ghim</Badge>}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        onClick={async () => {
                          try {
                            await crmApi.pinNote(note.id, !note.isPinned);
                            loadData();
                          } catch {
                            toast.error("Không cập nhật được ghi chú");
                          }
                        }}
                      >
                        {note.isPinned ? "Bỏ ghim" : "Ghim"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px] text-red-600 hover:text-red-700"
                        onClick={async () => {
                          try {
                            await crmApi.deleteNote(note.id);
                            toast.success("Đã xóa ghi chú");
                            loadData();
                          } catch {
                            toast.error("Không xóa được ghi chú");
                          }
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wallet Modal */}
      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Điều chỉnh Ví MegaMart</DialogTitle>
            <DialogDescription>Cộng hoặc trừ tiền trực tiếp vào ví của khách hàng.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Số tiền (VND) - Dùng dấu âm (-) để trừ</Label>
              <Input type="number" placeholder="Ví dụ: 50000" value={walletForm.amount} onChange={e => setWalletModalForm({...walletForm, amount: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Lý do điều chỉnh</Label>
              <Input placeholder="Ví dụ: Hoàn tiền sự cố vận chuyển" value={walletForm.reason} onChange={e => setWalletModalForm({...walletForm, reason: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalletModalOpen(false)}>Hủy</Button>
            <Button onClick={handleAdjustWallet} disabled={walletSaving} className="bg-primary">
              {walletSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points Modal */}
      <Dialog open={pointsModalOpen} onOpenChange={setPointsModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Tặng điểm thưởng</DialogTitle>
            <DialogDescription>Điều chỉnh điểm loyalty cho khách hàng.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Số điểm - Dùng dấu âm (-) để trừ</Label>
              <Input type="number" placeholder="Ví dụ: 100" value={pointsForm.amount} onChange={e => setPointsModalForm({...pointsForm, amount: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Loại</Label>
              <Select value={pointsForm.type} onValueChange={v => setPointsModalForm({...pointsForm, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BONUS">Thưởng điểm</SelectItem>
                  <SelectItem value="ADJUST">Điều chỉnh điểm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Lý do</Label>
              <Input placeholder="Ví dụ: Tri ân khách hàng thân thiết" value={pointsForm.reason} onChange={e => setPointsModalForm({...pointsForm, reason: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleAdjustPoints} disabled={pointsSaving} className="bg-blue-600">
              {pointsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
