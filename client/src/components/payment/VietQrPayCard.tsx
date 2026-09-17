"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { QrCode, Copy, Check, Timer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Thông tin tài khoản nhận tiền (SePay VA) - cấu hình qua biến môi trường,
// fallback về giá trị đang dùng để không vỡ UI nếu thiếu env.
export const SEPAY_BANK = process.env.NEXT_PUBLIC_SEPAY_BANK || "Vietcombank";
export const SEPAY_ACCOUNT_NO =
  process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NO || "SBSEPAYG9VJ7S0WLIFM";
export const SEPAY_ACCOUNT_NAME =
  process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || "HUYNH MINH AN";

export function buildTransferContent(orderCode: string): string {
  return `Thanh toan don hang ${orderCode}`;
}

export function buildVietQrUrl(opts: {
  bank?: string;
  acc?: string;
  amount: number;
  content: string;
}): string {
  const params = new URLSearchParams({
    bank: opts.bank || SEPAY_BANK,
    acc: opts.acc || SEPAY_ACCOUNT_NO,
    amount: String(Math.max(0, Math.round(opts.amount))),
    des: opts.content,
    template: "compact",
  });
  return `https://vietqr.app/img?${params.toString()}`;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Fallback cho trình duyệt chặn clipboard API
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

interface VietQrPayCardProps {
  orderCode: string;
  amount: number;
  /** Thời điểm tạo đơn (ISO) - dùng để tính thời hạn giữ đơn thanh toán */
  createdAt?: string;
}

// Thời gian giữ đơn chờ thanh toán (phút) - cấu hình qua env, mặc định 30
const PAYMENT_WINDOW_MINUTES = Number(
  process.env.NEXT_PUBLIC_SEPAY_PAYMENT_WINDOW_MINUTES || "30"
);

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VietQrPayCard({ orderCode, amount, createdAt }: VietQrPayCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const content = buildTransferContent(orderCode);
  const qrUrl = buildVietQrUrl({ amount, content });

  // Đếm ngược thời hạn thanh toán tính từ lúc tạo đơn
  const deadline = createdAt
    ? new Date(createdAt).getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000
    : null;
  const remaining = deadline === null ? null : deadline - now;
  const expired = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

  const handleCopy = async (label: string, value: string) => {
    const ok = await copyText(value);
    if (ok) {
      setCopiedField(label);
      toast.success(`Đã sao chép ${label}`);
      window.setTimeout(() => setCopiedField((cur) => (cur === label ? null : cur)), 1500);
    } else {
      toast.error("Không sao chép được, vui lòng copy thủ công");
    }
  };

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Ngân hàng", value: SEPAY_BANK },
    { label: "Số tài khoản", value: SEPAY_ACCOUNT_NO, mono: true },
    { label: "Chủ tài khoản", value: SEPAY_ACCOUNT_NAME },
    { label: "Số tiền", value: formattedAmount, mono: true },
    { label: "Nội dung", value: content, mono: true },
  ];

  return (
    <Card className="border border-border bg-card rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 font-bold text-foreground text-sm border-b border-border pb-3">
        <QrCode className="w-4 h-4 text-primary" />
        <span>Thanh toán chuyển khoản</span>
      </div>

      {remaining !== null && !expired && (
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <Timer className="w-3.5 h-3.5 shrink-0" />
          <span>Vui lòng thanh toán trong {formatCountdown(remaining)}</span>
        </div>
      )}

      {expired && (
        <div className="flex items-start gap-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Đã quá thời gian giữ đơn. Nếu bạn đã chuyển khoản, đơn sẽ tự cập nhật khi ngân hàng ghi
            nhận — không cần chuyển lại.
          </span>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {/* Dùng <img> thường thay vì next/image để không phụ thuộc remotePatterns */}
        <img
          src={qrUrl}
          alt={`QR thanh toán đơn ${orderCode}`}
          width={220}
          height={220}
          loading="lazy"
          className="w-[220px] h-[220px] rounded-xl border border-border bg-white object-contain"
        />
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Quét mã để thanh toán. Vui lòng <span className="font-semibold text-foreground">giữ nguyên nội dung</span> để
          hệ thống xác thực tự động.
        </p>
      </div>

      <div className="space-y-2 text-xs sm:text-sm">
        {rows.map((row) => {
          const isCopied = copiedField === row.label;
          return (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground shrink-0">{row.label}</span>
              <button
                type="button"
                onClick={() => handleCopy(row.label, row.value)}
                title={`Sao chép ${row.label}`}
                className="flex items-center gap-1.5 min-w-0 font-semibold text-foreground hover:text-primary transition-colors text-right"
              >
                <span className={`truncate ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 shrink-0 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
