"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Clock, Copy, Gift, Sparkles, Star, Ticket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMounted } from "@/hooks/useMounted";
import { useAuthStore } from "@/store/authStore";
import { LOYALTY_TIERS, REDEEMABLE_VOUCHERS, useLoyaltyStore } from "@/store/loyaltyStore";
import { getMyLoyalty, redeemLoyaltyVoucher, type LoyaltySummary } from "@/lib/loyaltyApi";
import { toast } from "sonner";

const transactionTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  earn: { label: "Tích điểm", color: "text-emerald-600", icon: <TrendingUp className="h-4 w-4" /> },
  EARN: { label: "Tích điểm", color: "text-emerald-600", icon: <TrendingUp className="h-4 w-4" /> },
  redeem: { label: "Đổi điểm", color: "text-red-600", icon: <Ticket className="h-4 w-4" /> },
  REDEEM: { label: "Đổi điểm", color: "text-red-600", icon: <Ticket className="h-4 w-4" /> },
  bonus: { label: "Thưởng", color: "text-[#ff4d00]", icon: <Gift className="h-4 w-4" /> },
  BONUS: { label: "Thưởng", color: "text-[#ff4d00]", icon: <Gift className="h-4 w-4" /> },
  expire: { label: "Hết hạn", color: "text-zinc-500", icon: <Clock className="h-4 w-4" /> },
};

