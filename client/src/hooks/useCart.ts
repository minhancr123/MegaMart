import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { fetchCartItem } from '@/lib/cartApi';
import { Cart } from '@/interfaces/product';

export const useCart = () => {
  const { user } = useAuthStore();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCart = async (userId?: string) => {
    if (!userId && !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchCartItem(userId || user!.id) as any;
      setCart(data);
    } catch (err: any) {
      console.error("Failed to load cart:", err);
      setError(err.message || "Không thể tải giỏ hàng");
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = () => {
    if (user?.id) {
      loadCart(user.id);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadCart(user.id);
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    cart,
    loading,
    error,
    refreshCart,
    loadCart
  };
};