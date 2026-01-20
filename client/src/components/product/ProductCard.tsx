"use client";

import { Product, Variant } from "@/interfaces/product";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
  Star,
  Package2,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Heart,
  Scale,
  Sparkles
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCompareStore } from "@/store/compareStore";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (variantId: string, quantity: number) => void;
  onViewDetails?: (productId: string) => void;
}

export const ProductCard = ({ product, onAddToCart, onViewDetails }: ProductCardProps) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  );
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

  const getVariantStats = () => {
    if (!product.variants || product.variants.length === 0) {
      // Nếu không có variants, dùng giá của product chính
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

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: "Hết hàng", variant: "destructive", icon: AlertCircle };
    if (stock <= 5) return { text: `Còn ${stock}`, variant: "secondary", icon: Package2 };
    return { text: "Còn hàng", variant: "default", icon: Package2 };
  };

  const stats = getVariantStats();
  const stockStatus = getStockStatus(stats.totalStock);
  const StockIcon = stockStatus.icon;

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
    <Card className="group relative flex flex-col border-2 border-gray-100 bg-white hover:border-blue-300 hover:shadow-xl transition-all duration-200 min-h-[650px]">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 via-purple-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10"></div>

      {/* Product Image */}
      <div className="relative flex-shrink-0 bg-gradient-to-br from-gray-50 to-blue-50/20">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-52 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <Package2 className="h-16 w-16 text-gray-400" />
          </div>
        )}

        {/* Variant Count Badge */}
        {product.variants && product.variants.length > 0 && (
          <Badge
            className="absolute top-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {stats.variantCount} biến thể
          </Badge>
        )}

        {/* Stock Status Badge */}
        <Badge
          className={`absolute top-3 right-3 shadow-lg ${
            stats.totalStock === 0 
              ? 'bg-red-500 text-white' 
              : stats.totalStock <= 5 
              ? 'bg-orange-500 text-white' 
              : 'bg-green-500 text-white'
          }`}
        >
          <StockIcon className="h-3 w-3 mr-1" />
          {stockStatus.text}
        </Badge>

        {/* Quick actions: wishlist & compare */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => wishlist.toggle(product)}
            className={`h-10 w-10 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center ${wishlist.exists(product.id) ? "text-red-500 bg-red-50" : "text-gray-600"}`}
            aria-label="Yêu thích"
          >
            <Heart className="h-5 w-5" fill={wishlist.exists(product.id) ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => compare.toggle(product)}
            className={`h-10 w-10 rounded-full bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center ${compare.exists(product.id) ? "text-blue-600 bg-blue-50" : "text-gray-600"}`}
            aria-label="So sánh"
          >
            <Scale className="h-5 w-5" />
          </button>
        </div>
      </div>

      <CardHeader className="pb-3 flex-shrink-0 px-4">
        <h3 className="font-bold text-sm group-hover:text-blue-600 transition-colors leading-tight line-clamp-2 min-h-[2.5rem] flex items-start">
          <Link href={`/product/${product.id}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        {product.description && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mt-2 min-h-[2.5rem]">
            {product.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-3 flex-1 flex flex-col px-4 space-y-3 overflow-auto">
        {/* Price Range */}
        <div className="flex-shrink-0 bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-red-100">
          <div className="text-xs text-gray-600 mb-1">Giá bán</div>
          <div className="text-base font-bold text-red-600 leading-tight break-words">
            {getPriceRange()}
          </div>
          {stats.variantCount > 1 && (
            <div className="text-xs text-gray-500 mt-1">
              Từ {stats.variantCount} biến thể
            </div>
          )}
        </div>

        {/* Variants Dropdown */}
        <div className="flex-shrink-0">
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <Package2 className="h-4 w-4 text-blue-600" />
                Chọn biến thể:
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between text-left py-3 px-3 hover:bg-blue-50 hover:border-blue-300 transition-all min-h-[4rem]"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      {selectedVariant ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-xs text-gray-900 truncate">
                            {selectedVariant.sku}
                          </div>
                          {selectedVariant.attributes && (
                            <div className="text-xs text-gray-500 truncate">
                              {Object.entries(selectedVariant.attributes)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")}
                            </div>
                          )}
                          <div className="text-red-600 font-bold text-sm truncate">
                            {formatPrice(Number(selectedVariant.price))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Chọn biến thể...</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  </Button>
                </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-80 max-h-[320px] overflow-y-auto">
                    {product.variants.map((variant) => (
                      <DropdownMenuItem
                        key={variant.id}
                        className={`
                          cursor-pointer p-3 focus:bg-blue-50 rounded-md m-1
                          ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                          ${selectedVariant?.id === variant.id ? 'bg-blue-100 border-2 border-blue-400' : 'border border-transparent'}
                        `}
                        onSelect={() => variant.stock > 0 && setSelectedVariant(variant)}
                        disabled={variant.stock === 0}
                      >
                        <div className="w-full space-y-1.5">
                          <div className="flex justify-between items-center gap-2">
                            <span className="font-semibold text-xs text-gray-900 truncate flex-1">
                              SKU: {variant.sku}
                            </span>
                            <span className="text-red-600 font-bold text-sm whitespace-nowrap flex-shrink-0">
                              {formatPrice(Number(variant.price))}
                            </span>
                            {selectedVariant?.id === variant.id && (
                              <Badge className="bg-blue-600 text-white text-xs whitespace-nowrap flex-shrink-0">
                                ✓ Đã chọn
                              </Badge>
                            )}
                          </div>

                          {variant.attributes && (
                            <div className="text-xs text-gray-600 line-clamp-2">
                              {Object.entries(variant.attributes)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")}
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">
                              Tồn kho: <span className="text-blue-600">{variant.stock}</span>
                            </span>
                            {variant.stock === 0 && (
                              <Badge className="bg-red-500 text-white text-xs whitespace-nowrap">
                                Hết hàng
                              </Badge>
                            )}
                            {variant.stock > 0 && variant.stock <= 5 && (
                              <Badge className="bg-orange-500 text-white text-xs whitespace-nowrap">
                                Sắp hết
                              </Badge>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Selected variant summary */}
                {selectedVariant && (
                  <div className="text-xs bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-medium text-gray-700">Đã chọn:</span>
                      <span className="font-bold text-blue-700 truncate ml-2 max-w-[60%]">{selectedVariant.sku}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Tồn kho:</span>
                      <span className={`font-bold ${selectedVariant.stock > 5 ? 'text-green-600' : selectedVariant.stock > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                        {selectedVariant.stock}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category */}
          {product.category && (
            <div className="flex-shrink-0 mt-2">
              <Badge variant="outline" className="text-gray-600 text-xs">
                📁 {product.category.name}
              </Badge>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-4 pb-4 gap-2 flex-shrink-0 bg-gradient-to-t from-gray-50 to-transparent px-4 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all font-semibold"
            onClick={handleViewDetails}
          >
            <Eye className="h-4 w-4 mr-1" />
            Chi tiết
          </Button>

          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all font-semibold"
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stock === 0}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Thêm giỏ
          </Button>
        </CardFooter>
      </Card>
  );
};