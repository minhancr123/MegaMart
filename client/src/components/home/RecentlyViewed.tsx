"use client";

import { useRecentlyViewedStore } from "@/store/recentlyViewedStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

export default function RecentlyViewed() {
  const { items, clearAll } = useRecentlyViewedStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    checkScroll();
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 300;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!mounted || items.length === 0) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xem";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Sản phẩm đã xem gần đây
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Xóa tất cả
        </Button>
      </div>

      <div className="relative group">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-gray-800 shadow-lg rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.slice(0, 12).map((item) => (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className="flex-shrink-0 w-[140px] sm:w-[160px] group/card"
            >
              <Card className="overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md hover:-translate-y-1 transition-all duration-200 h-full">
                <div className="relative aspect-square bg-gray-50 dark:bg-gray-800 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
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
                    {item.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400">
                    {formatPrice(item.price)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {getTimeAgo(item.viewedAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
