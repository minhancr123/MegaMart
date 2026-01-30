'use client'

import { useState, useEffect } from "react";
import { FlashSale } from "@/lib/marketingApi";
import { Zap, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface FlashSaleSectionProps {
    flashSales: FlashSale[];
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

const productContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
};

const productVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" }
    }
};

const countdownVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }
    }
};

export default function FlashSaleSection({ flashSales }: FlashSaleSectionProps) {
    const router = useRouter();
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [activeSale, setActiveSale] = useState<FlashSale | null>(null);
    const [isUpcoming, setIsUpcoming] = useState(false);

    useEffect(() => {
        const updateStatus = () => {
            const now = new Date();

            // Find active
            const active = flashSales.find(fs => {
                const start = new Date(fs.startTime);
                const end = new Date(fs.endTime);
                return now >= start && now <= end && fs.active;
            });

            if (active) {
                setActiveSale(active);
                setIsUpcoming(false);
                return;
            }

            // Find upcoming
            const upcoming = flashSales
                .filter(fs => new Date(fs.startTime) > now && fs.active)
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

            if (upcoming) {
                setActiveSale(upcoming);
                setIsUpcoming(true);
            } else {
                setActiveSale(null);
            }
        };

        updateStatus();
        const timer = setInterval(updateStatus, 1000 * 60); // Check every minute
        return () => clearInterval(timer);
    }, [flashSales]);

    // Countdown timer
    useEffect(() => {
        if (!activeSale) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            // If upcoming, count to start. If active, count to end.
            const targetTime = isUpcoming
                ? new Date(activeSale.startTime).getTime()
                : new Date(activeSale.endTime).getTime();

            const distance = targetTime - now;

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
    }, [activeSale, isUpcoming]);

    if (!activeSale) return null;

    return (
        <motion.section
            className="py-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
        >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                {/* Background with Gradient and Noise/Pattern */}
                <div className={`absolute inset-0 bg-gradient-to-r ${isUpcoming ? 'from-amber-500 to-orange-600' : 'from-red-600 to-rose-600'}`} />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

                <div className="relative z-10 p-8 md:p-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                        <motion.div
                            className="flex items-center gap-4"
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                        >
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
                                <Zap className={`w-8 h-8 ${isUpcoming ? 'text-yellow-200' : 'text-yellow-300'} fill-current animate-pulse`} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                                    {isUpcoming ? 'Sắp diễn ra' : 'Flash Sale'}
                                </h2>
                                <p className="text-white/80 font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {isUpcoming
                                        ? `Bắt đầu lúc ${new Date(activeSale.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, ${new Date(activeSale.startTime).toLocaleDateString('vi-VN')}`
                                        : 'Kết thúc trong'
                                    }
                                </p>
                            </div>
                        </motion.div>

                        {/* Countdown */}
                        <motion.div
                            className="flex gap-3"
                            variants={countdownVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {['Giờ', 'Phút', 'Giây'].map((label, i) => {
                                const value = i === 0 ? countdown.hours : i === 1 ? countdown.minutes : countdown.seconds;
                                return (
                                    <motion.div
                                        key={label}
                                        className="flex flex-col items-center"
                                        whileHover={{ scale: 1.05 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                    >
                                        <div className="bg-white text-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg">
                                            <motion.span
                                                key={value}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {value.toString().padStart(2, '0')}
                                            </motion.span>
                                        </div>
                                        <span className="text-xs text-white/80 font-medium mt-2 uppercase tracking-wider">{label}</span>
                                    </motion.div>
                                )
                            })}
                        </motion.div>
                    </div>

                    {/* Products Grid */}
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6"
                        variants={productContainerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {activeSale.items?.slice(0, 4).map((item: any) => {
                            const product = item.variant?.product;
                            const originalPrice = item.variant?.price || 0;
                            const salePrice = item.salePrice;
                            const discount = originalPrice > 0 ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0;
                            const soldPercentage = item.quantity > 0 ? Math.min((item.soldCount / item.quantity) * 100, 100) : 0;
                            const imageUrl = product?.images?.[0] || '';

                            return (
                                <motion.div
                                    key={item.id}
                                    variants={productVariants}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    onClick={() => !isUpcoming && router.push(`/product/${product?.id}`)}
                                    className={`bg-white rounded-2xl p-4 shadow-lg group ${isUpcoming ? 'opacity-90' : 'cursor-pointer'}`}
                                >
                                    <div className="relative aspect-square mb-4 bg-slate-100 rounded-xl overflow-hidden">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt={product?.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <Badge className="bg-red-500 hover:bg-red-600 border-none text-white px-2 py-1 text-xs font-bold rounded-lg shadow-sm">
                                                -{discount}%
                                            </Badge>
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2 h-10 text-sm group-hover:text-red-600 transition-colors">
                                        {product?.name}
                                    </h3>

                                    <div className="flex flex-col gap-1 mb-3">
                                        <span className="text-lg font-bold text-red-600">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salePrice)}
                                        </span>
                                        {originalPrice > salePrice && (
                                            <span className="text-xs text-slate-400 line-through">
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalPrice)}
                                            </span>
                                        )}
                                    </div>

                                    {!isUpcoming && (
                                        <div className="space-y-1.5">
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <motion.div
                                                    className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${soldPercentage}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Đã bán {item.soldCount}</span>
                                                <span className="text-red-500 font-medium">
                                                    {item.quantity - item.soldCount <= 5 ? 'Sắp hết' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {isUpcoming && (
                                        <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl h-9 text-sm">
                                            Xem chi tiết
                                        </Button>
                                    )}
                                </motion.div>
                            )
                        })}
                    </motion.div>

                    <motion.div
                        className="mt-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 }}
                    >
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm rounded-full px-8 hover:scale-105 transition-transform">
                            Xem tất cả deal <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </motion.div>
                </div>
            </div>
        </motion.section>
    );
}
