"use client";

import { Truck, CheckCircle } from "lucide-react";

interface FreeshipProgressProps {
  subtotal: number;
  threshold?: number;
}

export const FreeshipProgress = ({
  subtotal,
  threshold = 500000,
}: FreeshipProgressProps) => {
  const isFree = subtotal >= threshold;
  const remaining = Math.max(0, threshold - subtotal);
  const percentage = Math.min(100, Math.round((subtotal / threshold) * 100));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2">
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        {isFree ? (
          <CheckCircle className="w-4 h-4 text-[var(--success)] shrink-0" />
        ) : (
          <Truck className="w-4 h-4 text-primary shrink-0" />
        )}
        <span className="text-foreground">
          {isFree ? (
            <span className="font-semibold text-[var(--success)]">
              Đơn hàng của bạn đã đủ điều kiện Miễn phí vận chuyển!
            </span>
          ) : (
            <span>
              Mua thêm{" "}
              <strong className="text-primary font-bold">
                {formatPrice(remaining)}
              </strong>{" "}
              để được miễn phí vận chuyển
            </span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isFree ? "bg-[var(--success)]" : "bg-primary"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
        <span>0đ</span>
        <span>{formatPrice(threshold)}</span>
      </div>
    </div>
  );
};
