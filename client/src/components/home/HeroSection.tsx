'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Banner } from "@/lib/marketingApi";

interface HeroSectionProps {
    banners: Banner[];
}

export default function HeroSection({ banners }: HeroSectionProps) {
    const [index, setIndex] = useState(0);

    // Auto-rotate
    useEffect(() => {
        if (banners.length === 0) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % banners.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [banners.length]);

    const prev = () => {
        setIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    const next = () => {
        setIndex((prev) => (prev + 1) % banners.length);
    };

    if (banners.length === 0) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 h-[500px]">
                <div className="lg:col-span-2 bg-slate-100 rounded-2xl animate-pulse" />
                <div className="hidden lg:flex flex-col gap-6">
                    <div className="flex-1 bg-slate-100 rounded-2xl animate-pulse" />
                    <div className="flex-1 bg-slate-100 rounded-2xl animate-pulse" />
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            {/* Main Slider (2/3) */}
            <div className="lg:col-span-2 relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl group">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                    >
                        {banners[index].imageUrl ? (
                            <img
                                src={banners[index].imageUrl}
                                alt={banners[index].title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700" />
                        )}

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {banners[index].description && (
                                    <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase bg-white/20 backdrop-blur-md border border-white/30 rounded-full">
                                        {banners[index].description}
                                    </span>
                                )}
                                <h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight max-w-2xl">
                                    {banners[index].title}
                                </h2>
                                {banners[index].linkUrl && (
                                    <Link href={banners[index].linkUrl}>
                                        <Button size="lg" className="rounded-full bg-white text-slate-900 hover:bg-indigo-50 font-semibold px-8 mt-4">
                                            Mua ngay <ArrowRight className="ml-2 w-4 h-4" />
                                        </Button>
                                    </Link>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Controls */}
                <div className="absolute bottom-8 right-8 flex gap-2 z-10">
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full bg-black/20 border-white/20 text-white hover:bg-white/20 hover:border-white/40 backdrop-blur-sm"
                        onClick={prev}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full bg-black/20 border-white/20 text-white hover:bg-white/20 hover:border-white/40 backdrop-blur-sm"
                        onClick={next}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                {/* Indicators */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"}`}
                        />
                    ))}
                </div>
            </div>

            {/* Side Banners (1/3) */}
            <div className="hidden lg:flex flex-col gap-6 h-[500px]">
                {/* Banner 1 */}
                <div className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-600 transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-center text-white">
                        <span className="text-pink-200 font-medium mb-2">Flagship 2024</span>
                        <h3 className="text-2xl font-bold mb-1">Samsung Galaxy S24</h3>
                        <p className="text-sm text-pink-100 mb-4">Quyền năng AI trong tay bạn</p>
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">Giảm 5tr</span>
                        </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
                </div>

                {/* Banner 2 */}
                <div className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
                    <div className="absolute inset-0 p-8 flex flex-col justify-center text-white">
                        <span className="text-indigo-200 font-medium mb-2">Laptop Cao Cấp</span>
                        <h3 className="text-2xl font-bold mb-1">MacBook Air M3</h3>
                        <p className="text-sm text-indigo-100 mb-4">Mỏng nhẹ, hiệu năng đỉnh cao</p>
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">Chỉ từ 24.9tr</span>
                        </div>
                    </div>
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-colors" />
                </div>
            </div>
        </div>
    );
}
