"use client";

import { Product, Variant } from "@/interfaces/product";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  Eye,
  Package2,
  ChevronDown,
  Heart,
  Scale,
  Star
} from "lucide-react";
import { useState, memo } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCompareStore } from "@/store/compareStore";
import { getPrimaryImageUrl, handleImageError } from '@/lib/imageUtils';
import { visibleAttributes, formatAttributeValue } from '@/lib/productAttributes';
import { getAvailableStock } from '@/lib/stock';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (variantId: string, quantity: number) => void;
  onViewDetails?: (productId: string) => void;
}

const ProductCardComponent = ({ product, onAddToCart, onViewDetails }: ProductCardProps) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  );
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const wishlist = useWishlistStore();
  const compare = useCompareStore();

  const formatPrice = (price: number): string => {
    if (!price || isNaN(price)) {
      return 'Liên hệ';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Translate attribute keys to Vietnamese
  const translateAttributeKey = (key: string): string => {
    const translations: { [key: string]: string } = {
      'Ram': 'RAM',
      'RAM': 'RAM',
      'ram': 'RAM',
      'Display': 'Màn hình',
      'display': 'Màn hình',
      'Storage': 'Bộ nhớ',
      'storage': 'Bộ nhớ',
      'Color': 'Màu sắc',
      'color': 'Màu sắc',
      'Connectivity': 'Kết nối',
      'connectivity': 'Kết nối',
      'Processor': 'Bộ xử lý',
      'processor': 'Bộ xử lý',
      'Battery': 'Pin',
      'battery': 'Pin',
      'Camera': 'Camera',
      'camera': 'Camera',
      'Weight': 'Trọng lượng',
      'weight': 'Trọng lượng',
      'Size': 'Kích thước',
      'size': 'Kích thước',
      'Material': 'Chất liệu',
      'material': 'Chất liệu',
    };
    return translations[key] || key;
  };

  const getVariantStats = () => {
    if (!product.variants || product.variants.length === 0) {
      const basePrice = product.price || 0;
      return {
        minPrice: basePrice,
        maxPrice: basePrice,
        totalStock: 0,
        variantCount: 0
      };
    }

    const prices = product.variants.map(v => Number(v.price) || 0).filter(p => p > 0);
    const stocks = product.variants.map(v => getAvailableStock(v));

    if (prices.length === 0) {
      return {
        minPrice: product.price || 0,
        maxPrice: product.price || 0,
        totalStock: stocks.reduce((sum, stock) => sum + stock, 0),
        variantCount: product.variants.length
      };
    }

    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      totalStock: stocks.reduce((sum, stock) => sum + stock, 0),
      variantCount: product.variants.length
    };
  };

  const getPriceRange = () => {
    const stats = getVariantStats();

    if (!stats.minPrice || stats.minPrice === 0) {
      return 'Liên hệ';
    }

    if (stats.minPrice === stats.maxPrice) {
      return formatPrice(stats.minPrice);
    }
    return `${formatPrice(stats.minPrice)} - ${formatPrice(stats.maxPrice)}`;
  };

  const stats = getVariantStats();

  // Get product image - use selected variant's selected color image if available
  const getProductImage = () => {
    if (selectedVariant) {
      const colors = (selectedVariant as any).colors;
      if (colors && Array.isArray(colors) && colors.length > 0) {
        const selectedColor = colors[selectedColorIndex];
        if (selectedColor?.imageUrl) {
          return selectedColor.imageUrl;
        }
      }
    }

    return product.imageUrl ||
      (product as any).image ||
      getPrimaryImageUrl(product.images) ||
      '';
  };

  const productImage = getProductImage();

  const handleAddToCart = () => {
    if (selectedVariant && onAddToCart) {
      onAddToCart(selectedVariant.id, 1);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(product.id);
    }
  };

  return (
    <div className="group h-full w-full min-w-0">
      <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-300 hover:border-[#fc4c00]/40 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-[#ff571a]/40">
        {/* Product Image */}
        <Link href={`/product/${product.id}`} className="relative block overflow-hidden bg-slate-50 dark:bg-gray-800 rounded-t-2xl group">
          <div className="aspect-square relative overflow-hidden">
            {productImage ? (
              <img
                src={productImage}
                alt={product.name}
                loading="lazy"
                onError={handleImageError}
                className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-4 dark:brightness-90"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Package2 className="h-20 w-20 text-slate-300 dark:text-gray-600" />
              </div>
            )}

            {/* Overlay gradient and Quick View on hover */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
              <Button
                variant="secondary"
                size="sm"
                className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300 bg-white/90 text-gray-900 hover:bg-white font-medium shadow-xl cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  if (onViewDetails) onViewDetails(product.id);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Xem nhanh
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.variants && product.variants.length > 1 && (
              <Badge className="bg-[#fc4c00] text-white border-none shadow-lg backdrop-blur-sm">
                {stats.variantCount} phiên bản
              </Badge>
            )}
          </div>

          <div className="absolute top-3 right-3">
            <Badge
              className={`shadow-lg backdrop-blur-sm ${stats.totalStock === 0
                ? 'bg-red-500/90 text-white'
                : stats.totalStock <= 5
                  ? 'bg-orange-500/90 text-white'
                  : 'bg-green-500/90 text-white'
                }`}
            >
              {stats.totalStock === 0 ? 'Hết hàng' : stats.totalStock <= 5 ? `Còn ${stats.totalStock}` : 'Còn hàng'}
            </Badge>
          </div>

          {/* Quick actions - moved to top */}
          <div className="absolute top-16 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={(e) => {
                e.preventDefault();
                wishlist.toggle(product);
              }}
              className={`h-10 w-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center cursor-pointer ${wishlist.exists(product.id) ? "text-red-500" : "text-slate-600"}`}
            >
              <Heart className="h-5 w-5" fill={wishlist.exists(product.id) ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                compare.toggle(product);
              }}
              className={`h-10 w-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center cursor-pointer ${compare.exists(product.id) ? "text-[#af3200]" : "text-slate-600"}`}
            >
              <Scale className="h-5 w-5" />
            </button>
          </div>
        </Link>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col p-5">
          {/* Title */}
          <Link href={`/product/${product.id}`} className="cursor-pointer">
            <h3 className="mb-3 min-h-[2.7rem] break-words font-bold leading-[1.35] text-slate-900 line-clamp-2 transition-colors group-hover:text-[#af3200] dark:text-white dark:group-hover:text-[#ff571a]">
              {product.name}
            </h3>
          </Link>

          {/* Category */}
          {product.category && (
            <div className="mb-3">
              <Badge variant="outline" className="text-slate-600 dark:text-gray-400 text-xs border-slate-200 dark:border-gray-700">
                {product.category.name}
              </Badge>
            </div>
          )}

          {/* Rating (dynamic) */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => {
                const rating = (product as any).rating || 4.2;
                const isFilled = i < Math.floor(rating);
                const isHalf = !isFilled && i < rating && i >= Math.floor(rating);

                return (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${isFilled
                      ? 'text-yellow-400 fill-yellow-400'
                      : isHalf
                        ? 'text-yellow-400 fill-yellow-200'
                        : 'text-slate-200 fill-slate-200'
                      }`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400">
              {(product as any).rating ? `(${((product as any).rating).toFixed(1)})` : '(4.2)'}
            </span>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="text-lg font-bold text-[#af3200] dark:text-[#ff571a]">
              {selectedVariant ? formatPrice(Number(selectedVariant.price)) : getPriceRange()}
            </div>
            {selectedVariant ? (
              <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {selectedVariant.sku}
              </div>
            ) : stats.variantCount > 1 ? (
              <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Từ {stats.variantCount} biến thể
              </div>
            ) : null}
          </div>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-4 space-y-3">
              {/* SKU dropdown - select variant first */}
              {product.variants.length > 1 && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left hover:bg-[#fc4c00]/5 dark:hover:bg-[#fc4c00]/10 hover:border-[#fc4c00]/40 transition-all rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <div className="flex-1 min-w-0 truncate">
                      {selectedVariant ? (
                        <span className="font-medium text-sm">{selectedVariant.sku}</span>
                      ) : (
                        <span className="text-slate-500 dark:text-gray-400 text-sm">Chọn phiên bản</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#af3200] dark:text-[#ff571a]" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto dark:bg-gray-900 dark:border-gray-800">
                  {product.variants.map((variant) => (
                    <DropdownMenuItem
                      key={variant.id}
                      className={`cursor-pointer p-3 ${selectedVariant?.id === variant.id ? 'bg-[#fc4c00]/10 dark:bg-[#fc4c00]/10' : ''} dark:text-white dark:hover:bg-gray-800`}
                      onSelect={() => {
                        if (getAvailableStock(variant) > 0) {
                          setSelectedVariant(variant);
                          setSelectedColorIndex(0); // Reset to first color
                        }
                      }}
                      disabled={getAvailableStock(variant) === 0}
                    >
                      <div className="w-full space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs dark:text-white">{variant.sku}</span>
                          <span className="text-[#af3200] dark:text-[#ff571a] font-bold text-sm">
                            {formatPrice(Number(variant.price))}
                          </span>
                        </div>
                        {variant.attributes && (
                          <div className="text-xs text-slate-600 dark:text-gray-300">
                            {visibleAttributes(variant.attributes).map(([key, value]) => `${translateAttributeKey(key)}: ${formatAttributeValue(value)}`).join(", ")}
                          </div>
                        )}
                        <div className="text-xs">
                          <span className={getAvailableStock(variant) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {getAvailableStock(variant) > 0 ? `Còn ${getAvailableStock(variant)}` : 'Hết hàng'}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>}

              {/* Color swatches - only show colors of selected variant */}
              {selectedVariant && (selectedVariant as any).colors && Array.isArray((selectedVariant as any).colors) && (selectedVariant as any).colors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">Màu sắc:</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedVariant as any).colors.map((color: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedColorIndex(index)}
                        className={`relative h-8 w-8 rounded-full border-2 transition-all ${selectedColorIndex === index
                          ? 'border-[#af3200] ring-2 ring-[#fc4c00]/30'
                          : 'border-slate-300 hover:border-slate-400'
                          } cursor-pointer`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  {(selectedVariant as any).colors[selectedColorIndex] && (
                    <div className="text-xs text-slate-600">
                      Màu: {(selectedVariant as any).colors[selectedColorIndex].name}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Variant Attributes */}
              {selectedVariant && visibleAttributes(selectedVariant.attributes).length > 0 && (
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-gray-800 rounded-xl">
                  <div className="text-xs font-medium text-slate-600 dark:text-gray-300">Thông số:</div>
                  <div className="flex flex-wrap gap-2">
                    {visibleAttributes(selectedVariant.attributes).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1 text-xs">
                        <span className="font-medium text-slate-700 dark:text-gray-300 capitalize">{translateAttributeKey(key)}:</span>
                        <span className="text-slate-600 dark:text-gray-400">{formatAttributeValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {/* Actions */}
          <div className="mt-auto pt-3">
            <Button
              size="default"
              className="w-full bg-[#fc4c00] hover:bg-[#af3200] text-white shadow-md hover:shadow-lg transition-all rounded-xl font-medium h-10 cursor-pointer disabled:cursor-not-allowed"
              onClick={handleAddToCart}
              disabled={!selectedVariant || getAvailableStock(selectedVariant) <= 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {selectedVariant && getAvailableStock(selectedVariant) <= 0 ? "Hết hàng" : "Thêm vào giỏ"}
            </Button>
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
