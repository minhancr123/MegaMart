'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCompareStore } from '@/store/compareStore';
import { Scale, X, ShoppingCart, Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export default function ComparePage() {
  const compare = useCompareStore();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="pt-[100px] md:pt-[120px] py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
              <Scale className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              So sánh sản phẩm
            </h1>
            <p className="text-slate-600 dark:text-gray-400">
              Bạn đang so sánh {compare.items.length} sản phẩm (tối đa 4)
            </p>
          </div>

          {compare.items.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Scale className="w-12 h-12 text-slate-400 dark:text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Chưa có sản phẩm để so sánh
              </h2>
              <p className="text-slate-600 dark:text-gray-400 mb-6">
                Thêm sản phẩm vào danh sách so sánh để xem chi tiết và đưa ra quyết định mua hàng tốt nhất
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
              {/* Clear All Button */}
              <div className="flex justify-end mb-6">
                <Button
                  variant="outline"
                  onClick={() => compare.clear()}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/50"
                >
                  Xóa tất cả
                </Button>
              </div>

              {/* Comparison Table */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-gray-800">
                        <th className="text-left p-6 font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-gray-800 z-10">
                          Tiêu chí
                        </th>
                        {compare.items.map((product) => (
                          <th key={product.id} className="p-6 min-w-[250px]">
                            <div className="relative">
                              <button
                                onClick={() => compare.remove(product.id)}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <div className="aspect-square bg-slate-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-3">
                                {product.imageUrl || product.images?.[0] ? (
                                  <img
                                    src={product.imageUrl || product.images?.[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-gray-500">
                                    No Image
                                  </div>
                                )}
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                                {product.name}
                              </h3>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Price */}
                      <tr className="border-t border-slate-200 dark:border-gray-700">
                        <td className="p-6 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900">
                          Giá
                        </td>
                        {compare.items.map((product) => (
                          <td key={product.id} className="p-6 text-center">
                            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                              {product.price ? formatPrice(product.price) : 'Liên hệ'}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Category */}
                      <tr className="border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
                        <td className="p-6 font-medium text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-gray-800/50">
                          Danh mục
                        </td>
                        {compare.items.map((product) => (
                          <td key={product.id} className="p-6 text-center text-slate-600 dark:text-gray-400">
                            {product.category?.name || '-'}
                          </td>
                        ))}
                      </tr>

                      {/* Stock Status */}
                      <tr className="border-t border-slate-200 dark:border-gray-700">
                        <td className="p-6 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900">
                          Tình trạng
                        </td>
                        {compare.items.map((product) => {
                          const totalStock = product.variants?.reduce(
                            (sum, v) => sum + (v.stock || 0),
                            0
                          ) || 0;
                          return (
                            <td key={product.id} className="p-6 text-center">
                              {totalStock > 0 ? (
                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                  <Check className="w-4 h-4" />
                                  Còn hàng
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                  <Minus className="w-4 h-4" />
                                  Hết hàng
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Variants */}
                      <tr className="border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
                        <td className="p-6 font-medium text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-gray-800/50">
                          Biến thể
                        </td>
                        {compare.items.map((product) => (
                          <td key={product.id} className="p-6 text-center text-slate-600 dark:text-gray-400">
                            {product.variants?.length || 0} biến thể
                          </td>
                        ))}
                      </tr>

                      {/* Description */}
                      <tr className="border-t border-slate-200 dark:border-gray-700">
                        <td className="p-6 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-gray-900">
                          Mô tả
                        </td>
                        {compare.items.map((product) => (
                          <td key={product.id} className="p-6 text-sm text-slate-600 dark:text-gray-400">
                            <div className="line-clamp-3">
                              {product.description || 'Chưa có mô tả'}
                            </div>
                          </td>
                        ))}
                      </tr>

                      {/* Action Buttons */}
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="p-6 font-medium text-slate-900 sticky left-0 bg-slate-50">
                          Thao tác
                        </td>
                        {compare.items.map((product) => (
                          <td key={product.id} className="p-6">
                            <div className="flex flex-col gap-2">
                              <Link href={`/product/${product.id}`}>
                                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                                  Xem chi tiết
                                </Button>
                              </Link>
                              <Button variant="outline" className="w-full">
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Thêm vào giỏ
                              </Button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
