"use client";

import { useEffect, useState } from "react";
import { Product, Variant } from "@/interfaces/product";
import {
  fetchProductAvailability,
  type WarehouseAvailability,
} from "@/lib/productApi";
import { getWarehouseRegion, regionBadgeClass } from "@/lib/warehouseRegion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Minus,
  Plus,
  Heart,
  GitCompare,
  Gift,
  Wrench,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/store/wishlistStore";

interface ProductInfoProps {
  product: Product;
  onAddToCart: (variantId: string, quantity: number) => Promise<void>;
  averageRating?: number;
  reviewCount?: number;
  /** Callback khi đổi biến thể - page dùng để đồng bộ badge giá trên gallery */
  onVariantChange?: (index: number) => void;
}

/**
 * Các key kỹ thuật trong attributes (crawler/meta), không phải tùy chọn
 * biến thể để hiển thị.
 */
const INTERNAL_ATTR_KEYS = new Set(["specs", "specsTable", "rating", "reviewCount"]);

/** Việt hóa tên key attribute tiếng Anh thường gặp. */
const ATTR_LABEL_VI: Record<string, string> = {
  color: "Màu sắc",
  colors: "Màu sắc",
  ram: "RAM",
  rom: "Bộ nhớ trong",
  storage: "Dung lượng",
  size: "Kích thước",
  screen: "Màn hình",
};

const prettyAttrKey = (key: string): string =>
  ATTR_LABEL_VI[key.toLowerCase()] ?? key;

