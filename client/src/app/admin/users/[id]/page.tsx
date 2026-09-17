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
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { toast } from "sonner";
import Link from "next/link";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<Customer360Response | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletForm, setWalletModalForm] = useState({ amount: "", reason: "", type: "ADJUSTMENT" });
  const [walletSaving, setWalletSaving] = useState(false);

  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [pointsForm, setPointsModalForm] = useState({ amount: "", reason: "", type: "BONUS" });
  const [pointsSaving, setPointsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchCustomer360(userId);
      setData(res);
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

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff4d00]" />
        <p className="text-sm font-medium text-zinc-500">Đang tải hồ sơ 360...</p>
      </div>
    );
  }

  const { user, financial, stats } = data;

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
              <Mail className="h-3.5 w-3.5" /> {user.email} · <Calendar className="h-3.5 w-3.5" /> Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-3xl border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-[#ff4d00]">
                <Wallet className="h-6 w-6" />
              </div>
              <Button size="sm" variant="ghost" className="text-[11px] font-bold text-[#ff4d00]" onClick={() => setWalletModalOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Nạp/Trừ tiền
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Ví MegaMart</p>
              <p className="text-3xl font-black text-zinc-900 mt-1">{new Intl.NumberFormat('vi-VN').format(financial.walletBalance)}₫</p>
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
              <p className="text-3xl font-black text-zinc-900 mt-1">{financial.loyaltyPoints.toLocaleString()} đ</p>
              <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">Tích lũy trọn đời: {financial.lifetimePoints.toLocaleString()}</p>
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
              <p className="text-3xl font-black text-zinc-900 mt-1">{new Intl.NumberFormat('vi-VN').format(stats.totalSpent)}₫</p>
              <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">Tổng {stats.totalOrders} đơn hàng</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="bg-zinc-100 p-1 rounded-2xl">
          <TabsTrigger value="orders" className="rounded-xl gap-2"><Package className="h-4 w-4" /> Đơn hàng</TabsTrigger>
          <TabsTrigger value="wallet" className="rounded-xl gap-2"><Wallet className="h-4 w-4" /> Ví tiền</TabsTrigger>
          <TabsTrigger value="points" className="rounded-xl gap-2"><Award className="h-4 w-4" /> Điểm thưởng</TabsTrigger>
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
                    <TableCell className="font-mono font-bold text-[#ff4d00]">#{o.code}</TableCell>
                    <TableCell className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-xs">{o.itemCount} SP</TableCell>
                    <TableCell className="text-right font-bold">{new Intl.NumberFormat('vi-VN').format(o.total)}₫</TableCell>
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
                    <TableCell className="text-xs text-zinc-500">{new Date(t.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.type}</Badge></TableCell>
                    <TableCell className={`font-bold ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.amount > 0 ? "+" : ""}{new Intl.NumberFormat('vi-VN').format(t.amount)}₫
                    </TableCell>
                    <TableCell className="text-xs font-medium">{new Intl.NumberFormat('vi-VN').format(t.balanceAfter)}₫</TableCell>
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
                    <TableCell className="text-xs text-zinc-500">{new Date(t.createdAt).toLocaleString('vi-VN')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{t.type}</Badge></TableCell>
                    <TableCell className={`font-black ${t.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()} đ
                    </TableCell>
                    <TableCell className="text-xs font-medium">{t.balanceAfter.toLocaleString()} đ</TableCell>
                    <TableCell className="text-xs text-zinc-600">{t.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <Button onClick={handleAdjustWallet} disabled={walletSaving} className="bg-[#ff4d00]">
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
                  <SelectItem value="BONUS">Thưởng (BONUS)</SelectItem>
                  <SelectItem value="ADJUST">Điều chỉnh (ADJUST)</SelectItem>
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
