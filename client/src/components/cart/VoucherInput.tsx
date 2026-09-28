"use client";

import { useState } from "react";
import { Tag, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateVoucher } from "@/lib/voucherApi";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

interface VoucherInputProps {
  subtotal: number;
  onApplyVoucher: (discount: number, code: string) => void;
  appliedCode?: string;
  onRemoveVoucher?: () => void;
}

export const VoucherInput = ({
  subtotal,
  onApplyVoucher,
  appliedCode,
  onRemoveVoucher,
}: VoucherInputProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Vui lòng nhập mã khuyến mãi");
      return;
    }

    setLoading(true);
    try {
      const res = await validateVoucher(trimmed, subtotal, user?.id);
      if (res && res.discount > 0) {
        onApplyVoucher(res.discount, trimmed);
        toast.success(`Áp dụng mã ${trimmed} thành công!`);
        setCode("");
      } else {
        toast.error("Mã khuyến mãi không hợp lệ hoặc chưa đủ điều kiện");
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.errormassage || err?.response?.data?.message || err?.message || "Mã khuyến mãi không hợp lệ";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-[var(--success)]" />
          <div>
            <span className="text-xs text-muted-foreground block">Mã đã áp dụng</span>
            <span className="font-bold text-sm text-[var(--success)]">{appliedCode}</span>
          </div>
        </div>
        {onRemoveVoucher && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveVoucher}
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          >
            Hủy bỏ
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground">
        <Tag className="w-4 h-4 text-primary" />
        <span>Khuyến mãi / Mã giảm giá</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nhập mã ưu đãi"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="uppercase text-sm h-10 rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="h-10 px-4 rounded-xl shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
        </Button>
      </div>
    </div>
  );
};
