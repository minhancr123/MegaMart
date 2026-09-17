"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMounted } from "@/hooks/useMounted";
import { useAuthStore } from "@/store/authStore";
import axiosClient from "@/lib/axiosClient";

interface RecItem {
  productId: string;
  score: number;
  reason: string | null;
  refreshedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    price: number | null;
    salePrice: number | null;
    image: string | null;
  };
}

const formatPrice = (price: number | null) => {
  if (price == null) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Rail "Dành riêng cho bạn" — CHỈ hiện khi đã đăng nhập.
 * Đọc gợi ý do agent tính sẵn (GET /recommendations/me), không gọi LLM lúc render.
 * Chưa đăng nhập / chưa có gợi ý / lỗi mạng → render null (không chiếm chỗ).
 */
export default function ForYouSection() {
  const mounted = useMounted();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [items, setItems] = useState<RecItem[]>([]);

  useEffect(() => {
    // Chưa đăng nhập: render gate bên dưới đã trả null nên không cần xóa items ở đây
    // (tránh setState trong effect body). Đăng nhập user khác → fetch đè bên dưới.
    if (!mounted || !hasHydrated || !isAuthenticated) return;
    let cancelled = false;
    axiosClient
      .get("/recommendations/me?take=10")
      .then((res: any) => {
        // Interceptor có thể trả response nguyên (res.data là mảng) hoặc
        // payload đã bóc (res chính là mảng) — chấp nhận cả 2 dạng.
        const raw = Array.isArray(res) ? res : res?.data;
        const list: RecItem[] = Array.isArray(raw)
          ? raw.filter((i) => i?.product)
          : [];
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        // API chưa có dữ liệu / lỗi mạng → ẩn section, không làm phiền user.
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, hasHydrated, isAuthenticated]);

  if (!mounted || !hasHydrated || !isAuthenticated || items.length === 0) {
    return null;
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#fc4c00]" />
          Dành riêng cho bạn
        </h2>
      </div>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
        Gợi ý theo sở thích mua sắm của bạn
      </p>

      <div
        className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.slice(0, 10).map((item) => (
          <Link
            key={item.productId}
            href={`/product/${item.productId}`}
            className="flex-shrink-0 w-[140px] sm:w-[160px] group/card"
          >
            <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-1 transition-all duration-200 h-full">
              <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
                {item.product?.image ? (
                  <img
                    src={item.product.image}
                    alt={item.product?.name ?? "Sản phẩm gợi ý"}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
                    No Image
                  </div>
                )}
              </div>
              <CardContent className="p-2 sm:p-3">
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 leading-tight">
                  {item.product?.name ?? "Sản phẩm"}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                  {formatPrice(
                    item.product?.salePrice ?? item.product?.price ?? null,
                  )}
                </p>
                {item.reason && (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                    ✨ {item.reason}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
