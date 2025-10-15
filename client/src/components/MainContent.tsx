"use client";
import { ShoppingCart, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { CartItem, MainContentProps, Product } from "@/interfaces/product";
import { ProductCard } from "@/components/ProductCard";
import { addToCart } from "@/lib/cartApi";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
export default function MainContent({
  featuredProducts,
  fetchCategories,
}: MainContentProps) {
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [item, setitem] = useState<CartItem | null>(null);
  const router = useRouter();
  // Function to get display price
  const getDisplayPrice = (product: Product): number => {
    if (product.variants && product.variants.length > 0) {
      return Math.min(...product.variants.map((v) => v.price));
    }
    return product.price || 0;
  };

  // Function to format price to VND
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };
  const handleAddToCart = async (variantId: string, quantity: number) => {
    if (!user?.id) {
      router.push("/auth");
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

  const handleViewDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };
  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center mb-12 p-8 bg-gradient-to-r from-blue-400 to-purple-300 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">
          Khám phá sản phẩm chất lượng
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Hàng ngàn sản phẩm từ các thương hiệu uy tín với giá tốt nhất
        </p>
        <div className="flex gap-4 justify-center">
          <Button className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Tìm kiếm ngay
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Xem giỏ hàng
          </Button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mb-12">
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Danh mục sản phẩm
            </h2>
            <p className="text-gray-600">
              Khám phá các danh mục sản phẩm đa dạng của chúng tôi
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {fetchCategories.map((category: any, index: number) => {
              const gradients = [
                'from-blue-500 to-purple-600',
                'from-green-500 to-teal-600', 
                'from-pink-500 to-rose-600',
                'from-orange-500 to-red-600',
                'from-indigo-500 to-blue-600',
                'from-purple-500 to-pink-600',
                'from-teal-500 to-green-600',
                'from-yellow-500 to-orange-600'
              ];
              const gradient = gradients[index % gradients.length];
              
              return (
                <Card
                  key={category.id}
                  className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden border-0 bg-white"
                >
                  {/* Header với gradient */}
                  <div className={`h-24 bg-gradient-to-r ${gradient} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/20 rounded-full"></div>
                    <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white/10 rounded-full"></div>
                    <div className="relative z-10 p-4 h-full flex items-center">
                      <div className="w-8 h-8 bg-white/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <div className="w-4 h-4 bg-white rounded-sm"></div>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>

                    {/* Nếu có children */}
                    {category.children && category.children.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                          Danh mục con ({category.children.length})
                        </div>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {category.children.slice(0, 4).map((child: any) => (
                            <div
                              key={child.id}
                              className="flex items-center text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-all duration-200 p-2 rounded-md group"
                            >
                              <div className="w-1.5 h-1.5 bg-gray-400 group-hover:bg-blue-500 rounded-full mr-2 transition-colors"></div>
                              <span className="truncate flex-1">{child.name}</span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          ))}
                          {category.children.length > 4 && (
                            <div className="text-xs text-gray-400 text-center py-1 font-medium">
                              +{category.children.length - 4} danh mục khác
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        Không có danh mục con
                      </div>
                    )}

                    {/* Số lượng sản phẩm (mock) */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Sản phẩm</span>
                        <span className="font-semibold text-blue-600">
                          {Math.floor(Math.random() * 500) + 50}+
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </Card>
              );
            })}
          </div>

          {/* View All Button */}
          <div className="text-center mt-8">
            <Button variant="outline" className="px-8 py-2 hover:bg-blue-50 hover:border-blue-300">
              Xem tất cả danh mục
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Button>
          </div>
        </section>
      </div>
      {/* Featured Products */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Sản phẩm nổi bật
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-fr">
          {featuredProducts.map((product: any) => (
            <div key={product.id} className="h-full">
              <ProductCard
                product={product}
                onAddToCart={handleAddToCart}
                onViewDetails={handleViewDetails}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