export const ProductInfo = ({
  product,
  onAddToCart,
  averageRating = 4.8,
  reviewCount = 186,
  onVariantChange,
}: ProductInfoProps) => {
  const router = useRouter();
  const wishlist = useWishlistStore();
  const variants = product.variants || [];
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [availability, setAvailability] = useState<WarehouseAvailability[]>([]);

  // Tình trạng hàng theo kho cho biến thể đang chọn (không lộ số lượng exact)
  useEffect(() => {
    let alive = true;
    fetchProductAvailability(product.id).then((rows) => {
      if (alive) setAvailability(rows);
    });
    return () => {
      alive = false;
    };
  }, [product.id]);

  const selectedVariant: Variant | undefined = variants[selectedVariantIndex] || variants[0];

  const currentPrice = Number(
    selectedVariant?.salePrice != null
      ? selectedVariant.salePrice
      : selectedVariant?.price ?? product.price ?? 0,
  );
  // Chỉ hiển thị khung giá sale khi DB thực sự có salePrice; không tự bịa giá gốc.
  const originalPrice = selectedVariant?.salePrice
    ? Number(selectedVariant.price)
    : null;

  const discountPercent =
    selectedVariant?.discountPercent ||
    (originalPrice != null && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : null);

  // Tên tùy chọn biến thể: ưu tiên key có giá trị KHÁC NHAU giữa các biến thể
  // (vd Locker: "Kích thước màn hình" với 43"/50"/55"/65"). Fallback: key
  // hiển thị được đầu tiên, cuối cùng là SKU.
  const variantOptionKey = (() => {
    if (variants.length === 0) return null;
    const candidates: string[] = [];
    for (const v of variants) {
      const attrs = (v.attributes ?? {}) as Record<string, unknown>;
      for (const k of Object.keys(attrs)) {
        if (!INTERNAL_ATTR_KEYS.has(k) && !candidates.includes(k)) candidates.push(k);
      }
    }
    const valOf = (v: Variant, k: string) => {
      const val = (v.attributes as Record<string, unknown> | undefined)?.[k];
      return val == null ? "" : String(val).trim();
    };
    return (
      candidates.find((k) => new Set(variants.map((v) => valOf(v, k))).size > 1) ??
      candidates.find((k) => variants.some((v) => valOf(v, k) !== "")) ??
      null
    );
  })();

  const variantOptionValue = (v: Variant): string => {
    if (variantOptionKey) {
      const val = (v.attributes as Record<string, unknown> | undefined)?.[variantOptionKey];
      if (val != null && String(val).trim() !== "") return String(val);
    }
    return v.sku;
  };

  const handleSelectVariant = (idx: number) => {
    setSelectedVariantIndex(idx);
    onVariantChange?.(idx);
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Hết hàng khi biến thể đang chọn tồn kho <= 0
  const isOutOfStock = !selectedVariant || Number(selectedVariant.stock ?? 0) <= 0;

  const handleAddToCart = async () => {
    if (!selectedVariant || isOutOfStock) return;
    setIsAdding(true);
    try {
      await onAddToCart(selectedVariant.id, quantity);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!selectedVariant || isOutOfStock) return;
    await handleAddToCart();
    router.push("/checkout");
  };

  const isWishlisted = wishlist.exists(product.id);

  return (
    <div className="flex flex-col space-y-5">
      {/* 1. Tên sản phẩm */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
          {product.name}
        </h1>

        {/* 2. Dòng Rating & SKU */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="flex items-center text-amber-500">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-foreground">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">
              ({reviewCount} đánh giá)
            </span>
          </div>

          <span className="text-border">•</span>

          <div>
            Đã bán <span className="font-medium text-foreground">{product.soldCount != null ? product.soldCount.toLocaleString() : "—"}</span>
          </div>

          <span className="text-border">•</span>

          <div className="font-mono text-xs">
            SKU: <span className="text-foreground">{selectedVariant?.sku || "UA55DU7000"}</span>
          </div>
        </div>
      </div>

      {/* 3. Khung Giá Nổi Bật Chuẩn Stitch */}
      <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/15 flex flex-wrap items-baseline gap-3 sm:gap-4">
        <span className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
          {formatPrice(currentPrice)}
        </span>

        {originalPrice != null && originalPrice > currentPrice && (
          <span className="text-base sm:text-lg text-muted-foreground line-through">
            {formatPrice(originalPrice)}
          </span>
        )}

        {discountPercent && (
          <Badge className="bg-destructive text-white hover:bg-destructive font-bold text-xs px-2 py-0.5 rounded-md">
            -{discountPercent}%
          </Badge>
        )}

        {isOutOfStock ? (
          <Badge className="bg-zinc-500 text-white hover:bg-zinc-500 font-bold text-xs px-2 py-0.5 rounded-md">
            Hết hàng
          </Badge>
        ) : (
          selectedVariant != null && (
            <span className="text-xs sm:text-sm text-muted-foreground">
              Còn <span className="font-bold text-foreground">{Number(selectedVariant.stock)}</span> sản phẩm
            </span>
          )
        )}

        <Badge variant="outline" className="border-primary/40 text-primary bg-background/80 font-medium text-xs px-2 py-0.5 rounded-md">
          Trả góp 0%
        </Badge>
      </div>

      {/* 4. Chọn biến thể (vd: Kích thước màn hình: 55") */}
      {variants.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm text-foreground block">
            {variantOptionKey ? (
              <>
                <span className="text-muted-foreground">{prettyAttrKey(variantOptionKey)}: </span>
                <span className="font-bold">{variantOptionValue(selectedVariant ?? variants[0])}</span>
              </>
            ) : (
              <span className="font-semibold">Lựa chọn phiên bản:</span>
            )}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((variant, idx) => {
              const isSelected = selectedVariantIndex === idx;
              const label = variantOptionValue(variant);

              return (
                <button
                  key={variant.id || idx}
                  onClick={() => handleSelectVariant(idx)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Bộ số lượng + Nút Yêu Thích + Nút So Sánh */}
      <div className="flex items-center gap-3 sm:gap-4 pt-1">
        {/* Bộ số lượng tròn Stitch */}
        <div className="flex items-center border border-border bg-card rounded-full p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || isOutOfStock}
            className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
            aria-label="Giảm"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>

          <span className="w-10 text-center font-bold text-sm text-foreground select-none">
            {quantity}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuantity(quantity + 1)}
            disabled={isOutOfStock || (selectedVariant?.stock ? quantity >= selectedVariant.stock : false)}
            className="h-8 w-8 rounded-full text-foreground hover:bg-muted"
            aria-label="Tăng"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Nút Yêu thích (Wishlist) */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (isWishlisted) {
              wishlist.removeItem(product.id);
              toast.info("Đã xóa khỏi danh sách yêu thích");
            } else {
              wishlist.addItem(product);
              toast.success("Đã thêm vào danh sách yêu thích");
            }
          }}
          className={`h-10 w-10 rounded-xl border-border transition-colors ${
            isWishlisted ? "text-red-500 border-red-200 bg-red-50/40 dark:bg-red-950/20" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Yêu thích"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
        </Button>

        {/* Nút So sánh (Compare) */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/compare")}
          className="h-10 w-10 rounded-xl border-border text-muted-foreground hover:text-foreground"
          aria-label="So sánh"
        >
          <GitCompare className="w-4 h-4" />
        </Button>
      </div>

      {/* 6. 2 CTA Buttons ngang hàng: Thêm vào giỏ & Mua ngay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <Button
          variant="outline"
          onClick={handleAddToCart}
          disabled={isAdding || isOutOfStock}
          className="h-12 rounded-xl text-primary border-primary hover:bg-primary/10 hover:text-primary font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}</span>
        </Button>

        <Button
          onClick={handleBuyNow}
          disabled={isAdding || isOutOfStock}
          className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          <Zap className="w-4 h-4" />
          <span>{isOutOfStock ? "Hết hàng" : "Mua ngay"}</span>
        </Button>
      </div>

      {/* 7. Hộp Khuyến mãi & Ưu đãi chuẩn Stitch */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <Gift className="w-4 h-4" />
          <span>Khuyến mãi &amp; Ưu đãi</span>
        </div>
        <ul className="text-xs sm:text-sm space-y-1.5 text-muted-foreground list-disc list-inside">
          <li>Tặng giá treo tivi trị giá <strong className="text-foreground">500.000đ</strong></li>
          <li>Miễn phí 1 năm xem gói VIP FPT Play cao cấp</li>
          <li>Tặng thêm 01 tháng bảo hành khi kích hoạt bảo hành điện tử</li>
        </ul>
      </div>

      {/* 8. Cam kết dịch vụ: freeship + bảo hành */}
      <div className="rounded-2xl border border-border divide-y divide-border overflow-hidden">
        <div className="flex items-start gap-2.5 p-3.5">
          <Truck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-foreground">Miễn phí giao hàng &amp; Lắp đặt</p>
            <p className="text-muted-foreground mt-0.5">Giao hỏa tốc 2h trong nội thành.</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5">
          <ShieldCheck className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-foreground">Bảo hành chính hãng 24 tháng</p>
            <p className="text-muted-foreground mt-0.5">Lỗi 1 đổi 1 trong 30 ngày tận nhà.</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3.5">
          <Wrench className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-foreground">Lắp đặt chuyên nghiệp miễn phí</p>
            <p className="text-muted-foreground mt-0.5">Kỹ thuật viên hãng trực tiếp thi công.</p>
          </div>
        </div>
      </div>

      {/* 8b. Tình trạng kho hàng theo chi nhánh (theo biến thể đang chọn) */}
      {availability.length > 0 && selectedVariant && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <p className="px-3.5 pt-3 pb-1 text-xs sm:text-sm font-bold text-foreground">
            Tình trạng kho hàng
          </p>
          <div className="divide-y divide-border">
            {availability.map((wh) => {
              const entry = wh.variants.find((v) => v.variantId === selectedVariant.id);
              const state = !entry || !entry.inStock
                ? { dot: "bg-zinc-300", text: "Hết hàng", cls: "text-muted-foreground" }
                : entry.lowStock
                  ? { dot: "bg-amber-500", text: "Sắp hết", cls: "text-amber-600" }
                  : { dot: "bg-green-500", text: "Còn hàng", cls: "text-green-600" };
              const region = getWarehouseRegion({
                code: wh.warehouseCode,
                name: wh.warehouseName,
              });
              return (
                <div key={wh.warehouseId} className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${state.dot}`} />
                  <span className="font-semibold text-foreground truncate">
                    {wh.warehouseName}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${regionBadgeClass(region.tone)}`}
                  >
                    {region.label}
                  </span>
                  <span className={`ml-auto font-bold shrink-0 ${state.cls}`}>
                    {state.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
