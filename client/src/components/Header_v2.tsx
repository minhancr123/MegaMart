"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShoppingCart, Menu, Search, LogInIcon, Handbag, ChevronDown, Heart, Scale, Sparkles, Store } from "lucide-react";

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
      {/* Top Banner - Gradient with animation */}
      <motion.div 
        className="relative overflow-hidden"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        
        <div className="hidden lg:flex relative z-10 w-full text-white px-6 py-2.5 items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide">MegaMart · Ưu đãi và tiện ích mỗi ngày</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href="/compare" 
                className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Scale className="h-4 w-4" />
                <span className="text-sm font-semibold">So sánh</span>
                {compare.items.length > 0 && (
                  <Badge className="bg-white text-purple-600 shadow-md font-bold">{compare.items.length}</Badge>
                )}
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
              <Link 
                href="/wishlist" 
                className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Heart className="h-4 w-4" />
                <span className="text-sm font-semibold">Yêu thích</span>
                {wishlist.items.length > 0 && (
                  <Badge className="bg-white text-red-600 shadow-md font-bold">{wishlist.items.length}</Badge>
                )}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Mobile Top Banner */}
        <div className="lg:hidden relative z-10 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 text-white py-2 px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span className="font-semibold">MegaMart</span>
            </div>
            {user && (
              <span className="truncate max-w-[120px] text-sm">👋 {user.name}</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Header - Glassmorphism */}
      <motion.header 
        className="relative w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 relative z-10">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo with gradient */}
            <Link href="/">
              <motion.div 
                className="flex-shrink-0 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  MegaMart
                </h1>
              </motion.div>
            </Link>

            {/* Desktop: Category Menu & Products */}
            <div className="hidden lg:flex items-center gap-3">
              <HoverCard openDelay={50} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                      onMouseEnter={() => setShowCategories(true)}
                      onMouseLeave={() => setShowCategories(false)}
                    >
                      <Menu className="h-4 w-4" />
                      <span className="font-bold">Danh mục</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </HoverCardTrigger>
                <HoverCardContent 
                  side="bottom" 
                  align="start" 
                  className="w-72 p-0 mt-2 border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
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
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                    <Handbag className="w-4 h-4 mr-2" />
                    Sản phẩm
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Desktop: Search Bar - Glassmorphism */}
            <div className="hidden md:flex flex-1 max-w-2xl">
              <form onSubmit={handleSearch} className="relative w-full flex group">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 h-5 w-5 transition-colors duration-200" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm..."
                    className="pl-12 pr-4 py-6 rounded-l-2xl rounded-r-none border-r-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all duration-300 font-medium"
                  />
                </div>
                <Button
                  className="rounded-l-none rounded-r-2xl px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                  type="submit"
                >
                  Tìm kiếm
                </Button>
              </form>
            </div>

            {/* Mobile & Tablet: Action Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Search Icon */}
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 rounded-xl"
                  onClick={() => setSearchOpenMobile((v) => !v)}
                >
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </Button>
              </motion.div>

              {/* Cart Icon - Mobile & Tablet only */}
              <motion.div 
                whileHover={{ scale: 1.1 }} 
                whileTap={{ scale: 0.9 }} 
                className="lg:hidden relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/30 dark:to-red-900/30 hover:from-pink-100 hover:to-red-100 dark:hover:from-pink-900/50 dark:hover:to-red-900/50 rounded-xl"
                  onClick={handleCartClick}
                >
                  <ShoppingCart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  {cartStore.items && cartStore.items.length > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-bold shadow-lg border-2 border-white dark:border-gray-900">
                        {cartStore.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                      </Badge>
                    </motion.div>
                  )}
                </Button>
              </motion.div>

              {/* Mobile Menu Button */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/50 dark:hover:to-pink-900/50 rounded-xl"
                    >
                      <Menu className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </Button>
                  </motion.div>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50">
                  <SheetHeader>
                    <SheetTitle className="text-left dark:text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Menu className="w-5 h-5 text-white" />
                      </div>
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex flex-col gap-4 mt-6">
                    {/* User Info */}
                    {user ? (
                      <motion.div 
                        className="relative overflow-hidden rounded-2xl"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700"></div>
                        <div className="relative flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md">
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{user.name}</p>
                            <p className="text-xs text-white/80 truncate">{user.email}</p>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <SheetClose asChild>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg py-6 rounded-xl"
                            onClick={() => router.push('/auth')}
                          >
                            <LogInIcon className="h-5 w-5 mr-2" />
                            Đăng nhập
                          </Button>
                        </motion.div>
                      </SheetClose>
                    )}

                    {/* Navigation Links */}
                    <div className="flex flex-col gap-2">
                      {[
                        { href: '/products', icon: Handbag, label: 'Sản phẩm', gradient: 'from-blue-500 to-purple-500' },
                        { href: '/wishlist', icon: Heart, label: 'Yêu thích', gradient: 'from-pink-500 to-red-500', badge: wishlist.items.length },
                        { href: '/compare', icon: Scale, label: 'So sánh', gradient: 'from-purple-500 to-pink-500', badge: compare.items.length },
                      ].map((item, idx) => (
                        <SheetClose asChild key={item.href}>
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ x: 4 }}
                          >
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start dark:text-white dark:hover:bg-gray-800 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700 rounded-xl py-6 group"
                              onClick={() => router.push(item.href)}
                            >
                              <div className={`w-8 h-8 bg-gradient-to-r ${item.gradient} rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                                <item.icon className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-semibold">{item.label}</span>
                              {item.badge && item.badge > 0 && (
                                <Badge className="ml-auto">{item.badge}</Badge>
                              )}
                            </Button>
                          </motion.div>
                        </SheetClose>
                      ))}
                    </div>

                    {/* Theme Toggle - Mobile */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-semibold dark:text-white">Chế độ hiển thị</span>
                      <ThemeToggle />
                    </div>

                    {/* User Actions */}
                    {user && (
                      <>
                        {/* Admin section */}
                        {user.role === 'ADMIN' && (
                          <SheetClose asChild>
                            <motion.div whileHover={{ x: 4 }}>
                              <Button 
                                variant="ghost" 
                                className="w-full justify-start dark:text-white dark:hover:bg-gray-800 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 rounded-xl py-6"
                                onClick={() => router.push('/admin')}
                              >
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-semibold">Quản trị viên</span>
                              </Button>
                            </motion.div>
                          </SheetClose>
                        )}

                        <div className="border-t dark:border-gray-800 pt-4 mt-2">
                          <div className="flex flex-col gap-2">
                            <SheetClose asChild>
                              <motion.div whileHover={{ x: 4 }}>
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start dark:text-white dark:hover:bg-gray-800 rounded-xl py-6"
                                  onClick={() => router.push('/profile')}
                                >
                                  <User className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
                                  <span className="font-semibold">Tài khoản của tôi</span>
                                </Button>
                              </motion.div>
                            </SheetClose>
                            
                            <SheetClose asChild>
                              <motion.div whileHover={{ x: 4 }}>
                                <Button 
                                  variant="ghost" 
                                  className="w-full justify-start dark:text-white dark:hover:bg-gray-800 rounded-xl py-6"
                                  onClick={() => router.push('/orders')}
                                >
                                  <Handbag className="h-5 w-5 mr-3 text-green-600 dark:text-green-400" />
                                  <span className="font-semibold">Đơn hàng</span>
                                </Button>
                              </motion.div>
                            </SheetClose>
                          </div>
                        </div>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button 
                            variant="outline" 
                            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 font-bold py-6 rounded-xl shadow-lg"
                            onClick={() => {
                              handleLogout();
                              setOpen(false);
                            }}
                          >
                            Đăng xuất
                          </Button>
                        </motion.div>
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
                          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 transition-all duration-300 dark:text-white shadow-md hover:shadow-lg"
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold">{user.name}</span>
                          <ChevronDown className="h-4 w-4" />
                        </motion.button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent 
                        className="w-64 p-2 mt-2 border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl"
                        align="end"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <DropdownMenuLabel className="text-sm font-bold text-gray-700 dark:text-gray-200 px-3 py-2">
                            Tài khoản của tôi
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="my-1 dark:bg-gray-800" />
                          
                          {/* Admin menu */}
                          {user?.role === 'ADMIN' && (
                            <>
                              <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                                <DropdownMenuItem 
                                  onClick={() => router.push('/admin')}
                                  className="cursor-pointer px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all duration-200 dark:text-gray-200 group"
                                >
                                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                    <User className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="font-semibold">Quản trị viên</span>
                                </DropdownMenuItem>
                              </motion.div>
                              <DropdownMenuSeparator className="my-1 dark:bg-gray-800" />
                            </>
                          )}

                          {[
                            { href: '/profile/orders', icon: Handbag, label: 'Đơn hàng', gradient: 'from-blue-600 to-indigo-600' },
                            { href: '/profile/addresses', icon: Handbag, label: 'Địa chỉ', gradient: 'from-green-600 to-emerald-600' },
                            { href: '/profile', icon: User, label: 'Hồ sơ', gradient: 'from-purple-600 to-pink-600' },
                          ].map((item) => (
                            <motion.div key={item.href} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                              <DropdownMenuItem 
                                onClick={() => router.push(item.href)}
                                className="cursor-pointer px-3 py-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 dark:text-gray-200 group"
                              >
                                <div className={`w-8 h-8 bg-gradient-to-r ${item.gradient} rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform`}>
                                  <item.icon className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-semibold">{item.label}</span>
                              </DropdownMenuItem>
                            </motion.div>
                          ))}
                        </motion.div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6"
                      onClick={() => router.push('/auth')}
                    >
                      <LogInIcon className="h-4 w-4" />
                      <span>Đăng nhập</span>
                    </Button>
                  </motion.div>
                )}
              
                {/* Cart Button */}
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6" 
                    onClick={handleCartClick}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Giỏ hàng</span>
                  </Button>
                  <AnimatePresence>
                    {cartStore.items?.length > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      >
                        <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center text-xs font-bold shadow-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-2 border-white dark:border-gray-900">
                          {cartStore.items.length}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                
                {/* Notification & Theme */}
                <NotificationBell />
                <ThemeToggle />

                {/* Logout Button */}
                {user?.id && (
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={handleLogout} 
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0 font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                    >
                      Đăng xuất
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search (collapsible) */}
          <AnimatePresence>
            {searchOpenMobile && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="md:hidden mt-4 w-full"
              >
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm sản phẩm..."
                      className="pl-12 pr-4 py-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-blue-600 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                      autoFocus
                    />
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>
    </div>
  );
}
