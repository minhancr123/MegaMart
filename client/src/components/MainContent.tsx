"use client";
import { ShoppingCart, Heart, Search, ChevronLeft, ChevronRight, Truck, ShieldCheck, Clock, CreditCard, Zap, ArrowRight, Newspaper, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CartItem, MainContentProps, Product } from "@/interfaces/product";
import { addToCart } from "@/lib/cartApi";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { toast } from "sonner";
import { ProductCard } from "./product/ProductCard";

export default function MainContent({
  featuredProducts,
  fetchCategories,
}: MainContentProps) {
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const router = useRouter();

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

  const banners = [
    {
      id: 1,
      title: "Siêu Sale Hè 2025",
      subtitle: "Giảm giá cực sốc lên đến 50%",
      description: "Săn ngay hàng ngàn deal hot từ các thương hiệu hàng đầu.",
      imageUrl: "/images/banner-1.jpg", // Placeholder
      color: "from-blue-600 to-purple-600"
    },
    {
      id: 2,
      title: "iPhone 15 Series",
      subtitle: "Sẵn hàng đủ màu",
      description: "Titan tự nhiên, bền bỉ. Trả góp 0% lãi suất.",
      imageUrl: "/images/banner-2.jpg",
      color: "from-gray-700 to-gray-900"
    },
    {
      id: 3,
      title: "Laptop Gaming",
      subtitle: "Chiến game đỉnh cao",
      description: "Cấu hình mạnh mẽ, tản nhiệt cực tốt. Tặng chuột gaming.",
      imageUrl: "/images/banner-3.jpg",
      color: "from-red-600 to-orange-600"
    }
  ]

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => {
    setIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 space-y-12 pb-12">
      {/* Hero Section with Side Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Main Slider (2/3) */}
        <div className="lg:col-span-2 relative h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-lg group">
          {banners.map((banner, i) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${banner.color}`}></div>
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

              <div className="absolute inset-0 flex items-center px-8 md:px-16">
                <div className={`space-y-4 text-white z-10 max-w-lg transition-all duration-700 ${i === index ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
                  <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                    {banner.subtitle}
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                    {banner.title}
                  </h2>
                  <p className="text-base md:text-lg text-blue-50">
                    {banner.description}
                  </p>
                  <Button className="bg-white text-gray-900 hover:bg-blue-50 font-semibold rounded-full mt-2">
                    Mua ngay
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Controls */}
          <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={prev}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={next}>
            <ChevronRight className="w-6 h-6" />
          </Button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} className={`w-2 h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "bg-white/50"}`} onClick={() => setIndex(i)} />
            ))}
          </div>
        </div>

        {/* Side Banners (1/3) */}
        <div className="hidden lg:flex flex-col gap-4 h-[400px]">
          <div className="flex-1 rounded-xl overflow-hidden relative bg-gradient-to-r from-pink-500 to-rose-500 p-6 text-white flex flex-col justify-center shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="text-xl font-bold mb-1">Samsung Galaxy S24</h3>
            <p className="text-sm opacity-90 mb-3">Quyền năng AI</p>
            <span className="text-yellow-300 font-bold text-lg">Giảm 5.000.000đ</span>
            <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white flex flex-col justify-center shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="text-xl font-bold mb-1">MacBook Air M3</h3>
            <p className="text-sm opacity-90 mb-3">Mỏng nhẹ, mạnh mẽ</p>
            <span className="text-yellow-300 font-bold text-lg">Chỉ từ 24.990.000đ</span>
            <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden relative bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex flex-col justify-center shadow-md hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="text-xl font-bold mb-1">Phụ kiện Apple</h3>
            <p className="text-sm opacity-90 mb-3">Giảm đến 50%</p>
            <span className="text-yellow-300 font-bold text-lg">Mua ngay</span>
            <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Truck, title: "Miễn phí vận chuyển", desc: "Cho đơn hàng từ 500k" },
          { icon: ShieldCheck, title: "Bảo hành chính hãng", desc: "Cam kết 100% chính hãng" },
          { icon: Clock, title: "Hỗ trợ 24/7", desc: "Giải đáp mọi thắc mắc" },
          { icon: CreditCard, title: "Thanh toán an toàn", desc: "Đa dạng phương thức" },
        ].map((feature, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <feature.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Flash Sale Section */}
      <section className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Zap className="w-6 h-6 animate-pulse text-yellow-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold uppercase italic tracking-wider">F<span className="text-yellow-300">lash</span> Sale</h2>
                <p className="text-red-100 text-sm">Giá sốc, số lượng có hạn</p>
              </div>
            </div>
            <div className="flex gap-2 text-center">
              {['02', '15', '45'].map((time, i) => (
                <div key={i} className="bg-white text-red-600 rounded-md p-2 min-w-[50px]">
                  <div className="text-xl font-bold leading-none">{time}</div>
                  <div className="text-[10px] font-medium uppercase mt-1">{['Giờ', 'Phút', 'Giây'][i]}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.slice(0, 4).map((product: any) => {
              // Lấy giá từ variant đầu tiên hoặc giá sản phẩm
              const basePrice = product.variants?.[0]?.price || product.price || 0;
              const salePrice = basePrice * 0.7;
              
              return (
                <div key={product.id} className="bg-white rounded-lg p-3 text-gray-900 shadow-md transform hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => handleViewDetails(product.id)}>
                  <div className="relative aspect-square mb-3 bg-gray-100 rounded-md overflow-hidden group">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-red-600">-30%</Badge>
                  </div>
                  <h3 className="font-medium line-clamp-2 mb-1 text-sm h-10 hover:text-blue-600 transition-colors break-words" style={{ wordBreak: 'break-word' }}>{product.name}</h3>
                  <div className="flex flex-col gap-1">
                    <div className="text-red-600 font-bold text-base break-all">
                      {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND',
                        maximumFractionDigits: 0 
                      }).format(salePrice)}
                    </div>
                    <div className="text-gray-400 text-xs line-through break-all">
                      {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND',
                        maximumFractionDigits: 0 
                      }).format(basePrice)}
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-red-500 h-1.5 rounded-full" 
                      style={{ 
                        width: `${product.soldCount && product.variants?.[0]?.stock 
                          ? Math.min((product.soldCount / (product.soldCount + product.variants[0].stock)) * 100, 100) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                    <span>Đã bán {product.soldCount || 0}</span>
                    <span className="text-red-500 font-medium">Đang bán chạy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase">Danh mục nổi bật</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {fetchCategories.map((category: any, index: number) => (
            <Link
              key={category.id}
              href={`/category/${category.slug || category.id}`}
              className="group flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover:bg-blue-50 transition-colors">
                <span className="text-xl font-bold text-gray-600 group-hover:text-blue-600">{category.name.charAt(0)}</span>
              </div>
              <h3 className="font-medium text-gray-900 text-center text-sm group-hover:text-blue-600 transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-900 uppercase">Gợi ý cho bạn</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-full">Điện thoại</Button>
            <Button variant="outline" size="sm" className="rounded-full">Laptop</Button>
            <Button variant="outline" size="sm" className="rounded-full">Phụ kiện</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product: any) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button size="lg" variant="outline" className="px-12 py-6 text-base border-gray-300 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-600 transition-all rounded-lg">
            Xem thêm 248 sản phẩm
          </Button>
        </div>
      </section>

      {/* Tech News Section */}
      <section className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 uppercase flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-blue-600" />
            Tin công nghệ
          </h2>
          <Link href="/news" className="text-blue-600 hover:underline text-sm font-medium">Xem tất cả</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Đánh giá chi tiết iPhone 15 Pro Max: Titan bền bỉ, Camera đỉnh cao",
              image: "https://cdn.tgdd.vn/Files/2023/09/22/1548689/iphone-15-pro-max-1-220923-114838-800-resize.jpg",
              date: "14/01/2026",
              desc: "iPhone 15 Pro Max mang đến những nâng cấp đáng giá về thiết kế và hiệu năng..."
            },
            {
              title: "Top 5 Laptop Gaming đáng mua nhất đầu năm 2026",
              image: "https://cdn.tgdd.vn/Files/2024/01/10/1563214/laptop-gaming-thumb-100124-153812-800-resize.jpg",
              date: "12/01/2026",
              desc: "Danh sách những mẫu laptop gaming hiệu năng cao, tản nhiệt tốt..."
            },
            {
              title: "Samsung Galaxy S24 Ultra ra mắt: AI là tâm điểm",
              image: "https://cdn.tgdd.vn/Files/2024/01/18/1564567/samsung-galaxy-s24-ultra-thumb-180124-102345-800-resize.jpg",
              date: "10/01/2026",
              desc: "Samsung chính thức giới thiệu dòng Galaxy S24 với nhiều tính năng AI đột phá..."
            }
          ].map((news, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-100">
                {/* Placeholder image if real URL fails */}
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                  IMG
                </div>
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                {news.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Calendar className="w-3 h-3" />
                {news.date}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{news.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
