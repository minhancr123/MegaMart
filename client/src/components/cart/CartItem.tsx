"use client";
import { CartItemProps } from "@/interfaces/product";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getProductImage = () => {
    if (item.variant.product.images && item.variant.product.images.length > 0) {
      return item.variant.product.images[0].url;
    }
    return '/images/placeholder-product.svg';
  };

  const totalPrice = item.variant.price * item.quantity;

  return (
    <div className="flex items-center p-4 border-b last:border-b-0 bg-white dark:bg-gray-900">
      {/* Product Image */}
      <div className="w-20 h-20 flex-shrink-0 mr-4">
        <Image
          src={getProductImage()}
          alt={item.variant.product.name}
          width={80}
          height={80}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
          {item.variant.product.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          SKU: {item.variant.sku}
        </p>
        {item.variant.attributes && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {Object.entries(item.variant.attributes).map(([key, value]) => (
              <span key={key} className="mr-2">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}
        <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-2">
          {formatPrice(item.variant.price)}
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center mx-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={isUpdating || item.quantity <= 1}
          className="h-8 w-8 p-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="mx-3 font-medium min-w-[2rem] text-center dark:text-white">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isUpdating || item.quantity >= item.variant.stock}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Total Price */}
      <div className="text-right mr-4 min-w-[120px]">
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {formatPrice(totalPrice)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {item.quantity} × {formatPrice(item.variant.price)}
        </p>
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemoveItem}
        disabled={isUpdating}
        className="text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};