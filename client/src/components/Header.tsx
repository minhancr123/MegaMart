"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, ShoppingCart, Menu, Search, LogInIcon, Handbag, ChevronDown, Heart, Scale } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

import CategoryMenu from "@/components/CategoryMenu";
import NotificationBell from "@/components/NotificationBell";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCompareStore } from "@/store/compareStore";

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const cartStore = useCartStore();
  const wishlist = useWishlistStore();
  const compare = useCompareStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpenMobile, setSearchOpenMobile] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    setOpen(false);
  };

  const handleCartClick = () => {
    console.log('handleCartClick', user);
    if (user) {
      router.push("/cart");
    } else {
      router.push("/auth");
    }
    setOpen(false);
  };

  const handleLogout = () => {
    logout();
    cartStore.clearCart();
    router.push("/");
    setOpen(false);
  };

  return (
    <div className="fixed top-0 z-50 w-full">
      {/* Top promo/quick-actions bar (desktop) */}
      <div className="hidden lg:flex w-full bg-black dark:bg-gray-950 text-white px-6 py-2 items-center justify-between">
        <span className="text-sm font-semibold tracking-wide">MegaMart · Ưu đãi và tiện ích mỗi ngày</span>
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link 
              href="/compare" 
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
            >
              <Scale className="h-5 w-5" />
              <span className="text-sm font-semibold">So sánh</span>
              {compare.items.length > 0 && (
                <Badge className="bg-blue-600 text-white shadow-md">{compare.items.length}</Badge>
              )}
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link 
              href="/wishlist" 
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:text-red-200 transition-all duration-200"
            >
              <Heart className="h-5 w-5" />
              <span className="text-sm font-medium">Yêu thích</span>
              {wishlist.items.length > 0 && (
                <Badge className="ml-2 bg-red-600 text-white shadow-md">{wishlist.items.length}</Badge>
              )}
            </Link>
          </motion.div>
        </div>
      </div>

      <header className="w-full bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800 relative z-30">
      {/* Top Bar - Mobile Only */}
      <div className="bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 md:hidden">
        <div className="flex items-center justify-between text-sm">
          <span>MegaMart - Mua sắm thông minh</span>
          {user && (
            <span className="truncate max-w-[120px]">Xin chào, {user.name}</span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
  <div className="flex items-center justify-between gap-2 sm:gap-4 relative z-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">
              MegaMart
            </h1>
          </Link>

          {/* Desktop: Category Menu */}
          <div className="hidden lg:flex items-center gap-3">
            <HoverCard openDelay={50} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-500 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 hover:border-blue-700 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-md"
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
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <CategoryMenu />
                </motion.div>
              </HoverCardContent>
            </HoverCard>

            <Link href="/products">
              <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                Sản phẩm
              </Button>
            </Link>
          </div>

          {/* Desktop: Search Bar */}
          <div className="hidden md:flex flex-1 max-w-2xl">
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

          {/* Mobile & Tablet: Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Search Icon - toggles inline input */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpenMobile((v) => !v)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart Icon - Mobile & Tablet only */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={handleCartClick}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartStore.items && cartStore.items.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs">
                    {cartStore.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
            </motion.div>

            {/* Mobile Menu Button */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                <SheetHeader>
                  <SheetTitle className="text-left dark:text-white">Menu</SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col gap-4 mt-6">
                  {/* User Info */}
                  {user ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <SheetClose asChild>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          router.push('/auth');
                        }}
                      >
                        <LogInIcon className="h-4 w-4 mr-2" />
                        Đăng nhập
                      </Button>
                    </SheetClose>
                  )}

                  {/* Navigation Links */}
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start dark:text-white dark:hover:bg-gray-800"
                        onClick={() => {
                          router.push('/products');
                        }}
                      >
                        <Handbag className="h-4 w-4 mr-3" />
                        Sản phẩm
                      </Button>
                    </SheetClose>
                    
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start dark:text-white dark:hover:bg-gray-800"
                        onClick={() => {
                          router.push('/wishlist');
                        }}
                      >
                        <Heart className="h-4 w-4 mr-3" />
                        Yêu thích
                        {wishlist.items.length > 0 && (
                          <Badge className="ml-auto">{wishlist.items.length}</Badge>
                        )}
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start dark:text-white dark:hover:bg-gray-800"
                        onClick={() => {
                          router.push('/compare');
                        }}
                      >
                        <Scale className="h-4 w-4 mr-3" />
                        So sánh
                        {compare.items.length > 0 && (
                          <Badge className="ml-auto">{compare.items.length}</Badge>
                        )}
                      </Button>
                    </SheetClose>
                  </div>

                  {/* Theme Toggle - Mobile */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <span className="text-sm font-medium dark:text-white">Chế độ hiển thị</span>
                    <ThemeToggle />
                  </div>

                  {/* User Actions */}
                  {user && (
                    <>
                      {/* Admin section */}
                      {user.role === 'ADMIN' && (
                        <SheetClose asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start dark:text-white dark:hover:bg-gray-800"
                            onClick={() => {
                              router.push('/admin');
                            }}
                          >
                            <User className="h-4 w-4 mr-3" />
                            Quản trị viên
                          </Button>
                        </SheetClose>
                      )}

                      <div className="border-t dark:border-gray-800 pt-4 mt-2">
                        <div className="flex flex-col gap-2">
                          <SheetClose asChild>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start dark:text-white dark:hover:bg-gray-800"
                              onClick={() => {
                                router.push('/profile');
                              }}
                            >
                              <User className="h-4 w-4 mr-3" />
                              Tài khoản của tôi
                            </Button>
                          </SheetClose>
                          
                          <SheetClose asChild>
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start dark:text-white dark:hover:bg-gray-800"
                              onClick={() => {
                                router.push('/orders');
                              }}
                            >
                              <Handbag className="h-4 w-4 mr-3" />
                              Đơn hàng
                            </Button>
                          </SheetClose>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => {
                          handleLogout();
                          setOpen(false);
                        }}
                      >
                        Đăng xuất
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop User Menu */}
            <div className="hidden lg:flex items-center gap-2">
              {user ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button 
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 dark:text-white"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      </motion.button>
                    </DropdownMenuTrigger>

                      <DropdownMenuContent 
                        className="w-56 p-2 mt-2 border-2 border-blue-100 dark:border-blue-900 dark:bg-gray-900 shadow-xl"
                        align="end"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <DropdownMenuLabel className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-3 py-2">
                            Tài khoản của tôi
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="my-1 dark:bg-gray-800" />
                          
                          {/* Admin menu - Only show for admin users */}
                          {user?.role === 'ADMIN' && (
                            <>
                              <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                                <DropdownMenuItem 
                                  onClick={() => router.push('/admin')}
                                  className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-200 dark:text-gray-200"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="font-medium">Quản trị viên</span>
                                </DropdownMenuItem>
                              </motion.div>
                              <DropdownMenuSeparator className="my-1 dark:bg-gray-800" />
                            </>
                          )}

                          <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                            <DropdownMenuItem 
                              onClick={() => router.push('/profile/orders')}
                              className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 dark:text-gray-200"
                            >
                              <Handbag className="h-4 w-4 mr-3 text-blue-600 dark:text-blue-400" />
                              <span className="font-medium">Đơn hàng</span>
                            </DropdownMenuItem>
                          </motion.div>

                          <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                            <DropdownMenuItem 
                              onClick={() => router.push("/profile/addresses")}
                              className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 dark:text-gray-200"
                            >
                              <Handbag className="h-4 w-4 mr-3 text-green-600 dark:text-green-400" />
                              <span className="font-medium">Địa chỉ</span>
                            </DropdownMenuItem>
                          </motion.div>

                          <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                            <DropdownMenuItem 
                              onClick={() => router.push('/profile')}
                              className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 dark:text-gray-200"
                            >
                              <User className="h-4 w-4 mr-3 text-purple-600 dark:text-purple-400" />
                              <span className="font-medium">Hồ sơ</span>
                            </DropdownMenuItem>
                          </motion.div>
                        </motion.div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 dark:text-white"
                    onClick={() => router.push('/auth')}
                  >
                    <LogInIcon className="h-4 w-4" />
                    <span>Đăng nhập/Đăng ký</span>
                  </Button>
                )}
              
              <motion.div 
                className="relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 dark:text-white" 
                  onClick={handleCartClick}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span className="font-medium">Giỏ hàng</span>
                </Button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center text-xs font-bold shadow-lg"
                  >
                    {cartStore.items?.length || 0}
                  </Badge>
                </motion.div>
              </motion.div>
              
              {/* Theme Toggle - Desktop */}
              <NotificationBell />
              <ThemeToggle />
            </div>

                {user?.id && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none hover:from-red-600 hover:to-red-700 hover:text-white cursor-pointer shadow-md hover:shadow-lg transition-all duration-200"
              >
                Đăng xuất
              </Button>
            </motion.div>
                )}

            {/* Mobile Actions */}
            <div className="flex md:hidden gap-2 relative z-20">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (user) {
                    router.push('/profile');
                  } else {
                    router.push('/auth');
                  }
                }}
              >
                <User className="h-5 w-5" />
              </Button>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleCartClick}
                >
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-xs"
                >
                  {cartStore.items?.length || 0}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search (collapsible) */}
        {searchOpenMobile && (
          <form onSubmit={handleSearch} className="md:hidden mt-3 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="pl-10"
                autoFocus
              />
            </div>
          </form>
        )}
      </div>
      </header>
    </div>
  );
}
