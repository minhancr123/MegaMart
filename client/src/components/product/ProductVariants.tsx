"use client";

import { useState } from "react";
import { Variant, Product } from "@/interfaces/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface ProductVariantsProps {
  product: Product;
  onAddToCart?: (variantId: string, quantity: number) => void;
}

export const ProductVariants = ({ product, onAddToCart }: ProductVariantsProps) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const productImages = product.images || [];
  const hasImages = productImages.length > 0;
  const mainImage = hasImages 
    ? productImages[currentImageIndex]?.url || "/placeholder-product.png"
    : "/placeholder-product.png";

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (selectedVariant && onAddToCart) {
      onAddToCart(selectedVariant.id, quantity);
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: "Hết hàng", color: "destructive" };
    if (stock <= 5) return { text: `Còn ${stock} sản phẩm`, color: "secondary" };
    return { text: "Còn hàng", color: "default" };
  };

  if (!product.variants || product.variants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Sản phẩm này hiện không có biến thể</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-8">
            <div className="relative aspect-square w-full max-w-2xl mx-auto bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-md">
              <Image
                src={mainImage}
                alt={productImages[currentImageIndex]?.alt || product.name}
                fill
                className="object-contain p-4"
                priority
              />
              {hasImages && productImages.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-800" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white hover:bg-gray-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
                    aria-label="Ảnh sau"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-800" />
                  </button>
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium z-10">
                    {currentImageIndex + 1} / {productImages.length}
                  </div>
                </>
              )}
              {!hasImages && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Package className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Chưa có hình ảnh</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.description && (
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              )}
            </div>
            {selectedVariant && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Biến thể đã chọn</p>
                    <p className="font-semibold text-lg">SKU: {selectedVariant.sku}</p>
                  </div>
                  <Badge variant={getStockStatus(selectedVariant.stock).color as any}>
                    {getStockStatus(selectedVariant.stock).text}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-red-600">
                    {formatPrice(selectedVariant.price)}
                  </span>
                  {selectedVariant.attributes && (
                    <div className="text-sm text-gray-600">
                      {Object.entries(selectedVariant.attributes).map(([key, value]) => (
                        <div key={key} className="text-right">
                          {key}: <strong className="text-gray-900">{String(value)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            {selectedVariant && selectedVariant.stock > 0 && (
              <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-center gap-4">
                  <label htmlFor="quantity" className="text-sm font-medium whitespace-nowrap">
                    Số lượng:
                  </label>
                  <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      max={selectedVariant.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(selectedVariant.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 px-2 py-2 text-center border-0 focus:ring-0 focus:outline-none font-medium"
                    />
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30"
                      onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                      disabled={quantity >= selectedVariant.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Tổng cộng</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatPrice(selectedVariant.price * quantity)}
                    </div>
                  </div>
                  <Button
                    onClick={handleAddToCart}
                    className="flex items-center gap-2 px-8 py-6 text-base"
                    disabled={!selectedVariant || selectedVariant.stock < quantity}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Thêm vào giỏ hàng
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Chọn biến thể ({product.variants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedVariant?.id === variant.id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300 hover:shadow-md"} ${variant.stock === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => variant.stock > 0 && handleVariantSelect(variant)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">SKU: {variant.sku}</span>
                      <Badge variant={getStockStatus(variant.stock).color as any} className="text-xs">
                        {getStockStatus(variant.stock).text}
                      </Badge>
                    </div>
                    {variant.attributes && (
                      <div className="text-sm text-gray-600 mb-2">
                        {Object.entries(variant.attributes).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: <strong>{String(value)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xl font-bold text-red-600">
                      {formatPrice(variant.price)}
                    </div>
                    {selectedVariant?.id === variant.id && (
                      <div className="text-sm text-blue-600 mt-1 font-medium">
                         Đã chọn
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
