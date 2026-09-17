"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ElectronicsSaleVisual,
  ExpressDeliveryVisual,
  fallbackBanners,
  getStitchBannerKind,
  TradeInVisual,
  type StitchBannerKind,
} from "@/components/home/stitch-banners";
import type { Banner } from "@/lib/marketingApi";

interface HeroBannerProps {
  banners: Banner[];
  onViewDetails?: (url: string) => void;
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

function subscribeToClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 1000);
  return () => window.clearInterval(timer);
}

function getClockSnapshot() {
  return Math.floor(Date.now() / 1000);
}

function getClockServerSnapshot() {
  return 0;
}

const heroThemes = {
  default: {
    panel: "from-[#b83400] via-[#e04400] to-[#ff6b00]",
    visual: "bg-[#eef0f1]",
    buttonText: "text-[#a83200]",
  },
  electronics: {
    panel: "from-[#9f2500] via-[#dc3c00] to-[#ff6b00]",
    visual: "bg-[#120b08]",
    buttonText: "text-[#a83200]",
  },
  delivery: {
    panel: "from-[#0b3570] via-[#0759a5] to-[#0284c7]",
    visual: "bg-[#06182c]",
    buttonText: "text-[#0759a5]",
  },
  "trade-in": {
    panel: "from-[#211d59] via-[#3730a3] to-[#6d28d9]",
    visual: "bg-[#0a1526]",
    buttonText: "text-[#3730a3]",
  },
} as const;

function StitchBannerVisual({ kind }: { kind: StitchBannerKind }) {
  if (kind === "delivery") return <ExpressDeliveryVisual />;
  if (kind === "trade-in") return <TradeInVisual />;
  return <ElectronicsSaleVisual />;
}

/** Đếm ngược thời gian thực tới endDate (chỉ render sau mount để tránh lệch hydration). */
export function useCountdown(endDate?: string) {
  const target = endDate ? new Date(endDate).getTime() : NaN;
  const currentSecond = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );
  if (currentSecond === 0 || !Number.isFinite(target)) return null;
  const now = currentSecond * 1000;
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    done: diff <= 0,
  };
}

