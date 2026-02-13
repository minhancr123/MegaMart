'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Tag, Zap, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Banner } from '@/lib/marketingApi';

interface HeroBannerProps {
  banners: Banner[];
  onViewDetails?: (url: string) => void;
}

export default function HeroBanner({ banners, onViewDetails }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play slider
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  const prev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? banners.length - 1 : prevIndex - 1));
  };

  const next = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  return (
    <div className="relative w-full">
      {/* Main Banner Slider */}
      <div className="relative h-[280px] sm:h-[350px] md:h-[450px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl group">
        {banners.length > 0 ? (
          <>
            {banners.map((banner, i) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  i === currentIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Banner Image with Lazy Loading */}
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />

                {/* Professional Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent dark:from-black/80 dark:via-black/60"></div>

                {/* Content */}
                <div className="absolute inset-0 flex items-center">
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div
                      className={`max-w-xl sm:max-w-2xl space-y-3 sm:space-y-4 md:space-y-6 text-white transition-all duration-700 ${
                        i === currentIndex ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
                      }`}
                    >
                      {/* Badge */}
                      {banner.description && (
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          <span className="text-xs sm:text-sm font-medium tracking-wide">
                            {banner.description}
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                        {banner.title}
                      </h1>

                      {/* CTA Buttons */}
                      {banner.linkUrl && (
                        <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4">
                          <Link href={banner.linkUrl}>
                            <Button
                              size="lg"
                              className="bg-white text-gray-900 hover:bg-gray-100 font-semibold rounded-xl px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02]"
                            >
                              Mua ngay
                              <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                          </Link>
                          <Button
                            size="lg"
                            variant="outline"
                            className="border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm font-semibold rounded-xl px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base transition-all duration-200"
                            onClick={() => banner.linkUrl && onViewDetails && onViewDetails(banner.linkUrl)}
                          >
                            Xem thêm
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Controls */}
            {banners.length > 1 && (
              <>
                {/* Previous/Next Buttons */}
                <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full border border-white/20 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                    onClick={prev}
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </div>
                <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full border border-white/20 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                    onClick={next}
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </div>

                {/* Pagination Dots */}
                <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentIndex ? 'w-8 bg-white shadow-lg' : 'w-1.5 bg-white/50 hover:bg-white/75'
                      }`}
                      onClick={() => setCurrentIndex(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* Fallback Banner with Image */
          <div className="absolute inset-0">
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070"
              alt="Shopping Banner"
              className="w-full h-full object-cover"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 via-blue-500/70 to-transparent"></div>
            
            {/* Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl sm:max-w-2xl space-y-3 sm:space-y-4 md:space-y-6 text-white">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-xs sm:text-sm font-medium tracking-wide">
                      Khuyến mãi đặc biệt
                    </span>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                    Chào mừng đến<br />MegaMart
                  </h1>

                  {/* Description */}
                  <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-lg">
                    Khám phá hàng ngàn sản phẩm chất lượng cao với ưu đãi hấp dẫn mỗi ngày
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-4">
                    <Link href="/products">
                      <Button
                        size="lg"
                        className="bg-white text-gray-900 hover:bg-gray-100 font-semibold rounded-xl px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-[1.02]"
                      >
                        Mua ngay
                        <ChevronRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                      </Button>
                    </Link>
                    <Link href="/category/dien-thoai">
                      <Button
                        size="lg"
                        className="bg-white/10 border-2 border-white text-white hover:bg-white/20 backdrop-blur-sm font-semibold rounded-xl px-6 sm:px-8 py-3 sm:py-6 text-sm sm:text-base transition-all duration-200"
                      >
                        Khám phá
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Cards - Below Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {/* Card 1 - Featured Deal */}
        <Link href="/category/dien-thoai" className="group cursor-pointer">
          <div className="relative h-[160px] sm:h-[180px] rounded-xl overflow-hidden bg-gradient-to-br from-indigo-600 to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-white">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-2">
                  <Zap className="w-3 h-3" />
                  <span>Hot Deal</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1">iPhone 15 Pro Max</h3>
                <p className="text-sm text-white/90">Titanium. Mạnh mẽ. Nhẹ.</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-300 font-bold text-lg sm:text-xl">Giảm 7.000.000đ</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Card 2 - Category Highlight */}
        <Link href="/category/laptop" className="group cursor-pointer">
          <div className="relative h-[160px] sm:h-[180px] rounded-xl overflow-hidden bg-gradient-to-br from-pink-600 to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-white">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-2">
                  <Star className="w-3 h-3" />
                  <span>Best Seller</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1">MacBook Air M3</h3>
                <p className="text-sm text-white/90">Siêu mỏng nhẹ, hiệu năng khủng</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-300 font-bold text-lg sm:text-xl">Từ 24.990.000đ</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Card 3 - Special Offer */}
        <Link href="/category/phu-kien" className="group sm:col-span-2 lg:col-span-1 cursor-pointer">
          <div className="relative h-[140px] sm:h-[160px] rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjE4IiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
            <div className="relative h-full p-5 sm:p-6 flex flex-col justify-between text-white">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium mb-2">
                  <Tag className="w-3 h-3" />
                  <span>Sale Off</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1">Phụ kiện Apple</h3>
                <p className="text-sm text-white/90">AirPods, Case, Sạc chính hãng</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-300 font-bold text-lg sm:text-xl">Giảm đến 50%</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
