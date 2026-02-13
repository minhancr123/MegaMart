'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { useWishlistStore } from '@/store/wishlistStore';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WishlistPage() {
  const wishlist = useWishlistStore();
  const router = useRouter();

  const handleAddToCart = (variantId: string, quantity: number) => {
    // This would call your cart API
    console.log('Add to cart:', variantId, quantity);
  };

  const handleViewDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="pt-[100px] md:pt-[120px] py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <Heart className="w-10 h-10 text-red-500 fill-red-500" />
              Sản phẩm yêu thích
            </h1>
            <p className="text-slate-600">
              Bạn có {wishlist.items.length} sản phẩm trong danh sách yêu thích
            </p>
          </div>

          {wishlist.items.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-slate-400 dark:text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Danh sách yêu thích trống
              </h2>
              <p className="text-slate-600 dark:text-gray-400 mb-6">
                Hãy thêm sản phẩm yêu thích để dễ dàng theo dõi và mua sắm sau này
              </p>
              <Link href="/products">
                <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Khám phá sản phẩm
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Actions */}
              <div className="flex justify-between items-center mb-6">
                <div className="text-sm text-slate-600 dark:text-gray-400">
                  Hiển thị {wishlist.items.length} sản phẩm
                </div>
                <Button
                  variant="outline"
                  onClick={() => wishlist.clear()}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa tất cả
                </Button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {wishlist.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
