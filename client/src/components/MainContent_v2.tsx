"use client";
import { ShoppingCart, Heart, Search, ChevronLeft, ChevronRight, Truck, ShieldCheck, Clock, CreditCard, Zap, ArrowRight, Newspaper, Calendar, Star, TrendingUp, Award, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { motion, useScroll, useTransform } from "framer-motion";
import HeroBanner from "./home/HeroBanner";
import RecentlyViewed from "./home/RecentlyViewed";

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
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

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

  const displayedProducts = useMemo(() => {
    if (selectedCategorySlug === 'all') return featuredProducts;
    return featuredProducts.filter((product: any) => 
      product.category?.slug === selectedCategorySlug
    );
  }, [featuredProducts, selectedCategorySlug]);

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
    <div className="w-full max-w-full overflow-x-hidden relative">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-gradient-to-br from-cyan-400/20 via-blue-400/20 to-indigo-400/20 dark:from-cyan-600/10 dark:via-blue-600/10 dark:to-indigo-600/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-pink-400/20 via-rose-400/20 to-red-400/20 dark:from-pink-600/10 dark:via-rose-600/10 dark:to-red-600/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 space-y-12 sm:space-y-16 pb-12 sm:pb-16">
        
        {/* Hero Banner Section */}
        <motion.div 
          className="mt-4 sm:mt-6"
          style={{ opacity, scale }}
        >
          <HeroBanner banners={banners} />
        </motion.div>

        {/* Features Section - Glassmorphism Style */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {[
            { icon: Truck, title: "Miễn phí vận chuyển", desc: "Cho đơn hàng từ 500k", gradient: "from-blue-500 to-cyan-500" },
            { icon: ShieldCheck, title: "Bảo hành chính hãng", desc: "Cam kết 100% chính hãng", gradient: "from-purple-500 to-pink-500" },
            { icon: Clock, title: "Hỗ trợ 24/7", desc: "Giải đáp mọi thắc mắc", gradient: "from-orange-500 to-red-500" },
            { icon: CreditCard, title: "Thanh toán an toàn", desc: "Đa dạng phương thức", gradient: "from-green-500 to-emerald-500" },
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"
                style={{
                  background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                }}
              />
              <div className="relative flex items-center gap-4 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-2xl transition-all duration-300">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.section>

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
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-600 to-pink-600 dark:from-red-700 dark:via-orange-700 dark:to-pink-700"></div>
              
              {/* Animated Overlay */}
              <div className="absolute inset-0">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl animate-pulse animation-delay-2000"></div>
              </div>

              <div className="relative z-10 p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                  <motion.div 
                    className="flex items-center gap-4"
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg">
                      <Zap className="w-8 h-8 text-yellow-300 animate-pulse" />
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
                  </motion.div>

                  {!isUpcoming && (
                    <motion.div 
                      className="flex gap-3"
                      initial={{ x: 20, opacity: 0 }}
                      whileInView={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
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
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayFlashSale.items?.slice(0, 4).map((item: any, idx: number) => {
                    const product = item.variant?.product;
                    const originalPrice = item.variant?.price || 0;
                    const salePrice = item.salePrice;
                    const discount = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
                    const soldPercentage = item.quantity > 0 ? Math.min((item.soldCount / item.quantity) * 100, 100) : 0;
                    const imageUrl = getPrimaryImageUrl(product?.images) || '';

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                        whileHover={{ y: -12, scale: 1.03 }}
                        className={`group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ${isUpcoming ? 'opacity-75' : 'cursor-pointer'}`}
                        onClick={() => !isUpcoming && handleViewDetails(product?.id)}
                      >
                        {/* Image Container */}
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={product?.name} 
                              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" 
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
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                      </motion.div>
                    );
                  })}
                </div>

                {!isUpcoming && (
                  <motion.div 
                    className="mt-8 text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button 
                      size="lg"
                      className="bg-white text-red-600 hover:bg-red-50 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-gray-800 font-bold px-8 py-6 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
                      onClick={() => router.push('/products')}
                    >
                      Xem tất cả Flash Sale
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.section>
          );
        })()}

        {/* Categories Quick Access - Modern Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <motion.h2 
              className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Danh mục nổi bật
            </motion.h2>
            <motion.p 
              className="text-gray-600 dark:text-gray-400 text-lg"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Khám phá bộ sưu tập đa dạng của chúng tôi
            </motion.p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {[
              { slug: 'all', name: 'Tất cả', icon: Star },
              ...(fetchCategories?.slice(0, 6) || [])
            ].map((category, idx) => (
              <motion.button
                key={category.slug}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategorySlug(category.slug)}
                className={`
                  px-6 py-3 rounded-full font-semibold text-sm md:text-base
                  transition-all duration-300 shadow-lg hover:shadow-xl
                  ${selectedCategorySlug === category.slug
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                {category.name}
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Featured Products - Premium Grid */}
        <motion.section 
          className="space-y-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
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
              className="hidden md:flex items-center gap-2 rounded-full border-2 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-300"
            >
              Xem tất cả
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedProducts.slice(0, 8).map((product: any, idx: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDetails}
                />
              </motion.div>
            ))}
          </div>

          <div className="text-center md:hidden">
            <Button 
              size="lg"
              onClick={() => router.push('/products')}
              className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Xem tất cả sản phẩm
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.section>

        {/* Recently Viewed */}
        <RecentlyViewed />

        {/* Blog Posts - Modern Cards */}
        {posts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <motion.h2 
                className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Tin tức & Khuyến mãi
              </motion.h2>
              <motion.p 
                className="text-gray-600 dark:text-gray-400 text-lg"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Cập nhật những thông tin mới nhất
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  whileHover={{ y: -8 }}
                >
                  <Link href={`/blog/${post.slug}`}>
                    <Card className="group overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-900">
                      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                        {post.thumbnail ? (
                          <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
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
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 line-clamp-2 text-sm">
                          {stripHtml(post.content)}
                        </p>
                        <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold text-sm group-hover:gap-2 transition-all">
                          Đọc thêm
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Stats Section - New */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="text-center mb-12">
              <motion.h2 
                className="text-3xl md:text-4xl font-black text-white mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Tại sao chọn MegaMart?
              </motion.h2>
              <motion.p 
                className="text-white/90 text-lg"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Hàng triệu khách hàng tin tưởng
              </motion.p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { icon: Users, value: '1M+', label: 'Khách hàng' },
                { icon: Star, value: '50K+', label: 'Sản phẩm' },
                { icon: Award, value: '4.8/5', label: 'Đánh giá' },
                { icon: TrendingUp, value: '99%', label: 'Hài lòng' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-md rounded-2xl mb-4">
                    <stat.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-white mb-2">{stat.value}</div>
                  <div className="text-white/80 text-sm md:text-base font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

      </div>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        
        .animate-blob {
          animation: blob 10s infinite ease-in-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
