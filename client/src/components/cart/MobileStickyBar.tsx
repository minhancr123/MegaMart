"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileStickyBarProps {
  total: number;
  onCheckout: () => void;
  disabled?: boolean;
}

export const MobileStickyBar = ({
  total,
  onCheckout,
  disabled,
}: MobileStickyBarProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-3.5 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
      <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground block">Tổng thanh toán:</span>
          <span className="text-lg font-bold text-primary truncate block">
            {formatPrice(total)}
          </span>
        </div>

        <Button
          onClick={onCheckout}
          disabled={disabled}
          className="h-11 px-6 rounded-full shadow-md shrink-0 flex items-center gap-2"
        >
          <span>Tiếp tục</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
