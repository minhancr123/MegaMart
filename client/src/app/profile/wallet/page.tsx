"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, Loader2 } from "lucide-react";
import { getMyWallet, type WalletMe } from "@/lib/walletApi";
import { toast } from "sonner";

const txTypeName = (t: string) => {
  switch (String(t).toUpperCase()) {
    case "REFUND":
      return "Hoàn tiền";
    case "ORDER_CANCEL_REFUND":
      return "Hủy đơn · hoàn ví";
    case "PAYMENT":
      return "Thanh toán";
    case "ADJUSTMENT":
      return "Điều chỉnh";
    default:
      return t;
  }
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyWallet()
      .then(setWallet)
      .catch((e: any) => toast.error(e?.response?.data?.message || "Không tải được ví"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải ví...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-orange-100 bg-gradient-to-br from-orange-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff4d00] text-white">
              <WalletIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ví MegaMart</p>
              <p className="text-3xl font-extrabold text-zinc-900">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(wallet?.balance || 0))}
              </p>
            </div>
            <Badge variant={wallet?.status === "ACTIVE" ? "default" : "destructive"} className="ml-auto">
              {wallet?.status === "ACTIVE" ? "Đang hoạt động" : wallet?.status}
            </Badge>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Số dư dùng để thanh toán đơn hàng (checkout) và nhận hoàn tiền COD / hủy đơn ngay lập tức.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-bold">Biến động số dư ({wallet?.transactions?.length || 0})</p>
          {(wallet?.transactions?.length || 0) === 0 && (
            <p className="text-xs text-muted-foreground">Chưa có giao dịch nào.</p>
          )}
          <div className="space-y-2">
            {(wallet?.transactions || []).map((t) => {
              const amt = Number(t.amount || 0);
              const isPlus = ["REFUND", "ORDER_CANCEL_REFUND", "ADJUSTMENT"].includes(String(t.type).toUpperCase());
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                  <div>
                    <p className="font-bold">
                      {txTypeName(t.type)} · <span className={isPlus ? "text-emerald-600" : "text-destructive"}>{isPlus ? "+" : "-"}{new Intl.NumberFormat("vi-VN").format(amt)}₫</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{t.description || t.orderId || t.refundRequestId || ""}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  <Badge variant="outline">Sau: {new Intl.NumberFormat("vi-VN").format(Number(t.balanceAfter || 0))}₫</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
