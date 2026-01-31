"use client";
import { CartList } from "@/components/cart/CartList";
import { useAuthStore } from "@/store/authStore";
import { useCart } from "@/hooks/useCart";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { cart, loading, error } = useCart();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not authenticated (after mount)
  useEffect(() => {
    if (mounted && !user) {
      router.push("/auth");
    }
  }, [mounted, user, router]);

  // Show loading during hydration or when redirecting
  if (!mounted || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <div className="flex items-center gap-2 dark:text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{!mounted ? "Đang khởi tạo..." : "Đang chuyển hướng..."}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl text-center font-bold text-gray-900 dark:text-white mb-8">Giỏ hàng của tôi</h1>
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 dark:text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Đang tải giỏ hàng...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-950">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!cart) {
    // Create empty cart structure for display
    const emptyCart = {
      id: "",
      userId: user?.id || "",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: []
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Giỏ hàng của tôi</h1>
          <CartList cart={emptyCart as any} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Giỏ hàng của tôi</h1>
        <CartList cart={cart} />
      </div>
    </div>
  );
}