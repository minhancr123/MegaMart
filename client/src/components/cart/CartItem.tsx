"use client";

import { CartItemProps } from "@/interfaces/product";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { visibleAttributes, formatAttributeValue } from "@/lib/productAttributes";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export const CartItem = ({ item, onUpdateQuantity, onRemoveItem }: CartItemProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) return;

    setIsUpdating(true);
    try {
      await onUpdateQuantity(item.id, newQuantity);
    } catch (error) {
      console.error("Failed to update quantity:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async () => {
    setIsUpdating(true);
    try {
      await onRemoveItem(item.id);
    } catch (error) {
      console.error("Failed to remove item:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getProductImage = () => {
    if (item.variant?.product?.images && item.variant.product.images.length > 0) {
      return item.variant.product.images[0].url;
    }
    return "/images/placeholder-product.svg";
  };

  const unitPrice = Number(item.variant?.salePrice || item.variant?.price || 0);
  const totalPrice = unitPrice * item.quantity;
  const originalPrice = item.variant?.salePrice ? Number(item.variant.price) : null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-muted/30 transition-colors">
      {/* Product Information Left Side */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Link
          href={`/product/${item.variant?.product?.id}`}
          className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-muted/40 rounded-xl overflow-hidden border border-border group"
        >
          <Image
            src={getProductImage()}
            alt={item.variant?.product?.name || "Product"}
            fill
            sizes="96px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/product/${item.variant?.product?.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 text-sm sm:text-base leading-snug"
          >
            {item.variant?.product?.name}
          </Link>

          {/* Variant attributes */}
          {item.variant?.attributes && visibleAttributes(item.variant.attributes).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {visibleAttributes(item.variant.attributes).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                >
                  {key}: {formatAttributeValue(value)}
                </span>
              ))}
            </div>
          )}

          {/* Price display on Mobile */}
          <div className="flex items-baseline gap-2 mt-2 sm:hidden">
            <span className="font-bold text-primary text-base">
              {formatPrice(unitPrice)}
            </span>
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unit price on Desktop */}
      <div className="hidden sm:block text-right min-w-[110px]">
        <div className="font-bold text-foreground text-base">
          {formatPrice(unitPrice)}
        </div>
        {originalPrice && (
          <div className="text-xs text-muted-foreground line-through mt-0.5">
            {formatPrice(originalPrice)}
          </div>
        )}
      </div>

      {/* Controls & Total Right Side */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
        {/* Quantity Controls - rounded Stitch style */}
        <div className="flex items-center border border-border bg-card rounded-full p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isUpdating || item.quantity <= 1}
            className="h-7 w-7 rounded-full text-foreground hover:bg-muted"
            aria-label="Giảm số lượng"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>

          <span className="w-8 text-center text-sm font-semibold text-foreground select-none">
            {item.quantity}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isUpdating || (item.variant?.stock != null && item.quantity >= item.variant.stock)}
            className="h-7 w-7 rounded-full text-foreground hover:bg-muted"
            aria-label="Tăng số lượng"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Total Price on Desktop */}
        <div className="hidden md:block text-right min-w-[110px]">
          <span className="font-bold text-primary text-base">
            {formatPrice(totalPrice)}
          </span>
        </div>

        {/* Delete Item */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemoveItem}
          disabled={isUpdating}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
          aria-label="Xóa sản phẩm"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
