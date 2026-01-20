"use client";
import { CartListProps } from "@/interfaces/product";
import { CartItem } from "./CartItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { removeCartItem, updateQuantityChange } from "@/lib/cartApi";
import { toast, useSonner } from "sonner";
import { useCart } from "@/hooks/useCart";

export const CartList = ({ cart: initialCart }: CartListProps) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticCart, setOptimisticCart] = useState(initialCart);
  const { cart: liveCart, refreshCart } = useCart();
  console.log(initialCart);
  // Sử dụng optimistic cart để UI phản hồi ngay lập tức
  const currentCart = optimisticCart || liveCart || initialCart;
  
  // Null safety check - nếu không có cart data thì return early
  if (!currentCart) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Giỏ hàng trống</p>
      </div>
    );
  }
  
  // Sync optimistic cart với live cart khi có update từ server
  useEffect(() => {
    if (liveCart) {
      setOptimisticCart(liveCart);
    }
  }, [liveCart]);
  
  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    const updatedCart = {
      ...currentCart,
      data: {
        ...currentCart?.data,
        items: currentCart?.data?.items?.map((item: any) =>
          item.id === itemId ? { ...item, quantity } : item
        ) || []
      }
    };
    setOptimisticCart(updatedCart);
    
    setIsUpdating(true);
    try {
      const res = await updateQuantityChange(itemId, quantity) as any;
      console.log(res);
      
      if (res && res.success) {
        await refreshCart();
        toast.success(res?.data.message || "Cập nhật số lượng thành công");
      } else {
        setOptimisticCart(currentCart);
        toast.error(res?.data.message || "Cập nhật số lượng thất bại");
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
      setOptimisticCart(currentCart);
      toast.error("Có lỗi xảy ra khi cập nhật số lượng");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const originalCart = currentCart;
    const updatedCart = {
      ...currentCart,
      data: {
        ...currentCart?.data,
        items: currentCart?.data?.items?.filter((item: any) => item.id !== itemId) || []
      }
    };
    setOptimisticCart(updatedCart);
    
    setIsUpdating(true);
    try {
      const result = await removeCartItem(itemId);
      // TODO: Implement API call to remove item
      console.log(`Removing item ${itemId}`);

      await refreshCart();
      if(result && result.success) {
        toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      }
      else {
        setOptimisticCart(originalCart);
        toast.error(result?.data?.message || "Xóa sản phẩm thất bại");
      }

    } catch (error) {
      console.error("Failed to remove item:", error);
      setOptimisticCart(originalCart);
      toast.error("Có lỗi xảy ra khi xóa sản phẩm");
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

  const calculateSubtotal = () => {
    if (!currentCart?.data?.items) return 0;
    return currentCart.data.items.reduce((total: number, item: any) => {
      return total + (item.variant.price * item.quantity);
    }, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.1; // 10% VAT
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const total = subtotal + tax;

  if (!currentCart?.data?.items || currentCart.data.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Giỏ hàng trống
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Bạn chưa thêm sản phẩm nào vào giỏ hàng. 
              Hãy khám phá các sản phẩm tuyệt vời của chúng tôi!
            </p>
            <Button onClick={() => router.push("/")} className="flex items-center gap-2">
              Tiếp tục mua sắm
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto p-6 ${isUpdating ? 'pointer-events-none opacity-75' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Giỏ hàng của bạn ({currentCart?.data?.items?.length || 0} sản phẩm)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {currentCart?.data?.items?.map((item: any) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Tạm tính ({currentCart?.data?.items?.length || 0} sản phẩm):</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Thuế VAT (10%):</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Phí vận chuyển:</span>
                <span className="text-green-600">Miễn phí</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-red-600">{formatPrice(total)}</span>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={isUpdating}
                  onClick={() => router.push("/checkout")}
                >
                  Thanh toán
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push("/")}
                >
                  Tiếp tục mua sắm
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};