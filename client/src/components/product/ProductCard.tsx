"use client";

import { Product } from "@/interfaces/product";
import { Badge } from "@/components/ui/badge";
import { Heart, Package2, ShieldCheck, Star, Flame } from "lucide-react";
import { memo } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/store/wishlistStore";
import { getPrimaryImageUrl, handleImageError } from '@/lib/imageUtils';
import { getAvailableStock } from '@/lib/stock';
import { formatPrice } from '@/lib/utils';
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

/** Sản phẩm ra mắt trong 60 ngày gần đây thì gắn nhãn "Mới". */
function isNewProduct(createdAt?: Date | string | null): boolean {
  if (!createdAt) return false;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return false;
  const diff = Date.now() - time;
  return diff >= 0 && diff <= 60 * 24 * 60 * 60 * 1000;
}

/** Format số lượng đã bán (ví dụ 1250 -> "1.3k") */
function formatSoldCount(count: number): string {
  if (!count || count <= 0) return "0";
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return count.toString();
}

const ProductCardComponent = ({ product }: ProductCardProps) => {
  const wished = useWishlistStore((s) => s.items.some((i) => i.id === product.id));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const variants = product.variants ?? [];
  // Biến thể rẻ nhất để hiển thị giá "Từ ...". Sale chỉ hợp lệ khi > 0 và rẻ hơn giá gốc.
  const priced = variants
    .map((v) => {
      const price = Number(v.price);
      const saleRaw = Number(v.salePrice);
      const sale =
        v.salePrice != null && Number.isFinite(saleRaw) && saleRaw > 0 ? saleRaw : null;
      const current =
        sale != null && Number.isFinite(price) && sale < price ? sale : price;
      return {
        v,
        current,
        original: sale != null && Number.isFinite(price) && sale < price ? price : null,
      };
    })
    .filter((p) => Number.isFinite(p.current) && p.current > 0)
    .sort((a, b) => a.current - b.current);
  const cheapest = priced[0] ?? null;
  const rawFallback = Number(product.price);
  const hasPrice =
    cheapest != null ||
    (Number.isFinite(rawFallback) && rawFallback > 0);
  const currentPrice = cheapest?.current ?? (Number.isFinite(rawFallback) ? rawFallback : 0);
  // Chỉ hiện giá gốc khi DB thực sự có salePrice; không tự bịa giá gốc.
  const originalPrice =
    cheapest && cheapest.original != null && Number.isFinite(cheapest.original)
      ? cheapest.original
      : null;
  const hasDiscount =
    originalPrice != null && originalPrice > currentPrice;
  const discountPercent = hasDiscount
    ? cheapest!.v.discountPercent ||
      Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : null;
  const showFrom =
    priced.length > 1 &&
    priced[0].current !== priced[priced.length - 1].current;

  const isOutOfStock =
    variants.length > 0 && variants.every((v) => getAvailableStock(v) <= 0);

  const ratingAttr = product.variants
    ?.map((v) => v.attributes)
    .find(
      (a) => a && ((a as any).rating != null || (a as any).reviewCount != null),
    ) as any;
  const numRating = Number((product as any).rating ?? ratingAttr?.rating ?? 4.8); // Default fallback rating cho sp mới
  const rating =
    Number.isFinite(numRating) && numRating > 0 ? numRating : 4.8;
  const numReviews = Number(
    (product as any).reviewCount ?? ratingAttr?.reviewCount ?? 12,
  );
  const reviewCount = Number.isFinite(numReviews) && numReviews > 0 ? numReviews : 12;

  // Lấy số lượng đã bán từ product hoặc attributes
  const rawSoldCount = Number(
    product.soldCount ?? (product as any).sold ?? ratingAttr?.soldCount ?? 0
  );
  const soldCount = Number.isFinite(rawSoldCount) && rawSoldCount > 0 ? rawSoldCount : 0;

  const badgeType = isOutOfStock
    ? "outofstock"
    : discountPercent
      ? "discount"
      : soldCount >= 30
        ? "hot"
        : isNewProduct(product.createdAt)
          ? "new"
          : null;

  const badgeText = isOutOfStock
    ? "Hết hàng"
    : discountPercent
      ? `-${discountPercent}%`
      : soldCount >= 30
        ? "Bán chạy"
        : "Mới";

  const badgeClass = isOutOfStock
    ? "bg-neutral-800 text-white dark:bg-neutral-700"
    : discountPercent
      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white font-black shadow-red-500/20 shadow-sm"
      : soldCount >= 30
        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold"
        : "bg-blue-600 text-white font-semibold";

  const productImage =
    (cheapest?.v as any)?.colors?.[0]?.imageUrl ||
    product.imageUrl ||
    (product as any).image ||
    getPrimaryImageUrl(product.images) ||
    '';

  return (
    <div className="group h-full w-full min-w-0">
      <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Product Image */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-900">
          <Link href={`/product/${product.id}`} className="block">
            <div className="aspect-square relative overflow-hidden">
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.name}
                  loading="lazy"
                  onError={handleImageError}
                  className={`h-full w-full object-contain p-2.5 transition-transform duration-500 group-hover:scale-105 dark:brightness-95 sm:p-4 ${isOutOfStock ? "opacity-60 grayscale" : ""}`}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                  <Package2 className="h-20 w-20 text-slate-300 dark:text-gray-600" />
                </div>
              )}
            </div>
          </Link>

          {/* Badge góc trái */}
          {badgeType && (
            <Badge className={`pointer-events-none absolute top-3 left-3 border-none px-2.5 py-1 text-xs shadow-md ${badgeClass}`}>
              {badgeType === "hot" && <Flame className="h-3 w-3 mr-1 inline-block fill-white stroke-none" />}
              {badgeText}
            </Badge>
          )}

          {/* Nút yêu thích luôn hiện góc phải */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const wasWished = wished;
              toggleWishlist(product);
              if (wasWished) {
                toast.info("Đã xóa khỏi danh sách yêu thích");
              } else {
                toast.success("Đã thêm vào danh sách yêu thích");
              }
            }}
            aria-label={wished ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            aria-pressed={wished}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:scale-110 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Heart
              className={`h-[18px] w-[18px] transition-colors ${wished ? "text-red-500 fill-red-500" : "text-slate-400 group-hover:text-slate-600 dark:text-gray-400"}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          {/* Tên sản phẩm 2 dòng */}
          <Link href={`/product/${product.id}`} className="cursor-pointer">
            <h3 className="line-clamp-2 min-h-[2.6rem] break-words text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary dark:text-white">
              {product.name}
            </h3>
          </Link>

          {/* Đánh giá sao ⭐ & Số lượng đã bán */}
          <div className="mt-2 flex items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-gray-100">
                {rating.toFixed(1)}
              </span>
              <span className="text-slate-400 dark:text-gray-500 text-[11px]">
                ({reviewCount})
              </span>
            </div>

            {soldCount > 0 ? (
              <span className="text-slate-500 dark:text-gray-400 font-medium text-[12px]">
                Đã bán <strong className="font-bold text-slate-700 dark:text-gray-200">{formatSoldCount(soldCount)}</strong>
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                Sẵn hàng
              </span>
            )}
          </div>

          {/* Giá */}
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2">
            {hasPrice ? (
              <>
                {showFrom && (
                  <span className="text-xs font-medium text-slate-400 dark:text-gray-400">
                    Từ
                  </span>
                )}
                <span className={`text-lg font-black tracking-tight ${isOutOfStock ? "text-slate-400 dark:text-gray-500" : "text-[#d94300] dark:text-orange-500"}`}>
                  {formatPrice(currentPrice)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-700 dark:text-gray-200">
                Liên hệ
              </span>
            )}
            {hasDiscount && originalPrice != null && (
              <span className="text-xs font-semibold text-slate-400 line-through dark:text-gray-500">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Cam kết chính hãng */}
          <div className="mt-auto flex items-center justify-between pt-3 text-xs text-slate-500 dark:text-gray-400 border-t border-slate-100 dark:border-gray-800/80 mt-2.5">
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-gray-300">Chính hãng 100%</span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-gray-500">Miễn phí giao</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoized version to prevent unnecessary re-renders
const MemoizedProductCard = memo(ProductCardComponent);

// Export both named and default
export { MemoizedProductCard as ProductCard };
export default MemoizedProductCard;
