"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Product } from "@/interfaces/product";
import { ProductVariants } from "@/components/ProductVariants";
import { fetchProductById } from "@/lib/productApi";
import { addToCart } from "@/lib/cartApi";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData = await fetchProductById(params.id as string);
        setProduct(productData);
      } catch (err) {
        setError("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const handleAddToCart = async (variantId: string, quantity: number) => {
    if (!user?.id) {
      toast.error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }

    try {
      const response = await addToCart(user.id, variantId, quantity);
      if (response.success) {
        toast.success(response.message || "Đã thêm sản phẩm vào giỏ hàng");
      } else {
        toast.error(response.message || "Có lỗi xảy ra khi thêm sản phẩm");
      }
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      toast.error("Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Đang tải thông tin sản phẩm...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 mb-4">{error || "Không tìm thấy sản phẩm"}</p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay về trang chủ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        </Link>
      </div>

      {/* Product Variants */}
      <ProductVariants 
        product={product} 
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}