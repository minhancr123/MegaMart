"use client";

import { useState, useEffect } from "react";
import { Ticket, Copy, Check, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { getPublicVouchers, AssignedVoucher } from "@/lib/voucherApi";

interface DisplayVoucher {
  code: string;
  discount: string;
  title: string;
  minOrder: string;
  expiry: string;
  tag: string;
  tagColor: string;
}

function formatDisplayVoucher(v: AssignedVoucher): DisplayVoucher {
  let discountStr = "";
  if (v.type === "PERCENT") {
    discountStr = `${v.value}%`;
  } else if (v.type === "FIXED" || v.type === "FREESHIP") {
    if (v.value >= 1000 && v.value % 1000 === 0) {
      discountStr = `${v.value / 1000}K`;
    } else {
      discountStr = `${v.value.toLocaleString("vi-VN")}đ`;
    }
  } else {
    discountStr = `${v.value}`;
  }

  let minOrderStr = "Mọi đơn hàng";
  if (v.minOrderValue && v.minOrderValue > 0) {
    minOrderStr = `Đơn từ ${v.minOrderValue.toLocaleString("vi-VN")}đ`;
  }

  let expiryStr = "HSD: Vô thời hạn";
  if (v.endDate) {
    const end = new Date(v.endDate);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 0 && diffDays <= 7) {
      expiryStr = `HSD: Còn ${diffDays} ngày`;
    } else {
      const day = String(end.getDate()).padStart(2, "0");
      const month = String(end.getMonth() + 1).padStart(2, "0");
      const year = end.getFullYear();
      expiryStr = `HSD: ${day}/${month}/${year}`;
    }
  }

  let tag = v.description || "Ưu đãi";
  let tagColor = "bg-orange-500";
  const descLower = tag.toLowerCase();
  if (v.type === "FREESHIP" || descLower.includes("vận chuyển")) {
    tag = "Vận chuyển";
    tagColor = "bg-blue-500";
  } else if (descLower.includes("mới") || v.code.includes("NEW")) {
    tag = "Khách mới";
    tagColor = "bg-emerald-500";
  } else if (descLower.includes("điện máy") || v.code.includes("TECH")) {
    tag = "Điện máy";
    tagColor = "bg-purple-500";
  } else if (descLower.includes("hội viên") || v.code.includes("VIP") || v.type === "PERCENT") {
    tag = "Hội viên";
    tagColor = "bg-[#ff4d00]";
  }

  return {
    code: v.code,
    discount: discountStr,
    title: v.title,
    minOrder: minOrderStr,
    expiry: expiryStr,
    tag,
    tagColor,
  };
}

export function HotVouchersSection() {
  const [vouchers, setVouchers] = useState<DisplayVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("megamart_saved_vouchers");
      if (stored) {
        setSavedCodes(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }

    getPublicVouchers()
      .then((data) => {
        if (Array.isArray(data)) {
          setVouchers(data.map(formatDisplayVoucher));
        }
      })
      .catch(() => {
        setVouchers([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopyCode = (code: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Đã sao chép mã "${code}" vào bộ nhớ tạm!`);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleSaveVoucher = (code: string) => {
    let updated: string[];
    if (savedCodes.includes(code)) {
      updated = savedCodes.filter((c) => c !== code);
      toast.info(`Đã bỏ lưu mã "${code}"`);
    } else {
      updated = [...savedCodes, code];
      toast.success(`Đã lưu mã "${code}" vào ví voucher của bạn!`);
    }
    setSavedCodes(updated);
    try {
      localStorage.setItem("megamart_saved_vouchers", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  if (!loading && vouchers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-label="Mã giảm giá hot">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-100 text-[#ff4d00] dark:bg-orange-950/60 dark:text-orange-400">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              Kho Voucher MegaMart
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-400 animate-pulse" />
            </h2>
          </div>
        </div>
        <p className="text-xs font-semibold text-muted-foreground hidden sm:block">
          Thu thập mã để áp dụng giảm ngay ở bước Thanh toán
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl border border-zinc-200 bg-zinc-100 animate-pulse dark:border-zinc-800 dark:bg-zinc-800/50"
              />
            ))
          : vouchers.map((voucher) => {
              const isCopied = copiedCode === voucher.code;
              const isSaved = savedCodes.includes(voucher.code);

              return (
                <div
                  key={voucher.code}
                  className="relative flex overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {/* Left cutout stub */}
                  <div className="relative flex w-24 shrink-0 flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-[#d94100] p-3 text-white">
                    <span className="text-2xl font-black tracking-tighter">{voucher.discount}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">GIẢM NGAY</span>
                    {/* Răng cưa viền vé */}
                    <div className="absolute -right-2 top-0 bottom-0 flex flex-col justify-around">
                      <div className="h-2.5 w-2.5 rounded-full bg-white dark:bg-zinc-900" />
                      <div className="h-2.5 w-2.5 rounded-full bg-white dark:bg-zinc-900" />
                    </div>
                  </div>

                  {/* Right info */}
                  <div className="flex flex-1 flex-col justify-between p-3.5 pl-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white ${voucher.tagColor}`}>
                          {voucher.tag}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-gray-200">
                          {voucher.code}
                        </span>
                      </div>
                      <h3 className="mt-1 line-clamp-1 text-xs font-bold text-slate-900 dark:text-white">
                        {voucher.title}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-gray-400">
                        {voucher.minOrder}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-zinc-800/80">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {voucher.expiry}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(voucher.code)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700"
                          title="Sao chép mã"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Chép mã</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveVoucher(voucher.code)}
                          className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                            isSaved
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                              : "bg-[#ff4d00] text-white hover:bg-[#d94100] shadow-sm"
                          }`}
                        >
                          {isSaved ? "Đã lưu" : "Lưu"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}
