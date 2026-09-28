"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { useRecentlyViewedStore } from "@/store/recentlyViewedStore";
import { searchProducts } from "@/lib/productApi";
import { getPrimaryImageUrl } from "@/lib/imageUtils";
import { formatPrice } from "@/lib/utils";
import { useRef } from "react";

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  imageUrl: string;
  categoryName?: string;
  soldCount?: number;
}

// Giá hiệu lực rẻ nhất theo biến thể (sale chỉ hợp lệ khi > 0 và rẻ hơn giá
// gốc) — cùng logic với ProductCard để dãy gợi ý hiện đúng giá sale.
const getEffectivePrices = (p: any): { price: number; originalPrice: number | null } => {
  const variants = p?.variants ?? [];
  let best: { price: number; originalPrice: number | null } | null = null;
  for (const v of variants) {
    const price = Number(v?.price);
    const saleRaw = Number(v?.salePrice);
    const sale = v?.salePrice != null && Number.isFinite(saleRaw) && saleRaw > 0 ? saleRaw : null;
    const current = sale != null && Number.isFinite(price) && sale < price ? sale : price;
    if (!Number.isFinite(current) || current <= 0) continue;
    const original = sale != null && Number.isFinite(price) && sale < price ? price : null;
    if (!best || current < best.price) best = { price: current, originalPrice: original };
  }
  if (best) return best;
  const fallback = Number(p?.price);
  return { price: Number.isFinite(fallback) ? fallback : 0, originalPrice: null };
};

interface ProductRecommendationsProps {
  currentProductId: string;
  categorySlug?: string;
  categoryName?: string;
}

export default function ProductRecommendations({
  currentProductId,
  categorySlug,
  categoryName,
}: ProductRecommendationsProps) {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recentlyViewed = useRecentlyViewedStore();

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        // Fetch products from same category
        const params: any = { limit: 12 };
        if (categorySlug) {
          params.category = categorySlug;
        }

        const response = await searchProducts(params);
        const allProducts = Array.isArray(response) ? response : ((response as any)?.data || []);

        // Filter out current product and map to our format
        const recommended = allProducts
          .filter((p: any) => p.id !== currentProductId)
          .slice(0, 10)
          .map((p: any) => {
            const { price, originalPrice } = getEffectivePrices(p);
            return {
              id: p.id,
              name: p.name,
              price,
              originalPrice,
              imageUrl: getPrimaryImageUrl(p?.images) || p.images?.[0]?.url || p.imageUrl || "",
              categoryName: p.category?.name || categoryName,
              soldCount: p.soldCount || 0,
            };
          });

        setProducts(recommended);
      } catch (error) {
        console.error("Failed to load recommendations:", error);
        // Fallback: use recently viewed items from other categories
        const fallback = recentlyViewed.items
          .filter((item) => item.id !== currentProductId)
          .slice(0, 8)
          .map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            categoryName: item.categoryName,
          }));
        setProducts(fallback);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [currentProductId, categorySlug]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-48 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-[160px]">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-2" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-1" />
              <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          {categoryName ? `Sản phẩm tương tự trong ${categoryName}` : "Có thể bạn cũng thích"}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="flex-shrink-0 w-[150px] sm:w-[170px] group"
          >
            <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-1 transition-all duration-200 h-full">
              <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    No Image
                  </div>
                )}
                {product.soldCount && product.soldCount > 0 ? (
                  <Badge className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5">
                    <Eye className="w-3 h-3 mr-0.5" />
                    Đã bán {product.soldCount > 1000 ? `${(product.soldCount / 1000).toFixed(1)}k` : product.soldCount}
                  </Badge>
                ) : null}
              </div>
              <CardContent className="p-2.5">
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1.5">
                  {product.name}
                </h3>
                <p className="text-sm font-bold text-[#af3200] dark:text-[#ff571a]">
                  {formatPrice(product.price)}
                </p>
                {product.originalPrice != null && product.originalPrice > product.price && (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 line-through">
                    {formatPrice(product.originalPrice)}
                  </p>
                )}
                {product.categoryName && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                    {product.categoryName}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
