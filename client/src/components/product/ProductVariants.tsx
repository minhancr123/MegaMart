"use client";

import { useState } from "react";
import { Variant, Product } from "@/interfaces/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { visibleAttributes, formatAttributeValue } from '@/lib/productAttributes';
import { getAvailableStock } from '@/lib/stock';
import { PLACEHOLDER_IMAGE } from '@/lib/imageUtils';

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

  // URL nào tải hỏng thì nhớ lại để lần render sau dùng thẳng ảnh thay thế.
  // Ảnh gallery phần lớn vẫn hotlink sang CDN của hai sàn nguồn.
  const [brokenUrls, setBrokenUrls] = useState<string[]>([]);

  const productImages = product.images || [];
  const hasImages = productImages.length > 0;
  const currentUrl = hasImages ? productImages[currentImageIndex]?.url : undefined;
  const mainImage =
    currentUrl && !brokenUrls.includes(currentUrl) ? currentUrl : PLACEHOLDER_IMAGE;

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

  // Translate attribute keys to Vietnamese
  const translateAttributeKey = (key: string): string => {
    const translations: { [key: string]: string } = {
      // RAM
      'Ram': 'RAM',
      'RAM': 'RAM',
      'ram': 'RAM',
      
      // Display/Screen
      'Display': 'Màn hình',
      'display': 'Màn hình',
      'Screen': 'Màn hình',
      'screen': 'Màn hình',
      
      // Storage
      'Storage': 'Bộ nhớ',
      'storage': 'Bộ nhớ',
      
      // Processor/CPU
      'Processor': 'Bộ xử lý',
      'processor': 'Bộ xử lý',
      'CPU': 'Bộ xử lý',
      'cpu': 'Bộ xử lý',
      
      // Color
      'Color': 'Màu sắc',
      'color': 'Màu sắc',
      
      // Connectivity
      'Connectivity': 'Kết nối',
      'connectivity': 'Kết nối',
      
      // Battery
      'Battery': 'Pin',
      'battery': 'Pin',
      
      // Camera
      'Camera': 'Camera',
      'camera': 'Camera',
      
      // Physical
      'Weight': 'Trọng lượng',
      'weight': 'Trọng lượng',
      'Size': 'Kích thước',
      'size': 'Kích thước',
      'Material': 'Chất liệu',
      'material': 'Chất liệu',
    };
    return translations[key] || key;
  };

  if (!product.variants || product.variants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Sản phẩm này hiện không có phiên bản khác</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-8">
            <div className="relative aspect-square w-full max-w-2xl mx-auto bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
              {/* Không có ảnh nào thì để empty-state bên dưới lo, đừng vẽ chồng
                  ảnh thay thế lên nó. PLACEHOLDER_IMAGE chỉ dùng khi URL chết. */}
              {hasImages && (
                <Image
                  src={mainImage}
                  alt={productImages[currentImageIndex]?.alt || product.name}
                  fill
                  sizes="(min-width: 1024px) 500px, 100vw"
                  onError={() =>
                    currentUrl && setBrokenUrls((prev) => [...prev, currentUrl])
                  }
                  className="object-contain p-4"
                  priority
                />
              )}
              {hasImages && productImages.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10"
                    aria-label="Ảnh sau"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-800 dark:text-gray-200" />
                  </button>
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium z-10">
                    {currentImageIndex + 1} / {productImages.length}
                  </div>
                </>
              )}
              {!hasImages && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <Package className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Chưa có hình ảnh</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 dark:text-white">{product.name}</h1>
              {product.description && (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{product.description}</p>
              )}
            </div>
            {selectedVariant && (
              <div className="bg-[#fc4c00]/5 dark:bg-[#fc4c00]/10 p-6 rounded-xl border border-[#fc4c00]/20">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phiên bản đã chọn</p>
                    <p className="font-semibold text-base dark:text-white">SKU: {selectedVariant.sku}</p>
                  </div>
                  <Badge variant={getStockStatus(getAvailableStock(selectedVariant)).color as any} className="flex-shrink-0">
                    {getStockStatus(getAvailableStock(selectedVariant)).text}
                  </Badge>
                </div>
                
                {/* Specs Grid */}
                {visibleAttributes(selectedVariant.attributes).length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-[#fc4c00]/20">
                    {visibleAttributes(selectedVariant.attributes).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{translateAttributeKey(key)}: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatAttributeValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Price */}
                <div className="text-3xl font-bold text-[#af3200] dark:text-[#ff571a]">
                  {formatPrice(selectedVariant.price)}
                </div>
              </div>
            )}
            {selectedVariant && getAvailableStock(selectedVariant) > 0 && (
              <div className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <label htmlFor="quantity" className="text-sm font-medium whitespace-nowrap dark:text-gray-300">
                    Số lượng:
                  </label>
                  <div className="flex items-center border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      max={getAvailableStock(selectedVariant)}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.min(getAvailableStock(selectedVariant), Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 px-2 py-2 text-center border-0 focus:ring-0 focus:outline-none font-medium dark:bg-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
                      onClick={() => setQuantity(Math.min(getAvailableStock(selectedVariant), quantity + 1))}
                      disabled={quantity >= getAvailableStock(selectedVariant)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tổng cộng</div>
                    <div className="text-xl sm:text-2xl font-bold text-[#af3200] dark:text-[#ff571a]">
                      {formatPrice(selectedVariant.price * quantity)}
                    </div>
                  </div>
                  <Button
                    onClick={handleAddToCart}
                    className="w-full flex items-center justify-center gap-2 py-6 text-base bg-[#fc4c00] hover:bg-[#af3200] text-white rounded-full shadow-md"
                    disabled={!selectedVariant || getAvailableStock(selectedVariant) < quantity}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Thêm vào giỏ hàng</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="dark:text-white">Các phiên bản ({product.variants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedVariant?.id === variant.id ? "border-[#fc4c00] bg-[#fc4c00]/5 dark:bg-[#fc4c00]/10 ring-2 ring-[#fc4c00]/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"} ${getAvailableStock(variant) === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => getAvailableStock(variant) > 0 && handleVariantSelect(variant)}
              >
                {/* Row 1: SKU + Badge + Price */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-shrink min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">SKU: {variant.sku}</span>
                    <Badge variant={getStockStatus(getAvailableStock(variant)).color as any} className="text-xs flex-shrink-0">
                      {getStockStatus(getAvailableStock(variant)).text}
                    </Badge>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-xl font-bold text-[#af3200] dark:text-[#ff571a]">
                      {formatPrice(variant.price)}
                    </div>
                    {selectedVariant?.id === variant.id && (
                      <div className="text-xs text-[#af3200] dark:text-[#ff571a] font-medium">
                        ✓ Đã chọn
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Specs Grid */}
                {visibleAttributes(variant.attributes).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {visibleAttributes(variant.attributes).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-600 dark:text-gray-400">{translateAttributeKey(key)}: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatAttributeValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
