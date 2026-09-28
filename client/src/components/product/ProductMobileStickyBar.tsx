"use client";

import { ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface ProductMobileStickyBarProps {
  currentPrice: number;
  originalPrice?: number | null;
  hasDiscount?: boolean;
  isOutOfStock?: boolean;
  isAdding?: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
}

export function ProductMobileStickyBar({
  currentPrice,
  originalPrice,
  hasDiscount,
  isOutOfStock,
  isAdding,
  onAddToCart,
  onBuyNow,
}: ProductMobileStickyBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        {/* Giá bên trái */}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isOutOfStock ? "Tình trạng" : "Tổng giá"}
          </span>
          <div className="flex items-baseline gap-1.5 truncate">
            <span className={`text-lg font-black tracking-tight ${isOutOfStock ? "text-muted-foreground" : "text-[#d94300] dark:text-orange-500"}`}>
              {isOutOfStock ? "Hết hàng" : formatPrice(currentPrice)}
            </span>
          </div>
          {hasDiscount && originalPrice != null && (
            <span className="text-[11px] text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {/* Nút thao tác bên phải */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddToCart}
            disabled={isAdding || isOutOfStock}
            className="h-11 px-3.5 rounded-xl border-primary text-primary hover:bg-primary/10 font-bold text-xs flex items-center gap-1.5"
            aria-label="Thêm vào giỏ"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden xs:inline">Thêm giỏ</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onBuyNow}
            disabled={isAdding || isOutOfStock}
            className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs shadow-md flex items-center gap-1.5"
          >
            <Zap className="h-4 w-4" />
            <span>Mua ngay</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
