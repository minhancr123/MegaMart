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
  Sparkles,
  Star
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCompareStore } from "@/store/compareStore";
import { motion } from "framer-motion";
import { getPrimaryImageUrl } from "@/lib/imageUtils";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (variantId: string, quantity: number) => void;
  onViewDetails?: (productId: string) => void;
}

export const ProductCard = ({ product, onAddToCart, onViewDetails }: ProductCardProps) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  );
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const wishlist = useWishlistStore();
  const compare = useCompareStore();

  // Debug: Log colors data
  console.log('Product:', product.name);
  console.log('Variants:', product.variants?.map(v => ({
    sku: (v as any).sku,
    hasColors: !!(v as any).colors,
    colorsLength: Array.isArray((v as any).colors) ? (v as any).colors.length : 'not array',
    colors: (v as any).colors
  })));

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
    const stocks = product.variants.map(v => Number(v.stock) || 0);

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <div className="relative flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
        {/* Product Image */}
        <Link href={`/product/${product.id}`} className="relative block overflow-hidden bg-slate-50 dark:bg-gray-800 rounded-t-2xl">
          <div className="aspect-square relative">
            {productImage ? (
              <img
                src={productImage}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 dark:brightness-90"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Package2 className="h-20 w-20 text-slate-300 dark:text-gray-600" />
              </div>
            )}

            {/* Overlay gradient on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.variants && product.variants.length > 0 && (
              <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none shadow-lg backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {stats.variantCount} biến thể
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
              className={`h-10 w-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center ${wishlist.exists(product.id) ? "text-red-500" : "text-slate-600"}`}
            >
              <Heart className="h-5 w-5" fill={wishlist.exists(product.id) ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                compare.toggle(product);
              }}
              className={`h-10 w-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center ${compare.exists(product.id) ? "text-indigo-600" : "text-slate-600"}`}
            >
              <Scale className="h-5 w-5" />
            </button>
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 flex flex-col p-5">
          {/* Title */}
          <Link href={`/product/${product.id}`}>
            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2 mb-3 h-12">
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
            <span className="text-xs text-slate-500">
              {(product as any).rating ? `(${((product as any).rating).toFixed(1)})` : '(4.2)'}
            </span>
          </div>

          {/* Price */}
          <div className="mb-4">
            <div className="text-lg font-bold text-indigo-600">
              {selectedVariant ? formatPrice(Number(selectedVariant.price)) : getPriceRange()}
            </div>
            {selectedVariant ? (
              <div className="text-xs text-slate-500 mt-1">
                {selectedVariant.sku}
              </div>
            ) : stats.variantCount > 1 ? (
              <div className="text-xs text-slate-500 mt-1">
                Từ {stats.variantCount} biến thể
              </div>
            ) : null}
          </div>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-4 space-y-3">
              {/* SKU dropdown - select variant first */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left hover:bg-indigo-50 hover:border-indigo-300 transition-all rounded-xl"
                  >
                    <div className="flex-1 min-w-0 truncate">
                      {selectedVariant ? (
                        <span className="font-medium text-sm">{selectedVariant.sku}</span>
                      ) : (
                        <span className="text-slate-500 text-sm">Chọn biến thể</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-indigo-600" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto">
                  {product.variants.map((variant) => (
                    <DropdownMenuItem
                      key={variant.id}
                      className={`cursor-pointer p-3 ${selectedVariant?.id === variant.id ? 'bg-indigo-50' : ''}`}
                      onSelect={() => {
                        if (variant.stock > 0) {
                          setSelectedVariant(variant);
                          setSelectedColorIndex(0); // Reset to first color
                        }
                      }}
                      disabled={variant.stock === 0}
                    >
                      <div className="w-full space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs">{variant.sku}</span>
                          <span className="text-indigo-600 font-bold text-sm">
                            {formatPrice(Number(variant.price))}
                          </span>
                        </div>
                        {variant.attributes && (
                          <div className="text-xs text-slate-600">
                            {Object.entries(variant.attributes).map(([key, value]) => `${key}: ${value}`).join(", ")}
                          </div>
                        )}
                        <div className="text-xs">
                          <span className={variant.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                            {variant.stock > 0 ? `Còn ${variant.stock}` : 'Hết hàng'}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Color swatches - only show colors of selected variant */}
              {selectedVariant && (selectedVariant as any).colors && Array.isArray((selectedVariant as any).colors) && (selectedVariant as any).colors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-600">Màu sắc:</div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedVariant as any).colors.map((color: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedColorIndex(index)}
                        className={`relative h-8 w-8 rounded-full border-2 transition-all ${
                          selectedColorIndex === index
                            ? 'border-indigo-600 ring-2 ring-indigo-200'
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
              {selectedVariant && selectedVariant.attributes && Object.keys(selectedVariant.attributes).length > 0 && (
                <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs font-medium text-slate-600">Thông số:</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedVariant.attributes).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1 text-xs">
                        <span className="font-medium text-slate-700 capitalize">{key}:</span>
                        <span className="text-slate-600">{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl"
              onClick={handleViewDetails}
            >
              <Eye className="h-4 w-4 mr-1" />
              Chi tiết
            </Button>

            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all rounded-xl"
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.stock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Thêm vào giỏ
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};