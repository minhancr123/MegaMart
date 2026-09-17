"use client";
import { ArrowRight, Calendar, CookingPot, Laptop, Newspaper, Package, Refrigerator, Smartphone, Tv, WashingMachine, Wind, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MainContentProps } from "@/interfaces/product";
import { addToCart } from "@/lib/cartApi";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { toast } from "sonner";
import { ProductCard } from "./product/ProductCard";
import { bannerApi, Banner, flashSaleApi, FlashSale } from "@/lib/marketingApi";
import { getPrimaryImageUrl } from "@/lib/imageUtils";
import { fetchPosts } from "@/lib/postsApi";
import HeroBanner from "./home/HeroBanner";
import RecentlyViewed from "./home/RecentlyViewed";
import ForYouSection from "./home/ForYouSection";

const featuredCategoryLinks = [
  { href: "/category/tivi", name: "Tivi", icon: Tv },
  { href: "/category/may-lanh", name: "Máy lạnh", icon: Wind },
  { href: "/category/tu-lanh", name: "Tủ lạnh", icon: Refrigerator },
  { href: "/category/may-giat", name: "Máy giặt", icon: WashingMachine },
  { href: "/category/dien-thoai", name: "Điện thoại", icon: Smartphone },
  { href: "/category/laptop", name: "Laptop", icon: Laptop },
  { href: "/category/noi-chien-noi-nuong", name: "Gia dụng", icon: CookingPot },
];

const featuredBrands = ["SAMSUNG", "LG", "DAIKIN", "PANASONIC", "SONY", "TOSHIBA"];

