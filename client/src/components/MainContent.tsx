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
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { toast } from "sonner";
import { ProductCard } from "./product/ProductCard";
import { bannerApi, Banner, flashSaleApi, FlashSale } from "@/lib/marketingApi";
import { getPrimaryImageUrl } from "@/lib/imageUtils";
import { fetchPosts } from "@/lib/postsApi";
import { motion } from "framer-motion";

export default function MainContent({
  featuredProducts,
  fetchCategories,
}: MainContentProps) {
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [index, setIndex] = useState(0);
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

  // Memoize filtered products to prevent infinite re-render
  const displayedProducts = useMemo(() => {
    if (selectedCategorySlug === 'all') return featuredProducts;
    return featuredProducts.filter((product: any) => 
      product.category?.slug === selectedCategorySlug
    );
  }, [featuredProducts, selectedCategorySlug]);

  // Fetch active banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await bannerApi.getActive();
        const bannersData = Array.isArray(response) ? response : (response.data || []);
        console.log('bannersData', bannersData);
        setBanners(bannersData);
      } catch (error) {
        console.error('Failed to fetch banners:', error);
        // Keep empty array if fetch fails
      }
    };
    fetchBanners();
  }, []);

  // Fetch active flash sales from API
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

  // Fetch published posts from API
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const response = await fetchPosts({
          limit: 3,
          status: "PUBLISHED",
          sort: "createdAt:desc"
        });
        const postsData = Array.isArray(response)
          ? response
          : (response.data || []);
        setPosts(postsData);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
      }
    };
    loadPosts();
  }, []);

  // Countdown timer for active flash sale
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

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const prev = () => {
    setIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 space-y-8 sm:space-y-12 pb-8 sm:pb-12">
      {/* Hero Section with Side Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 sm:mt-6">
        {/* Main Slider (2/3) */}
        <div className="lg:col-span-2 relative h-[200px] sm:h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-lg group">
          {banners.length > 0 ? (
            <>
              {banners.map((banner, i) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${i === index ? "opacity-100" : "opacity-0"}`}
                >
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30"></div>

                  <div className="absolute inset-0 flex items-center px-4 sm:px-8 md:px-16">
                    <div className={`space-y-2 sm:space-y-4 text-white z-10 max-w-lg transition-all duration-700 ${i === index ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
                      {banner.description && (
                        <div className="inline-block px-2 sm:px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                          {banner.description}
                        </div>
                      )}
                      <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                        {banner.title}
                      </h2>
                      {banner.linkUrl && (
                        <Link href={banner.linkUrl}>
                          <Button className="bg-white text-gray-900 hover:bg-blue-50 font-semibold rounded-full mt-2 text-xs sm:text-sm">
                            Mua ngay
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Controls */}
              {banners.length > 1 && (
                <>
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
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <div className="text-center text-white p-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Chào mừng đến MegaMart</h2>
                <p className="text-sm sm:text-base opacity-90">Khám phá hàng ngàn sản phẩm chất lượng</p>
              </div>
            </div>
          )}
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
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {[
          { icon: Truck, title: "Miễn phí vận chuyển", desc: "Cho đơn hàng từ 500k" },
          { icon: ShieldCheck, title: "Bảo hành chính hãng", desc: "Cam kết 100% chính hãng" },
          { icon: Clock, title: "Hỗ trợ 24/7", desc: "Giải đáp mọi thắc mắc" },
          { icon: CreditCard, title: "Thanh toán an toàn", desc: "Đa dạng phương thức" },
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
            }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-blue-950 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Flash Sale Section */}
      {(() => {
        // Tìm Flash Sale đang hoạt động
        const now = new Date();
        const activeFlashSale = flashSales.find(fs => {
          const start = new Date(fs.startTime);
          const end = new Date(fs.endTime);
          return now >= start && now <= end && fs.active;
        });

        // Tìm Flash Sale sắp diễn ra
        const upcomingFlashSale = flashSales
          .filter(fs => new Date(fs.startTime) > now && fs.active)
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

        const displayFlashSale = activeFlashSale || upcomingFlashSale;
        const isUpcoming = !activeFlashSale && upcomingFlashSale;

        if (!displayFlashSale) return null;

        return (
          <section className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Zap className="w-6 h-6 animate-pulse text-yellow-300" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold uppercase italic tracking-wider">
                      {isUpcoming ? 'Sắp diễn ra' : 'F'}
                      <span className="text-yellow-300">{isUpcoming ? '' : 'lash'}</span>
                      {isUpcoming ? '' : ' Sale'}
                    </h2>
                    <p className="text-red-100 text-sm">
                      {isUpcoming
                        ? `Bắt đầu: ${new Date(displayFlashSale.startTime).toLocaleString('vi-VN')}`
                        : 'Giá sốc, số lượng có hạn'
                      }
                    </p>
                  </div>
                </div>
                {!isUpcoming && (
                  <div className="flex gap-2 text-center">
                    {[
                      { value: countdown.hours.toString().padStart(2, '0'), label: 'Giờ' },
                      { value: countdown.minutes.toString().padStart(2, '0'), label: 'Phút' },
                      { value: countdown.seconds.toString().padStart(2, '0'), label: 'Giây' }
                    ].map((time, i) => (
                      <div key={i} className="bg-white text-red-600 rounded-md p-2 min-w-[50px]">
                        <div className="text-xl font-bold leading-none">{time.value}</div>
                        <div className="text-[10px] font-medium uppercase mt-1">{time.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {displayFlashSale.items?.slice(0, 4).map((item: any) => {
                  const product = item.variant?.product;
                  const originalPrice = item.variant?.price || 0;
                  const salePrice = item.salePrice;
                  const discount = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
                  const soldPercentage = item.quantity > 0 ? Math.min((item.soldCount / item.quantity) * 100, 100) : 0;

                  // Get primary image or fallback to first image
                  const imageUrl = getPrimaryImageUrl(product?.images) || '';

                  return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-gray-900 rounded-lg p-3 text-gray-900 dark:text-white shadow-md transform hover:-translate-y-1 transition-transform ${isUpcoming ? 'opacity-75' : 'cursor-pointer'}`}
                      onClick={() => !isUpcoming && handleViewDetails(product?.id)}
                    >
                      <div className="relative aspect-square mb-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden group">
                        {imageUrl ? (
                          <img src={imageUrl} alt={product?.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 dark:brightness-90" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                        )}
                        {discount > 0 && <Badge className="absolute top-2 left-2 bg-red-600">-{discount}%</Badge>}
                        {isUpcoming && <Badge className="absolute top-2 right-2 bg-yellow-500">Sắp diễn ra</Badge>}
                      </div>
                      <h3 className="font-medium line-clamp-2 mb-1 text-sm h-10 hover:text-blue-600 transition-colors break-words" style={{ wordBreak: 'break-word' }}>
                        {product?.name || 'Sản phẩm'}
                      </h3>
                      <div className="flex flex-col gap-1">
                        <div className="text-red-600 font-bold text-base break-all">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                            maximumFractionDigits: 0
                          }).format(salePrice)}
                        </div>
                        {originalPrice > salePrice && (
                          <div className="text-gray-400 text-xs line-through break-all">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                              maximumFractionDigits: 0
                            }).format(originalPrice)}
                          </div>
                        )}
                      </div>
                      {!isUpcoming && (
                        <>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-red-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${soldPercentage}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.soldCount > 0 ? `Đã bán: ${item.soldCount}/${item.quantity}` : 'Còn hàng'}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Categories Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase">Danh mục nổi bật</h2>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            visible: { transition: { staggerChildren: 0.06 } }
          }}
        >
          {fetchCategories.map((category: any, index: number) => (
            <motion.div
              key={category.id}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
              }}
            >
              <Link
                href={`/category/${category.slug || category.id}`}
                className="group flex flex-col items-center p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover:bg-blue-50 group-hover:scale-110 transition-all">
                  <span className="text-xl font-bold text-gray-600 group-hover:text-blue-600">{category.name.charAt(0)}</span>
                </div>
                <h3 className="font-medium text-gray-900 text-center text-sm group-hover:text-blue-600 transition-colors">
                  {category.name}
                </h3>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Featured Products */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-900 uppercase">Gợi ý cho bạn</h2>
          <div className="flex gap-2">
            <Button
              variant={selectedCategorySlug === 'all' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedCategorySlug('all')}
            >
              Tất cả
            </Button>
            <Button
              variant={selectedCategorySlug === 'dien-thoai' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedCategorySlug('dien-thoai')}
            >
              Điện thoại
            </Button>
            <Button
              variant={selectedCategorySlug === 'laptop' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedCategorySlug('laptop')}
            >
              Laptop
            </Button>
            <Button
              variant={selectedCategorySlug === 'phu-kien' ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedCategorySlug('phu-kien')}
            >
              Phụ kiện
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {displayedProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">Không có sản phẩm nào trong danh mục này</p>
            </div>
          ) : (
            displayedProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>

        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/products">
            <Button size="lg" variant="outline" className="px-12 py-6 text-base border-gray-300 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-600 transition-all rounded-lg hover:scale-105">
              Xem thêm sản phẩm
            </Button>
          </Link>
        </motion.div>
      </motion.section>

      {/* Tech News Section */}
      <section className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 uppercase flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-blue-600" />
            Tin công nghệ
          </h2>
          <Link href="/news" className="text-blue-600 hover:underline text-sm font-medium">Xem tất cả</Link>
        </div>

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {posts.map((post: any) => (
              <Link
                key={post.id}
                href={`/news/${post.id}`}
                className="group cursor-pointer"
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {post.thumbnail && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-2 right-2 bg-blue-600">
                        {post.type === 'NEWS' ? 'Tin tức' : 'Sự kiện'}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {stripHtml(post.summary) || stripHtml(post.content)?.substring(0, 100)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Chưa có tin tức nào. Hãy tạo bài viết trong trang Admin.</p>
            <Link href="/admin/posts/create" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              Tạo bài viết mới
            </Link>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