export default function LoyaltyPage() {
  const mounted = useMounted();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"overview" | "redeem" | "history" | "my-vouchers">("overview");
  const [renderedAt] = useState(() => Date.now());
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { totalPoints, lifetimePoints, transactions, getCurrentTier } = useLoyaltyStore();

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getMyLoyalty();
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  if (!mounted) return null;

  const currentTotalPoints = summary?.totalPoints ?? totalPoints;
  const currentLifetimePoints = summary?.lifetimePoints ?? lifetimePoints;
  const currentTransactions = summary?.transactions ?? [];

  const currentTier = LOYALTY_TIERS.reduce((current, tier) => {
    if (currentLifetimePoints >= tier.minPoints) return tier;
    return current;
  }, LOYALTY_TIERS[0]);

  const nextTier = LOYALTY_TIERS.find((tier) => currentLifetimePoints < tier.minPoints) || null;
  
  let progress = 100;
  let pointsToNext = 0;
  if (nextTier) {
    const range = nextTier.minPoints - currentTier.minPoints;
    const progressVal = currentLifetimePoints - currentTier.minPoints;
    progress = Math.min(100, Math.round((progressVal / range) * 100));
    pointsToNext = nextTier.minPoints - currentLifetimePoints;
  }

  const handleRedeem = async (templateId: string) => {
    try {
      const result = await redeemLoyaltyVoucher(templateId);
      if (result.success) {
        toast.success(result.message);
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Đổi quà thất bại");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    toast.success(`Đã copy mã: ${code}`);
  };

  const getTimeAgo = (timestamp: any) => {
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const diff = renderedAt - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return days < 30 ? `${days} ngày trước` : new Date(ts).toLocaleDateString("vi-VN");
  };

  const tabs = [
    { key: "overview", label: "Đặc quyền hạng", icon: <Award className="h-4 w-4" /> },
    { key: "redeem", label: "Kho đổi voucher", icon: <Ticket className="h-4 w-4" /> },
    { key: "my-vouchers", label: "Voucher của tôi", icon: <Gift className="h-4 w-4" /> },
    { key: "history", label: "Lịch sử điểm", icon: <Clock className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff4d00]">MegaMart Rewards</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Chương trình Hội viên & Điểm thưởng</h1>
        <p className="mt-1 text-sm text-zinc-500">Tích điểm thật từ đơn hàng, thăng hạng hội viên và đổi voucher ưu đãi trong hệ thống.</p>
      </div>

      <Card className="relative overflow-hidden rounded-3xl border-0 bg-zinc-950 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ff4d00]/30 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl">{currentTier.icon}</div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-orange-200">MegaMart Rewards Card</p>
                  <h2 className="text-2xl font-black">{currentTier.name}</h2>
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-300">Chủ thẻ</p>
                <p className="text-xl font-bold">{user?.name || "Thành viên MegaMart"}</p>
                <p className="mt-1 font-mono text-xs text-zinc-400">{user?.id ? `MM-${user.id.slice(-8).toUpperCase()}` : "MM-MEMBER"}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm lg:min-w-[280px]">
              <p className="text-sm text-orange-100">Điểm khả dụng</p>
              <p className="mt-1 text-5xl font-black tracking-tight">{currentTotalPoints.toLocaleString()}</p>
              <p className="mt-1 text-xs text-zinc-300">Tích lũy trọn đời: {currentLifetimePoints.toLocaleString()} điểm</p>
            </div>
          </div>

          {nextTier ? (
            <div className="mt-7 rounded-2xl bg-white/10 p-4">
              <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-200">
                <span>{currentTier.icon} {currentTier.name}</span>
                <span>{nextTier.icon} {nextTier.name}</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
              <p className="mt-2 text-center text-xs text-zinc-300">Còn <b className="text-white">{pointsToNext.toLocaleString()}</b> điểm để lên hạng {nextTier.name}</p>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl bg-emerald-500/15 p-4 text-sm text-emerald-100">Bạn đã đạt hạng cao nhất. Cảm ơn bạn đã đồng hành cùng MegaMart!</div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 rounded-2xl bg-zinc-100 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition sm:flex-none sm:text-sm ${activeTab === tab.key ? "bg-white text-[#ff4d00] shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LOYALTY_TIERS.map((tier) => {
              const active = tier.name === currentTier.name;
              return (
                <Card key={tier.name} className={`rounded-3xl transition ${active ? "border-orange-300 shadow-md ring-4 ring-orange-100" : "border-zinc-200 opacity-80"}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <p className="font-black text-zinc-900">{tier.name}</p>
                        <p className="text-xs text-zinc-500">{tier.minPoints.toLocaleString()}+ điểm</p>
                      </div>
                      {active && <Badge className="ml-auto bg-[#ff4d00] text-white">Hiện tại</Badge>}
                    </div>
                    <div className="mt-4 space-y-2">
                      {tier.benefits.map((benefit) => (
                        <p key={benefit} className="flex items-start gap-2 text-xs text-zinc-600">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {benefit}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-3xl"><CardContent className="flex items-center gap-3 p-5"><TrendingUp className="h-8 w-8 rounded-2xl bg-emerald-50 p-2 text-emerald-600" /><div><p className="text-xs text-zinc-500">Điểm kiếm được</p><p className="text-xl font-black">+{currentTransactions.filter((t:any) => t.amount > 0).reduce((s:number, t:any) => s + t.amount, 0).toLocaleString()}</p></div></CardContent></Card>
            <Card className="rounded-3xl"><CardContent className="flex items-center gap-3 p-5"><Ticket className="h-8 w-8 rounded-2xl bg-red-50 p-2 text-red-600" /><div><p className="text-xs text-zinc-500">Điểm đã dùng</p><p className="text-xl font-black">{currentTransactions.filter((t:any) => t.amount < 0).reduce((s:number, t:any) => s + Math.abs(t.amount), 0).toLocaleString()}</p></div></CardContent></Card>
            <Card className="rounded-3xl"><CardContent className="flex items-center gap-3 p-5"><Sparkles className="h-8 w-8 rounded-2xl bg-orange-50 p-2 text-[#ff4d00]" /><div><p className="text-xs text-zinc-500">Giao dịch thực tế</p><p className="text-xl font-black">{currentTransactions.length}</p></div></CardContent></Card>
          </div>
        </div>
      )}

      {activeTab === "redeem" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-[#af3200]">
            Bạn đang có <b>{currentTotalPoints.toLocaleString()} điểm</b>. Chọn voucher phù hợp để đổi ngay vào hệ thống.
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {REDEEMABLE_VOUCHERS.map((voucher) => {
              const canAfford = currentTotalPoints >= voucher.pointsCost;
              return (
                <div key={voucher.id} className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm ${canAfford ? "border-orange-200" : "border-zinc-200 opacity-60"}`}>
                  <div className="absolute -left-4 top-1/2 h-8 w-8 rounded-full bg-[#f7f8fa]" />
                  <div className="absolute -right-4 top-1/2 h-8 w-8 rounded-full bg-[#f7f8fa]" />
                  <div className="border-b border-dashed border-zinc-200 p-5">
                    <p className="text-2xl font-black text-[#ff4d00]">{voucher.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">{voucher.description}</p>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <code className="rounded-xl bg-zinc-100 px-3 py-2 font-mono text-xs font-bold text-zinc-700">
                        {voucher.code}
                      </code>
                      <Badge variant="outline"><Star className="mr-1 h-3 w-3 fill-amber-400 text-amber-400" /> {voucher.pointsCost}</Badge>
                    </div>
                    <Button onClick={() => handleRedeem(voucher.id)} disabled={!canAfford} className="w-full rounded-xl bg-[#ff4d00] font-bold hover:bg-[#d94100]">
                      {canAfford ? "Đổi ngay" : `Cần thêm ${(voucher.pointsCost - currentTotalPoints).toLocaleString()} điểm`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "my-vouchers" && (
        <div className="space-y-4">
          {!summary?.redeemedVouchers?.length ? (
            <div className="flex flex-col items-center justify-center py-14 text-zinc-400">
              <Gift className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">Bạn chưa đổi voucher nào</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summary.redeemedVouchers.map((rv) => (
                <div key={rv.id} className={`relative overflow-hidden rounded-3xl border bg-white shadow-sm ${rv.isUsed ? "opacity-50" : "border-emerald-200"}`}>
                  <div className="absolute -left-4 top-1/2 h-8 w-8 rounded-full bg-[#f7f8fa]" />
                  <div className="absolute -right-4 top-1/2 h-8 w-8 rounded-full bg-[#f7f8fa]" />
                  <div className="border-b border-dashed border-zinc-200 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-black text-emerald-600">{rv.code}</p>
                      <Badge variant={rv.isUsed ? "secondary" : "success"}>{rv.isUsed ? "Đã dùng" : "Sẵn sàng"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">Hạn dùng: {new Date(rv.voucher?.endDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="p-5">
                    <Button variant="outline" size="sm" onClick={() => copyCode(rv.code)} className="w-full rounded-xl gap-2 font-bold">
                      <Copy className="h-4 w-4" /> Sao chép mã
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <Card className="rounded-3xl border-zinc-200 bg-white shadow-sm">
          <CardContent className="p-0">
            {currentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-zinc-400">
                <Clock className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">Chưa có giao dịch nào</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {currentTransactions.map((tx: any) => {
                  const config = transactionTypeConfig[tx.type];
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-zinc-50">
                      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>{config?.icon || <Sparkles className="h-4 w-4" />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-900">{tx.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{config?.label || tx.type}</Badge>
                          <span className="text-[10px] text-zinc-400">{getTimeAgo(tx.createdAt)}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 text-sm font-black ${config?.color || "text-zinc-900"}`}>{tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
