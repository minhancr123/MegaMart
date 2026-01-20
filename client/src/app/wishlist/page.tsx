"use client";

import Link from "next/link";
import { useWishlistStore } from "@/store/wishlistStore";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";

export default function WishlistPage() {
  const { items, clear } = useWishlistStore();

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Yêu thích</h1>
          <p className="text-sm text-gray-500">Sản phẩm bạn đã lưu lại</p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" onClick={clear}>Xóa tất cả</Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          Chưa có sản phẩm yêu thích. <Link href="/products" className="text-blue-600 hover:underline">Xem sản phẩm</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ product }) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
