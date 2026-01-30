'use client'

import Link from "next/link";
import { Category } from "@/interfaces/product";
import { ArrowRight, Smartphone, Laptop, Headphones, Watch, Camera, Gamepad, Shirt, Home, Gift, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";

interface FeaturedCategoriesProps {
    categories: Category[];
}

// Helper to map category names to icons (simple heuristic)
const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('điện thoại') || lower.includes('phone')) return Smartphone;
    if (lower.includes('laptop') || lower.includes('máy tính')) return Laptop;
    if (lower.includes('âm thanh') || lower.includes('tai nghe')) return Headphones;
    if (lower.includes('đồng hồ') || lower.includes('watch')) return Watch;
    if (lower.includes('camera') || lower.includes('máy ảnh')) return Camera;
    if (lower.includes('game') || lower.includes('chơi game')) return Gamepad;
    if (lower.includes('thời trang') || lower.includes('quần áo')) return Shirt;
    if (lower.includes('gia dụng') || lower.includes('nhà cửa')) return Home;
    return Gift; // Default
};

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.4, ease: "easeOut" }
    }
};

const headerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
};

export default function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
    // Take top 6 categories or all if less
    const displayCategories = categories.slice(0, 11);

    return (
        <section className="py-12">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={headerVariants}
                className="flex justify-between items-end mb-8"
            >
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Danh mục nổi bật</h2>
                    <p className="text-slate-500">Khám phá các sản phẩm theo danh mục bạn quan tâm</p>
                </div>
                <Link href="/categories" className="text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1 transition-colors">
                    Xem tất cả <ArrowRight className="w-4 h-4" />
                </Link>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            >
                {displayCategories.map((category) => {
                    const Icon = getCategoryIcon(category.name);
                    return (
                        <motion.div key={category.id} variants={itemVariants}>
                            <Link
                                href={`/category/${category.slug || category.id}`}
                                className="group flex flex-col items-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300">
                                    <Icon className="w-8 h-8" strokeWidth={1.5} />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-center group-hover:text-indigo-600 transition-colors">
                                    {category.name}
                                </h3>
                                <span className="text-xs text-slate-400 mt-1">100+ sản phẩm</span>
                            </Link>
                        </motion.div>
                    );
                })}

                {/* View All Card */}
                <motion.div variants={itemVariants}>
                    <Link
                        href="/categories"
                        className="group flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-transparent hover:bg-indigo-50 hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 h-full"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-4 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-300 shadow-sm">
                            <MoreHorizontal className="w-8 h-8" />
                        </div>
                        <h3 className="font-semibold text-slate-600 text-center group-hover:text-indigo-600 transition-colors">
                            Xem tất cả
                        </h3>
                        <span className="text-xs text-slate-400 mt-1">Danh mục khác</span>
                    </Link>
                </motion.div>
            </motion.div>
        </section>
    );
}
