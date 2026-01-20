"use client";

import { useCompareStore } from "@/store/compareStore";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(price);

export default function ComparePage() {
  const { items, clear, remove } = useCompareStore();

  const headers = ["Sản phẩm", "Giá", "Tồn kho", "Mô tả"];

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">So sánh sản phẩm</h1>
          <p className="text-sm text-gray-500">Chọn tối đa 4 sản phẩm để so sánh</p>
        </div>
        {items.length > 0 && (
          <Button variant="ghost" onClick={clear}>Xóa tất cả</Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-gray-500">
          Chưa có sản phẩm để so sánh. <Link href="/products" className="text-blue-600 hover:underline">Chọn sản phẩm</Link>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full bg-white border rounded-xl text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h} className="border-b px-4 py-3 text-left font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(({ product }) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="border-b px-4 py-3 align-top">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-16 bg-gray-100 rounded overflow-hidden">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <button
                          className="text-xs text-red-500 hover:underline"
                          onClick={() => remove(product.id)}
                        >
                          Xóa khỏi so sánh
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="border-b px-4 py-3 align-top text-gray-900">
                    {formatPrice(product.price || 0)}
                  </td>
                  <td className="border-b px-4 py-3 align-top text-gray-700">
                    {product.variants?.reduce((sum, v) => sum + (v.stock ?? 0), 0) ?? 0}
                  </td>
                  <td className="border-b px-4 py-3 align-top text-gray-700">
                    {product.description || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
