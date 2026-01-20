"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user, hasHydrated, logout } = useAuthStore();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    const sidebarItems = [
        {
            title: "Tổng quan",
            href: "/admin",
            icon: LayoutDashboard,
        },
        {
            title: "Sản phẩm",
            href: "/admin/products",
            icon: Package,
        },
        {
            title: "Đơn hàng",
            href: "/admin/orders",
            icon: ShoppingCart,
        },
        {
            title: "Khách hàng",
            href: "/admin/users",
            icon: Users,
        },
        {
            title: "Tin tức & Sự kiện",
            href: "/admin/posts",
            icon: FileText,
        },
        {
            title: "Cài đặt",
            href: "/admin/settings",
            icon: Settings,
        },
    ];

    useEffect(() => {
        // Wait for hydration to complete
        if (!hasHydrated) {
            setIsChecking(true);
            return;
        }

        console.log('Auth check:', { user, hasHydrated });
        
        if (!user) {
            // Not logged in → redirect to auth
            router.push('/auth');
        } else if (user.role !== 'ADMIN') {
            // Logged in but not admin → redirect to home
            router.push('/');
        } else {
            // All good, user is admin
            setIsChecking(false);
        }
    }, [user, hasHydrated, router]);

    // Show loading state while checking auth
    if (!hasHydrated || isChecking) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
                </div>
            </div>
        );
    }

    // If user is not admin, don't render the layout (redirect will happen)
    if (!user || user.role !== 'ADMIN') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 hidden md:block">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <Link href="/" className="text-2xl font-bold text-blue-600">
                        Mega<span className="text-gray-900">Admin</span>
                    </Link>
                </div>
                <div className="p-4 space-y-1">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.title}
                            </Link>
                        );
                    })}
                </div>
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                            logout();
                            router.push("/");
                        }}
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
