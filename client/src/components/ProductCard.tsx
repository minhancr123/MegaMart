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
  ChevronDown 
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (variantId: string, quantity: number) => void;
  onViewDetails?: (productId: string) => void;
}

export const ProductCard = ({ product, onAddToCart, onViewDetails }: ProductCardProps) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  );

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getVariantStats = () => {
    if (!product.variants || product.variants.length === 0) {
      return { minPrice: product.price, maxPrice: product.price, totalStock: 0, variantCount: 0 };
    }

    const prices = product.variants.map(v => v.price);
    const stocks = product.variants.map(v => v.stock);
    
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      totalStock: stocks.reduce((sum, stock) => sum + stock, 0),
      variantCount: product.variants.length
    };
  };

  const getPriceRange = () => {
    const stats = getVariantStats();
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
    <Card className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden h-[730px] flex flex-col">

      {/* Product Image */}
      <div className="relative overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <Package2 className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Variant Count Badge */}
        {product.variants && product.variants.length > 0 && (
          <Badge 
            className="absolute top-2 left-2" 
            variant="secondary"
          >
            {stats.variantCount} biến thể
          </Badge>
        )}
        
        {/* Stock Status Badge */}
        <Badge 
          className="absolute top-2 right-2" 
          variant={stockStatus.variant as any}
        >
          <StockIcon className="h-3 w-3 mr-1" />
          {stockStatus.text}
        </Badge>
      </div>

      <CardHeader className="pb-2 flex-shrink-0">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors min-h-[56px]">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
            {product.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-2 flex-1 flex flex-col">
        {/* Price Range */}
        <div className="mb-3 flex-shrink-0">
          <div className="text-[18px] font-bold text-red-600">
            {getPriceRange()}
          </div>
          {stats.variantCount > 1 ? (
            <div className="text-xs text-gray-500">
              Giá từ {stats.variantCount} biến thể
            </div>
          ) : (
            <div className="mt-4">
                </div>
          )}
        </div>

        {/* Variants Dropdown */}
        <div className="flex-1 flex flex-col">
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 flex-1">
              <div className="text-sm font-medium text-gray-700">
                Chọn biến thể:
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between text-left h-auto py-3 px-3"
                  >
                    <div className="flex-1 min-w-0">
                      {selectedVariant ? (
                        <div>
                          <div className="font-medium text-sm truncate">
                            {selectedVariant.sku}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {selectedVariant.attributes && 
                              Object.entries(selectedVariant.attributes)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(", ")
                            }
                          </div>
                          <div className="text-red-600 font-semibold text-sm">
                            {formatPrice(selectedVariant.price)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Chọn biến thể...</span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-80 max-h-60 overflow-y-auto">
                  {product.variants.map((variant) => (
                    <DropdownMenuItem
                      key={variant.id}
                      className={`
                        cursor-pointer p-3 focus:bg-blue-50
                        ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                        ${selectedVariant?.id === variant.id ? 'bg-blue-50 text-blue-700' : ''}
                      `}
                      onSelect={() => variant.stock > 0 && setSelectedVariant(variant)}
                      disabled={variant.stock === 0}
                    >
                      <div className="w-full">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">SKU: {variant.sku}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 font-semibold">
                              {formatPrice(variant.price)}
                            </span>
                            {selectedVariant?.id === variant.id && (
                              <Badge variant="default" className="text-xs">
                                Đã chọn
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {variant.attributes && (
                          <div className="text-xs text-gray-600 mb-1">
                            {Object.entries(variant.attributes)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ")}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            Tồn kho: {variant.stock}
                          </span>
                          {variant.stock === 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Hết hàng
                            </Badge>
                          )}
                          {variant.stock > 0 && variant.stock <= 5 && (
                            <Badge variant="secondary" className="text-xs">
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
                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <span>Biến thể đã chọn:</span>
                    <span className="font-medium">{selectedVariant.sku}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>Tồn kho:</span>
                    <span className={selectedVariant.stock > 5 ? 'text-green-600' : selectedVariant.stock > 0 ? 'text-orange-600' : 'text-red-600'}>
                      {selectedVariant.stock} sản phẩm
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category */}
        {product.category && 
        
        (
          <div className="mt-2 text-xs text-gray-500 flex-shrink-0">
            Danh mục: {product.category.name}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 space-x-2 flex-shrink-0 mt-auto">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={handleViewDetails}
        >
          <Eye className="h-4 w-4 mr-1" />
          Xem chi tiết
        </Button>
        
        <Button 
          size="sm" 
          className="flex-1"
          onClick={handleAddToCart}
          disabled={!selectedVariant || selectedVariant.stock === 0}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Thêm vào giỏ
        </Button>
      </CardFooter>
    </Card>
  );
};