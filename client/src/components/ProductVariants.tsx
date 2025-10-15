"use client";

import { useState } from "react";
import { Variant, Product } from "@/interfaces/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Star } from "lucide-react";

interface ProductVariantsProps {
  product: Product;
  onAddToCart?: (variantId: string, quantity: number) => void;
}

export const ProductVariants = ({ product, onAddToCart }: ProductVariantsProps) => {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants?.[0] || null
  );
  const [quantity, setQuantity] = useState(1);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);
    setQuantity(1); // Reset quantity when changing variant
  };

  const handleAddToCart = () => {
    if (selectedVariant && onAddToCart) {
      onAddToCart(selectedVariant.id, quantity);
    }
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
      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.description && (
            <p className="text-gray-600 mb-4">{product.description}</p>
          )}
          
          {/* Selected Variant Info */}
          {selectedVariant && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">Biến thể đã chọn</h4>
                  <p className="text-sm text-gray-600">SKU: {selectedVariant.sku}</p>
                </div>
                <Badge variant={getStockStatus(selectedVariant.stock).color as any}>
                  {getStockStatus(selectedVariant.stock).text}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-red-600">
                  {formatPrice(selectedVariant.price)}
                </span>
                {selectedVariant.attributes && (
                  <div className="text-sm text-gray-500">
                    {JSON.stringify(selectedVariant.attributes)}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variants List */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn biến thể ({product.variants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all
                  ${selectedVariant?.id === variant.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                  ${variant.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                onClick={() => variant.stock > 0 && handleVariantSelect(variant)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">SKU: {variant.sku}</span>
                      <Badge variant={getStockStatus(variant.stock).color as any}>
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
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-600">
                      {formatPrice(variant.price)}
                    </div>
                    {selectedVariant?.id === variant.id && (
                      <div className="text-sm text-blue-600 mt-1">
                        ✓ Đã chọn
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add to Cart Section */}
      {selectedVariant && selectedVariant.stock > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Số lượng:
                </label>
                <div className="flex items-center border rounded-md">
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100"
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
                    className="w-16 px-2 py-1 text-center border-0 focus:ring-0"
                  />
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
                    disabled={quantity >= selectedVariant.stock}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="flex-1 text-right">
                <div className="text-lg font-semibold">
                  Tổng: {formatPrice(selectedVariant.price * quantity)}
                </div>
              </div>
              
              <Button 
                onClick={handleAddToCart}
                className="flex items-center gap-2"
                disabled={!selectedVariant || selectedVariant.stock < quantity}
              >
                <ShoppingCart className="h-4 w-4" />
                Thêm vào giỏ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};