export default function MainContent({
  featuredProducts,
}: MainContentProps) {
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Helper function to strip HTML tags
  const stripHtml = (html: string | undefined | null): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  const handleAddToCart = async (variantId: string, quantity: number) => {
    if (!user?.id) {
      router.push("/auth");
      return;
    }

    try {
      const response: any = await addToCart(user.id, variantId, quantity);
      if (response?.success) {
        toast.success(response?.message || "Đã thêm sản phẩm vào giỏ hàng");
        
        const product = featuredProducts.find(p => p.variants?.some(v => v.id === variantId));
        if (product) {
          const variant = product.variants?.find(v => v.id === variantId);
          if (variant) {
            addItem({
              id: parseInt(variantId),
              name: product.name,
              price: variant.price,
              quantity: quantity,
              imageUrl: product.images?.[0]?.url || ''
            });
          }
        }
      } else {
        toast.error(response?.message || "Có lỗi xảy ra khi thêm sản phẩm");
      }
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      toast.error("Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng");
    }
  };

  const handleViewDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Fetch active banners
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await bannerApi.getActive();
        const bannersData = Array.isArray(response) ? response : (response.data || []);
        setBanners(bannersData);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
      }
    };
    fetchBanners();
  }, []);

  // Fetch active flash sales
  useEffect(() => {
    const fetchFlashSales = async () => {
      try {
        const response = await flashSaleApi.getActive();
        const flashSalesData = Array.isArray(response) ? response : (response.data || []);
        setFlashSales(flashSalesData);
      } catch (error) {
        console.error('Failed to fetch flash sales:', error);
      }
    };
    fetchFlashSales();
  }, []);

  // Fetch posts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetchPosts({
          limit: 3,
          status: "PUBLISHED",
          sort: "createdAt:desc"
        });
        const postsData = Array.isArray(response) ? response : (response.data || []);
        setPosts(postsData);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      }
    };
    loadPosts();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (flashSales.length === 0) return;

    const activeFlashSale = flashSales.find(fs => {
      const now = new Date();
      const start = new Date(fs.startTime);
      const end = new Date(fs.endTime);
      return now >= start && now <= end && fs.active;
    });

    if (!activeFlashSale) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const endTime = new Date(activeFlashSale.endTime).getTime();
      const distance = endTime - now;

      if (distance > 0) {
        setCountdown({
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      } else {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [flashSales]);

  return (
    <div className="relative w-full max-w-full overflow-x-hidden bg-[#f7f8fa]">
      <div className="mm-container space-y-12 pb-12 pt-6 sm:space-y-16 sm:pb-16 sm:pt-8">
        
        {/* Hero Banner Section */}
        <div>
          <HeroBanner banners={banners} />
        </div>

        {/* Flash Sale Section - Premium Style */}
        {(() => {
          const now = new Date();
          const activeFlashSale = flashSales.find(fs => {
            const start = new Date(fs.startTime);
            const end = new Date(fs.endTime);
            return now >= start && now <= end && fs.active;
          });

          const upcomingFlashSale = flashSales
            .filter(fs => new Date(fs.startTime) > now && fs.active)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

          const displayFlashSale = activeFlashSale || upcomingFlashSale;
          const isUpcoming = !activeFlashSale && upcomingFlashSale;

          if (!displayFlashSale) return null;

          return (
            <section className="relative overflow-hidden rounded-3xl shadow-xl transition-shadow duration-300 hover:shadow-2xl">
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#8e2800] via-[#d83f00] to-[#ff6b00]"></div>
              
              {/* Animated Overlay */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
              </div>

              <div className="relative z-10 p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg">
                      <Zap className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wider text-white">
                        {isUpcoming ? 'Sắp diễn ra' : ''}
                        <span className="text-yellow-300">{isUpcoming ? '' : 'Flash'}</span>
                        {isUpcoming ? '' : ' Sale'}
                      </h2>
                      <p className="text-red-100 text-sm md:text-base mt-1">
                        {isUpcoming
                          ? `Bắt đầu: ${new Date(displayFlashSale.startTime).toLocaleString('vi-VN')}`
                          : 'Giá sốc, số lượng có hạn - Nhanh tay kẻo lỡ!'
                        }
                      </p>
                    </div>
                  </div>

                  {!isUpcoming && (
                    <div className="flex gap-3">
                      {[
                        { value: countdown.hours.toString().padStart(2, '0'), label: 'Giờ' },
                        { value: countdown.minutes.toString().padStart(2, '0'), label: 'Phút' },
                        { value: countdown.seconds.toString().padStart(2, '0'), label: 'Giây' }
                      ].map((time, i) => (
                        <div key={i} className="bg-white/95 backdrop-blur-sm text-red-600 rounded-2xl p-4 min-w-[70px] shadow-xl">
                          <div className="text-3xl font-black leading-none">{time.value}</div>
                          <div className="text-xs font-bold uppercase mt-2 text-gray-600">{time.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayFlashSale.items?.slice(0, 4).map((item: any) => {
                    const product = item.variant?.product;
                    const originalPrice = item.variant?.price || 0;
                    const salePrice = item.salePrice;
                    const discount = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
                    const soldPercentage = item.quantity > 0 ? Math.min((item.soldCount / item.quantity) * 100, 100) : 0;
                    const imageUrl = getPrimaryImageUrl(product?.images) || '';

                    return (
                      <div
                        key={item.id}
                        className={`group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-900 ${isUpcoming ? 'opacity-75' : 'cursor-pointer'}`}
                        onClick={() => !isUpcoming && handleViewDetails(product?.id)}
                      >
                        {/* Image Container */}
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={product?.name} 
                              className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Package className="w-16 h-16" />
                            </div>
                          )}
                          
                          {/* Badges */}
                          {discount > 0 && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-600 to-pink-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
                              -{discount}%
                            </div>
                          )}
                          {isUpcoming && (
                            <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                              Sắp diễn ra
                            </div>
                          )}
                          
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-[#c53b00] transition-colors">
                            {product?.name || 'Sản phẩm'}
                          </h3>
                          
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-red-600 dark:text-red-500">
                                {new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND',
                                  maximumFractionDigits: 0
                                }).format(salePrice)}
                              </span>
                            </div>
                            
                            {originalPrice > salePrice && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                {new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND',
                                  maximumFractionDigits: 0
                                }).format(originalPrice)}
                              </div>
                            )}

                            {/* Progress Bar */}
                            {!isUpcoming && item.quantity > 0 && (
                              <div className="space-y-1">
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-red-600 to-orange-600 rounded-full transition-all duration-500"
                                    style={{ width: `${soldPercentage}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                  <span>Đã bán {item.soldCount}/{item.quantity}</span>
                                  <span className="font-bold">{soldPercentage.toFixed(0)}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isUpcoming && (
                  <div className="mt-8 text-center">
                    <Button 
                      size="lg"
                      className="bg-white text-red-600 hover:bg-red-50 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-gray-800 font-bold px-8 py-6 rounded-full shadow-xl hover:shadow-2xl transition-shadow duration-300"
                      onClick={() => router.push('/products')}
                    >
                      Xem tất cả Flash Sale
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* Category shortcuts from the canonical Stitch storefront. */}
        <section className="space-y-7">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
              Danh mục nổi bật
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Chọn nhanh ngành hàng bạn đang quan tâm
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {featuredCategoryLinks.map((category) => (
              <div key={category.href}>
                <Link href={category.href} className="group flex min-h-32 flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white px-3 py-5 text-center shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-orange-200 hover:shadow-lg">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-[#d94300] transition-colors group-hover:bg-[#ff4d00] group-hover:text-white">
                    <category.icon className="h-6 w-6" />
                  </span>
                  <span className="mt-3 text-sm font-extrabold text-zinc-800">{category.name}</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Products - Premium Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
                Sản phẩm nổi bật
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Những sản phẩm được yêu thích nhất
              </p>
            </div>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => router.push('/products')}
              className="hidden md:flex items-center gap-2 rounded-full border-2 hover:bg-gradient-to-r hover:from-[#fc4c00] hover:to-[#af3200] hover:text-white hover:border-transparent transition-all duration-300"
            >
              Xem tất cả
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.slice(0, 8).map((product: any) => (
              <div key={product.id}>
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDetails}
                />
              </div>
            ))}
          </div>

          <div className="text-center md:hidden">
            <Button 
              size="lg"
              onClick={() => router.push('/products')}
              className="w-full max-w-md bg-[#ff4d00] hover:bg-[#d94100] text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Xem tất cả sản phẩm
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-6 shadow-sm" aria-label="Thương hiệu nổi bật">
          <p className="mb-5 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Thương hiệu nổi bật</p>
          <div className="grid grid-cols-2 items-center gap-4 text-center sm:grid-cols-3 lg:grid-cols-6">
            {featuredBrands.map((brand) => (
              <span key={brand} className="rounded-xl bg-zinc-50 px-4 py-3 text-sm font-black tracking-wide text-zinc-600">{brand}</span>
            ))}
          </div>
        </section>

        {/* Recently Viewed */}
        <RecentlyViewed />

        {/* Dành riêng cho bạn — chỉ hiện khi đã đăng nhập (tự ẩn nếu không).
            key theo user.id: đổi tài khoản remount sạch state, không bao giờ
            lộ gợi ý của user cũ sang user mới (tránh setState trong effect). */}
        <ForYouSection key={user?.id ?? "guest"} />

        {/* Blog Posts - Modern Cards */}
        {posts.length > 0 && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                Tin tức & Khuyến mãi
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Cập nhật những thông tin mới nhất
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div key={post.id}>
                  <Link href={`/news/${post.id}`}>
                    <Card className="group overflow-hidden border-0 bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl dark:bg-gray-900">
                      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                        {post.thumbnail ? (
                          <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Newspaper className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <CardContent className="p-6 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(post.publishedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#c53b00] transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2 text-sm">
                          {stripHtml(post.content)}
                        </p>
                        <div className="flex items-center text-[#c53b00] font-semibold text-sm group-hover:gap-2 transition-all">
                          Đọc thêm
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

    </div>
  );
}
