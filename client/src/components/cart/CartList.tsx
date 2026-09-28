"use client";

import { CartListProps } from "@/interfaces/product";
import { CartItem } from "./CartItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { removeCartItem, updateQuantityChange } from "@/lib/cartApi";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useAuthStore } from "@/store/authStore";
import { fetchAddressesByUser, type Address } from "@/lib/addressApi";
import { calculateGhnFee } from "@/lib/shippingApi";
import { FreeshipProgress } from "./FreeshipProgress";
import { MobileStickyBar } from "./MobileStickyBar";
import { formatPrice } from "@/lib/utils";

export const CartList = ({ cart: initialCart }: CartListProps) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticCart, setOptimisticCart] = useState(initialCart);
  const { cart: liveCart, refreshCart } = useCart();

  const currentCart = optimisticCart || liveCart || initialCart;

  useEffect(() => {
    if (liveCart) {
      setOptimisticCart(liveCart);
    }
  }, [liveCart]);

  const { user } = useAuthStore();
  // Địa chỉ mặc định để tính phí GHN thật (giống fallback ở checkout: mặc định, không có thì lấy đầu tiên)
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  // Phí ship GHN thật; chưa có địa chỉ/mã GHN hoặc GHN lỗi thì hiện "Tính khi thanh toán"
  const [shippingFee, setShippingFee] = useState(0);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(false);
  const feeSeq = useRef(0);

  const items = currentCart?.data?.items || [];
  const totalItemsCount = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
  const subtotal = items.reduce((total: number, item: any) => {
    const price = Number(item.variant?.salePrice || item.variant?.price || 0);
    return total + price * item.quantity;
  }, 0);
  const hasGhnCodes = Boolean(defaultAddress?.districtId && defaultAddress?.wardCode);

  useEffect(() => {
    if (!user?.id) {
      setDefaultAddress(null);
      return;
    }
    let alive = true;
    fetchAddressesByUser(user.id)
      .then((data) => {
        if (!alive) return;
        setDefaultAddress(data.find((a) => a.isDefault) || data[0] || null);
      })
      .catch(() => {
        if (alive) setDefaultAddress(null);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const districtId = defaultAddress?.districtId;
    const wardCode = defaultAddress?.wardCode;
    if (!districtId || !wardCode || items.length === 0) {
      setShippingFee(0);
      setFeeError(false);
      setFeeLoading(false);
      return;
    }
    let alive = true;
    const seq = ++feeSeq.current;
    setFeeLoading(true);
    setFeeError(false);
    // Cùng công thức với checkout: mỗi món ~500g, kẹp 300g–20000g
    const weight = Math.min(20000, Math.max(300, totalItemsCount * 500));
    calculateGhnFee({ toDistrictId: Number(districtId), toWardCode: String(wardCode), weight, insuranceValue: subtotal })
      .then((q) => {
        if (alive && seq === feeSeq.current) setShippingFee(Number(q?.fee || 0));
      })
      .catch(() => {
        // GHN lỗi thì không được hiện "Miễn phí" — để cờ lỗi cho UI hiện "Tính khi thanh toán"
        if (alive && seq === feeSeq.current) {
          setShippingFee(0);
          setFeeError(true);
        }
      })
      .finally(() => {
        if (alive && seq === feeSeq.current) setFeeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [defaultAddress?.districtId, defaultAddress?.wardCode, totalItemsCount, subtotal]);

  if (!currentCart) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Giỏ hàng trống</p>
      </div>
    );
  }

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    const updatedCart = {
      ...currentCart,
      data: {
        ...currentCart?.data,
        items:
          currentCart?.data?.items?.map((item: any) =>
            item.id === itemId ? { ...item, quantity } : item
          ) || [],
      },
    };
    setOptimisticCart(updatedCart);

    setIsUpdating(true);
    try {
      const res = (await updateQuantityChange(itemId, quantity)) as any;
      const resObj = typeof res === "object" && res !== null ? res : null;
      if (resObj?.success) {
        await refreshCart();
        toast.success(resObj?.message || "Cập nhật số lượng thành công");
      } else {
        setOptimisticCart(currentCart);
        toast.error(typeof res === "string" ? res : (resObj?.message || "Cập nhật số lượng thất bại"));
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
        items:
          currentCart?.data?.items?.filter((item: any) => item.id !== itemId) || [],
      },
    };
    setOptimisticCart(updatedCart);

    setIsUpdating(true);
    try {
      const result = await removeCartItem(itemId);
      const resObj = typeof result === "object" && result !== null ? (result as any) : null;
      if (resObj?.success) {
        await refreshCart();
        toast.success(resObj?.message || "Đã xóa sản phẩm khỏi giỏ hàng");
      } else {
        setOptimisticCart(originalCart);
        toast.error(typeof result === "string" ? result : (resObj?.message || "Xóa sản phẩm thất bại"));
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
      setOptimisticCart(originalCart);
      toast.error("Có lỗi xảy ra khi xóa sản phẩm");
    } finally {
      setIsUpdating(false);
    }
  };

  // Ngưỡng gợi ý dùng mã FREESHIP (voucher yêu cầu đơn từ 500K), chỉ để hiển
  // thị thanh tiến trình — không tự miễn phí ship (phí ship luôn lấy từ GHN).
  const FREESHIP_THRESHOLD = 500000;
  const total = Math.max(0, subtotal + shippingFee);

  // Giỏ hàng trống
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card className="text-center p-8 border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center p-0">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Hãy khám phá hàng ngàn sản phẩm điện máy và gia dụng chính hãng tại MegaMart!
            </p>
            <Button
              onClick={() => router.push("/products")}
              className="flex items-center gap-2 rounded-full px-6 shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Tiếp tục mua sắm
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 pb-20 md:pb-6 ${isUpdating ? "opacity-75 pointer-events-none" : ""}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Danh sách sản phẩm (Bên trái) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden gap-0 py-0">
            <CardHeader className="p-4 sm:p-5 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Giỏ hàng của bạn
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({totalItemsCount} sản phẩm)
                  </span>
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-border">
              {items.map((item: any) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                />
              ))}
            </CardContent>
          </Card>

        </div>

        {/* Cột Tóm tắt Đơn hàng (Bên phải - Desktop Sticky) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Box Tổng Đơn Hàng */}
          <Card className="border border-border bg-card rounded-2xl p-5 sm:p-6 shadow-sm sticky top-24 space-y-5">
            <CardHeader className="p-0">
              <CardTitle className="text-lg font-bold text-foreground">
                Tổng đơn hàng
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0 space-y-4">
              {/* Chi tiết từng mục tiền */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Tạm tính ({totalItemsCount} sản phẩm)</span>
                  <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-muted-foreground">
                  <span>
                    Phí vận chuyển (GHN)
                    {hasGhnCodes && defaultAddress && (
                      <span className="block text-[11px]">
                        Giao đến: {[defaultAddress.ward, defaultAddress.district].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </span>
                  <span>
                    {feeLoading ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tính...
                      </span>
                    ) : hasGhnCodes && !feeError ? (
                      shippingFee === 0 ? (
                        <span className="font-semibold text-[var(--success)]">Miễn phí</span>
                      ) : (
                        <span className="font-medium text-foreground">{formatPrice(shippingFee)}</span>
                      )
                    ) : (
                      <span className="font-medium text-foreground">Tính khi thanh toán</span>
                    )}
                  </span>
                </div>

              </div>

              {/* Thanh tiến trình Freeship chuẩn Stitch */}
              <FreeshipProgress subtotal={subtotal} threshold={FREESHIP_THRESHOLD} />

              <div className="border-t border-border pt-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-bold text-base text-foreground block">
                      Tổng cộng
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (Đã bao gồm VAT nếu có)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary tracking-tight block">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-2 space-y-2.5">
                <Button
                  onClick={() => router.push("/checkout")}
                  className="w-full h-12 rounded-xl text-base font-bold shadow-md flex items-center justify-center gap-2 group"
                >
                  <span>Tiếp tục thanh toán</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() => router.push("/products")}
                  className="w-full h-10 rounded-xl text-sm font-medium border-border"
                >
                  Tiếp tục mua sắm
                </Button>
              </div>

              {/* Cam kết yên tâm mua hàng */}
              <div className="pt-3 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Bảo mật 100% &amp; Đổi trả dễ dàng trong 30 ngày</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Thanh Bottom Sticky cho thiết bị di động */}
      <MobileStickyBar
        total={total}
        onCheckout={() => router.push("/checkout")}
        disabled={isUpdating}
      />
    </div>
  );
};
