"use client";

import { CartList } from "@/components/cart/CartList";
import { CheckoutStepper } from "@/components/cart/CheckoutStepper";
import { useAuthStore } from "@/store/authStore";
import { useCart } from "@/hooks/useCart";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const { cart, loading, error } = useCart();

  // Redirect if not authenticated (after mount)
  useEffect(() => {
    if (hasHydrated && !user) {
      router.push("/auth?callbackUrl=/cart");
    }
  }, [hasHydrated, user, router]);

  // Loading during hydration or when redirecting
  if (!hasHydrated || (!user && !error)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-[100px] md:pt-[120px]">
        <div className="flex items-center gap-2 text-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>{!hasHydrated ? "Đang khởi tạo..." : "Đang chuyển hướng..."}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] pt-[100px] md:pt-[120px] pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <CheckoutStepper currentStep={1} />
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground text-sm font-medium">Đang tải giỏ hàng của bạn...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-[100px] md:pt-[120px] pb-12">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-destructive font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline font-semibold text-sm"
          >
            Thử tải lại trang
          </button>
        </div>
      </div>
    );
  }

  // Fallback empty cart
  const effectiveCart = cart || {
    success: true,
    data: {
      id: "",
      userId: user?.id || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
    message: "Empty cart",
  };

  return (
    <div className="min-h-[75vh] pt-[90px] sm:pt-[110px] pb-16 bg-muted/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stepper chuẩn Stitch Bước 1/3 */}
        <CheckoutStepper currentStep={1} />

        <CartList cart={effectiveCart} />
      </div>
    </div>
  );
}
