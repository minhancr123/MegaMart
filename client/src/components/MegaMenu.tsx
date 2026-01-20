"use client";

import Link from "next/link";
import { ChevronRight, Smartphone, Laptop, Tablet, Headphones, Watch, Camera, Speaker, Monitor } from "lucide-react";
import { useState } from "react";

const categories = [
    {
        id: "phones",
        name: "Điện thoại",
        icon: Smartphone,
        href: "/category/phones",
        brands: ["Apple", "Samsung", "Xiaomi", "OPPO", "Vivo", "Realme", "Nokia", "ASUS"],
        featured: [
            { name: "iPhone 15 Pro Max", href: "/product/iphone-15-pro-max", image: "https://cdn.tgdd.vn/Products/Images/42/305658/iphone-15-pro-max-blue-thumbnew-600x600.jpg" },
            { name: "Samsung Galaxy S24 Ultra", href: "/product/samsung-s24-ultra", image: "https://cdn.tgdd.vn/Products/Images/42/307172/samsung-galaxy-s24-ultra-grey-thumbnew-600x600.jpg" }
        ]
    },
    {
        id: "laptops",
        name: "Laptop",
        icon: Laptop,
        href: "/category/laptops",
        brands: ["MacBook", "ASUS", "HP", "Lenovo", "Acer", "Dell", "MSI", "LG"],
        featured: [
            { name: "MacBook Air M3", href: "/product/macbook-air-m3", image: "https://cdn.tgdd.vn/Products/Images/44/322609/macbook-air-13-inch-m3-gray-thumb-600x600.jpg" },
            { name: "ASUS TUF Gaming", href: "/product/asus-tuf", image: "https://cdn.tgdd.vn/Products/Images/44/313456/asus-tuf-gaming-f15-fx507vu-i7-lp198w-thumb-600x600.jpg" }
        ]
    },
    {
        id: "tablets",
        name: "Máy tính bảng",
        icon: Tablet,
        href: "/category/tablets",
        brands: ["iPad", "Samsung", "Xiaomi", "Lenovo", "OPPO"],
        featured: []
    },
    {
        id: "audio",
        name: "Âm thanh",
        icon: Headphones,
        href: "/category/audio",
        brands: ["JBL", "Sony", "Marshall", "Apple", "Samsung"],
        featured: []
    },
    {
        id: "smartwatch",
        name: "Đồng hồ thông minh",
        icon: Watch,
        href: "/category/smartwatch",
        brands: ["Apple Watch", "Samsung", "Garmin", "Xiaomi", "Huawei"],
        featured: []
    },
    {
        id: "pc",
        name: "PC - Linh kiện",
        icon: Monitor,
        href: "/category/pc",
        brands: ["Mainboard", "CPU", "VGA", "RAM", "SSD", "Case", "Nguồn"],
        featured: []
    }
];

export default function MegaMenu() {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    return (
        <div className="flex bg-white rounded-b-lg shadow-xl border-t border-gray-100 min-h-[400px]">
            {/* Sidebar Categories */}
            <div className="w-64 border-r border-gray-100 py-2 bg-gray-50/50">
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${activeCategory === category.id
                            ? "bg-white text-red-600 font-medium shadow-sm border-l-4 border-red-600"
                            : "text-gray-700 hover:bg-white hover:text-red-600"
                            }`}
                        onMouseEnter={() => setActiveCategory(category.id)}
                    >
                        <div className="flex items-center gap-3">
                            <category.icon className="w-5 h-5" />
                            <span>{category.name}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                ))}
                <div className="mt-2 pt-2 border-t border-gray-200 px-4">
                    <Link href="/categories" className="text-sm text-red-600 hover:underline flex items-center gap-1">
                        Xem tất cả danh mục <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 bg-white">
                {activeCategory ? (
                    (() => {
                        const category = categories.find(c => c.id === activeCategory);
                        if (!category) return null;

                        return (
                            <div className="grid grid-cols-12 gap-8 h-full animate-in fade-in duration-200">
                                {/* Brands Column */}
                                <div className="col-span-3">
                                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Thương hiệu</h3>
                                    <div className="flex flex-col gap-2">
                                        {category.brands.map((brand) => (
                                            <Link
                                                key={brand}
                                                href={`${category.href}?brand=${brand.toLowerCase()}`}
                                                className="text-gray-600 hover:text-red-600 hover:translate-x-1 transition-transform"
                                            >
                                                {brand}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Sub-categories / Popular Filters (Mock) */}
                                <div className="col-span-4">
                                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Nổi bật</h3>
                                    <div className="flex flex-col gap-2">
                                        <Link href="#" className="text-gray-600 hover:text-red-600">Sản phẩm mới nhất</Link>
                                        <Link href="#" className="text-gray-600 hover:text-red-600">Bán chạy tháng này</Link>
                                        <Link href="#" className="text-gray-600 hover:text-red-600">Khuyến mãi hot</Link>
                                        <Link href="#" className="text-gray-600 hover:text-red-600">Trả góp 0%</Link>
                                        <Link href="#" className="text-gray-600 hover:text-red-600">Giá dưới 5 triệu</Link>
                                        <Link href="#" className="text-gray-600 hover:text-red-600">Giá 5 - 10 triệu</Link>
                                    </div>
                                </div>

                                {/* Featured Products Image */}
                                <div className="col-span-5 border-l border-gray-100 pl-8">
                                    <h3 className="font-bold text-gray-900 mb-4 text-lg">Sản phẩm gợi ý</h3>
                                    <div className="space-y-4">
                                        {category.featured && category.featured.length > 0 ? (
                                            category.featured.map((item, idx) => (
                                                <Link key={idx} href={item.href} className="flex gap-4 group">
                                                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 group-hover:border-red-500 transition-colors">
                                                        {/* Placeholder for image */}
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">IMG</div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">{item.name}</h4>
                                                        <span className="text-sm text-red-600 font-semibold">Liên hệ</span>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="text-gray-400 text-sm">Đang cập nhật sản phẩm nổi bật...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <Smartphone className="w-8 h-8 text-gray-300" />
                        </div>
                        <p>Di chuột vào danh mục để xem chi tiết</p>
                    </div>
                )}
            </div>
        </div>
    );
}