function CountdownBadge({ endDate }: { endDate: string }) {
  const countdown = useCountdown(endDate);
  if (!countdown || countdown.done) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2" aria-label="Đếm ngược kết thúc">
      <span className="mr-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/80">
        <Clock3 className="h-4 w-4" /> Kết thúc sau
      </span>
      {[
        [countdown.days, "Ngày"],
        [countdown.hours, "Giờ"],
        [countdown.minutes, "Phút"],
        [countdown.seconds, "Giây"],
      ].map(([value, label]) => (
        <span key={label as string} className="flex min-w-10 flex-col items-center rounded-lg bg-black/30 px-2 py-1.5 backdrop-blur-sm">
          <span className="text-base font-black tabular-nums leading-none">
            {String(value).padStart(2, "0")}
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase text-white/70">{label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Suy mẫu hiển thị: STATIC giữ giao diện gốc; AUTO tự chọn theo dữ liệu
 * (có endDate -> đếm ngược, có sản phẩm nổi -> thẻ nổi); TEMPLATE_1/2/3 ép mẫu.
 */
export function resolveBannerTemplate(banner: Banner): "STATIC" | "TEMPLATE_1" | "TEMPLATE_2" | "TEMPLATE_3" {
  const forced = banner.template || "AUTO";
  if (forced === "STATIC") return "STATIC";
  if (forced === "TEMPLATE_1" || forced === "TEMPLATE_2" || forced === "TEMPLATE_3") return forced;
  if (banner.endDate) return "TEMPLATE_1";
  if ((banner.featuredProducts || []).length > 0) return "TEMPLATE_2";
  return "STATIC";
}

const fmtPrice = (n: number | null | undefined) =>
  n == null ? "" : new Intl.NumberFormat("vi-VN").format(n) + "₫";

export default function HeroBanner({ banners, onViewDetails }: HeroBannerProps) {
  // Ba banner động luôn xuất hiện; banner quản trị chỉ được nối thêm khi đang bật.
  const slides = [...fallbackBanners, ...banners];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeIndex = currentIndex % slides.length;
  const banner = slides[activeIndex] || fallbackBanners[0];
  const href = banner.linkUrl || "/products";
  const imageSrc = banner.imageUrl || "/images/stitch/hero-appliances.jpg";
  const template = resolveBannerTemplate(banner);
  const featured = banner.featuredProducts || [];
  const stitchKind = getStitchBannerKind(banner);
  const theme = heroThemes[stitchKind || "default"];

  useEffect(() => {
    if (slides.length <= 1 || prefersReducedMotion || isHovered || isFocusWithin || isAutoPlayPaused) return;
    const timer = window.setInterval(
      () => setCurrentIndex((index) => (index + 1) % slides.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [isAutoPlayPaused, isFocusWithin, isHovered, prefersReducedMotion, slides.length]);

  const previous = () => setCurrentIndex((index) => (index - 1 + slides.length) % slides.length);
  const next = () => setCurrentIndex((index) => (index + 1) % slides.length);

  return (
    <section className="space-y-4" aria-label="Khuyến mãi nổi bật">
      <div>
        <article
          className="group relative grid min-h-[390px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_14px_45px_rgba(127,36,0,0.12)] sm:grid-cols-[0.85fr_1.15fr] lg:min-h-[430px]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocusCapture={() => setIsFocusWithin(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsFocusWithin(false);
            }
          }}
        >
          <div className={`relative z-10 flex flex-col justify-center bg-gradient-to-br ${theme.panel} p-7 text-white sm:p-9 lg:p-11`}>
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
              <Sparkles className="h-3.5 w-3.5 text-orange-100" /> Ưu đãi nổi bật
            </span>
            {banner.badgeText && (
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-lg bg-yellow-300 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#7a2000] shadow">
                <Zap className="h-3.5 w-3.5" /> {banner.badgeText}
              </span>
            )}
            <h1 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
              {banner.title || fallbackBanners[0].title}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/85 sm:text-base">
              {banner.description || fallbackBanners[0].description}
            </p>
            {template === "TEMPLATE_1" && banner.endDate && <CountdownBadge endDate={banner.endDate} />}
            <div className="mt-7 flex flex-wrap gap-3">
               <Button asChild className={`h-11 bg-white px-5 font-extrabold ${theme.buttonText} shadow-md hover:bg-white/90`}>
                 <Link href={href}>{banner.ctaText || "Mua ngay"} <ArrowRight className="ml-2 h-4 w-4" /></Link>
               </Button>
              {onViewDetails && (
                <Button type="button" variant="outline" className="h-11 border-white/40 bg-transparent px-5 font-bold text-white hover:bg-white/15 hover:text-white" onClick={() => onViewDetails(href)}>
                  Xem ưu đãi
                </Button>
              )}
            </div>
          </div>

          <div className={`relative min-h-[230px] overflow-hidden ${theme.visual} sm:min-h-full`}>
            {stitchKind ? (
              <StitchBannerVisual kind={stitchKind} />
            ) : (
              <>
                <Image src={imageSrc} alt={banner.title || "Ưu đãi điện máy MegaMart"} fill priority sizes="(min-width: 1024px) 58vw, (min-width: 640px) 55vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#ff6b00]/10 via-transparent to-transparent" />
                <div className="absolute right-4 top-4 rounded-xl bg-white px-4 py-3 text-center text-[#a83200] shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Giảm đến</p>
                  <p className="text-2xl font-black">50%</p>
                </div>
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-zinc-950/75 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                  <BadgeCheck className="h-4 w-4 text-orange-300" /> Chính hãng 100%
                </div>
              </>
            )}
          </div>

          {slides.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-white/85 p-1 shadow-md backdrop-blur-sm">
              <Button type="button" variant="ghost" size="icon" onClick={previous} className="h-8 w-8 rounded-full text-zinc-800 hover:bg-white" aria-label="Banner trước">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center" role="group" aria-label="Chọn banner">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className="group/dot grid h-6 w-6 place-items-center rounded-full"
                    aria-label={`Xem banner ${index + 1}: ${slide.title}`}
                    aria-current={activeIndex === index ? "true" : undefined}
                  >
                    <span className={`h-2 rounded-full transition-[width,background-color] ${activeIndex === index ? "w-5 bg-[#ff4d00]" : "w-2 bg-zinc-300 group-hover/dot:bg-zinc-400"}`} />
                  </button>
                ))}
              </div>
              {!prefersReducedMotion && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAutoPlayPaused((paused) => !paused)}
                  className="h-8 w-8 rounded-full text-zinc-800 hover:bg-white"
                  aria-label={isAutoPlayPaused ? "Tiếp tục tự động chuyển banner" : "Tạm dừng tự động chuyển banner"}
                >
                  {isAutoPlayPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" onClick={next} className="h-8 w-8 rounded-full text-zinc-800 hover:bg-white" aria-label="Banner tiếp theo">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </article>

      </div>

      {template !== "STATIC" && featured.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {featured.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-3 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt={p.name} className="h-14 w-14 shrink-0 rounded-xl border border-zinc-100 object-cover" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-orange-50 text-lg font-black text-[#e04400]">
                  {p.name.charAt(0)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-zinc-900 group-hover:text-[#a83200]">
                  {p.name}
                </span>
                {p.salePrice != null ? (
                  <span className="mt-0.5 block text-sm font-black text-[#c53b00]">
                    {fmtPrice(p.salePrice)}{" "}
                    <span className="font-medium text-zinc-400 line-through">{fmtPrice(p.price)}</span>
                  </span>
                ) : p.price != null ? (
                  <span className="mt-0.5 block text-sm font-black text-[#c53b00]">{fmtPrice(p.price)}</span>
                ) : null}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Truck, title: "Giao lắp tận nơi", text: "Nhanh chóng trên toàn quốc" },
          { icon: ShieldCheck, title: "Bảo hành chính hãng", text: "Đổi trả minh bạch, dễ dàng" },
          { icon: ShoppingBag, title: "Trả góp 0%", text: "Thủ tục đơn giản, duyệt nhanh" },
        ].map((benefit) => (
          <div key={benefit.title} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#e04400]"><benefit.icon className="h-5 w-5" /></span>
            <div><h2 className="text-sm font-extrabold text-zinc-900">{benefit.title}</h2><p className="mt-0.5 text-xs text-zinc-500">{benefit.text}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}
