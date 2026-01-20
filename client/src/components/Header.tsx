"use client";
import { User, ShoppingCart, Menu, Search, LogInIcon, Handbag, ChevronDown, Heart, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import Link from "next/link";
import CategoryMenu from "@/components/CategoryMenu";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCompareStore } from "@/store/compareStore";


export default function Header() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const { cart } = useCart();
  const { clearCart } = useCartStore();
  const wishlist = useWishlistStore();
  const compare = useCompareStore();
  const { logout } = useAuthStore();

  const handleCartClick = () => {
    router.push(`/cart`);
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  const handleLogout = () => {
    logout();
    clearCart();
    router.push("/");
  }

  return (
    <header className="w-full bg-white shadow-sm border-b">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white py-1.5 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="hidden md:flex items-center gap-4 text-slate-300">
            <span>Hotline: 1900 1234</span>
            <span>Email: support@megamart.com</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link href="/compare" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Scale className="h-3.5 w-3.5" />
              <span>So sánh</span>
              {compare.items.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] px-1 rounded-full">{compare.items.length}</span>
              )}
            </Link>
            <div className="w-[1px] h-3 bg-slate-700"></div>
            <Link href="/wishlist" className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <Heart className="h-3.5 w-3.5" />
              <span>Yêu thích</span>
              {wishlist.items.length > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1 rounded-full">{wishlist.items.length}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Category Menu Button */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <h1 className="text-2xl md:text-3xl font-bold text-blue-600">
                MegaMart
              </h1>
            </Link>

            {/* Category Menu Trigger - Desktop */}
            <HoverCard openDelay={50} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden lg:flex items-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-700 transition-all duration-300 hover:shadow-md"
                  onMouseEnter={() => setShowCategories(true)}
                  onMouseLeave={() => setShowCategories(false)}
                >
                  <Menu className="h-4 w-4 transition-transform duration-200 hover:rotate-90" />
                  <span className="font-semibold">Danh mục</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                align="start"
                className="w-72 p-0 mt-1 border-2 border-blue-100"
                onMouseEnter={() => setShowCategories(true)}
                onMouseLeave={() => setShowCategories(false)}
              >
                <CategoryMenu />
              </HoverCardContent>
            </HoverCard>

            <Link href="/products" className="hidden md:block">
              <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                Sản phẩm
              </Button>
            </Link>
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-xl mx-auto px-4">
            <form onSubmit={handleSearch} className="relative w-full flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-10 pr-2 rounded-r-none border-r-0 focus:border-r-0"
                />
              </div>
              <Button
                className="rounded-l-none border-l-0 px-6 bg-blue-600 hover:bg-blue-700"
                type="submit"
              >
                Tìm kiếm
              </Button>
            </form>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Mobile Menu */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="w-56 p-2 mt-2 border-2 border-blue-100 shadow-xl"
                      align="end"
                    >

                      <DropdownMenuLabel className="text-sm font-semibold text-gray-700 px-3 py-2">
                        Tài khoản của tôi
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="my-1" />

                      {/* Admin menu - Only show for admin users */}
                      {user?.role === 'ADMIN' && (
                        <>

                          <DropdownMenuItem
                            onClick={() => router.push('/admin')}
                            className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 hover:translate-x-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">Quản trị viên</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1" />
                        </>
                      )}


                      <DropdownMenuItem
                        onClick={() => router.push('/profile/orders')}
                        className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 hover:translate-x-1"
                      >
                        <Handbag className="h-4 w-4 mr-3 text-blue-600" />
                        <span className="font-medium">Đơn hàng</span>
                      </DropdownMenuItem>



                      <DropdownMenuItem
                        onClick={() => router.push("/profile/addresses")}
                        className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 hover:translate-x-1"
                      >
                        <Handbag className="h-4 w-4 mr-3 text-green-600" />
                        <span className="font-medium">Địa chỉ</span>
                      </DropdownMenuItem>



                      <DropdownMenuItem
                        onClick={() => router.push('/profile')}
                        className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 hover:translate-x-1"
                      >
                        <User className="h-4 w-4 mr-3 text-purple-600" />
                        <span className="font-medium">Hồ sơ</span>
                      </DropdownMenuItem>

                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-blue-50 transition-all duration-200"
                  onClick={() => router.push('/auth')}
                >
                  <LogInIcon className="h-4 w-4" />
                  <span>Đăng nhập/Đăng ký</span>
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 transition-all duration-200 hover:scale-105 active:scale-95"
                  onClick={handleCartClick}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-medium">Giỏ hàng</span>
                </Button>
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center text-xs font-bold shadow-lg"
                >
                  {cart?.data.items.length || 0}
                </Badge>
              </div>
            </div>

            {user?.id && (
              <Button
                variant="outline"
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none hover:from-red-600 hover:to-red-700 hover:text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Đăng xuất
              </Button>
            )}

            {/* Mobile Actions */}
            <div className="flex md:hidden gap-2">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-xs"
                >
                  {cart?.data.items.length || 0}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="pl-10"
            />
          </div>
        </form>

      </div>
    </header >
  );
}
