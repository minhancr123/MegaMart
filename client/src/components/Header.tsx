"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleUserRound,
  Gift,
  Heart,
  LogIn,
  LogOut,
  Menu,
  PackageSearch,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import NotificationBell from "@/components/NotificationBell";
import { LogoMark } from "@/components/Logo";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SearchBox from "@/components/SearchBox";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useCompareStore } from "@/store/compareStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useMounted } from "@/hooks/useMounted";

const mobileLinks = [
  { href: "/products", label: "Tất cả sản phẩm", icon: PackageSearch },
  { href: "/wishlist", label: "Sản phẩm yêu thích", icon: Heart },
  { href: "/compare", label: "So sánh sản phẩm", icon: SlidersHorizontal },
  { href: "/news", label: "Tin công nghệ", icon: Gift },
];

function CountBadge({ count, mounted }: { count: number; mounted: boolean }) {
  if (!mounted || !count) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-[#ff4d00] px-1 text-[10px] font-extrabold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Header() {
  const router = useRouter();
  const mounted = useMounted();
  const { user, logout } = useAuthStore();
  const cartStore = useCartStore();
  const wishlist = useWishlistStore();
  const compare = useCompareStore();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Hotline lấy từ Admin → Cài đặt để khớp với cấu hình cửa hàng
  const storeContact = useStoreSettings();
  const cartCount = cartStore.items.reduce((total, item) => total + item.quantity, 0);

  const handleCartClick = () => {
    router.push(user ? "/cart" : "/auth");
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    cartStore.clearCart();
    router.push("/");
    setMobileOpen(false);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white shadow-[0_6px_24px_rgba(24,24,27,0.06)]">
      <div className="bg-[#a83200] text-white">
        <div className="mm-container flex h-7 items-center justify-between gap-4 text-[11px] sm:text-xs">
          <p className="flex min-w-0 items-center gap-2 font-semibold"><Gift className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Freeship toàn quốc cho đơn từ 500.000₫</span></p>
          <div className="hidden items-center gap-5 sm:flex"><Link href="/news" className="hover:text-orange-100">Tin khuyến mãi</Link><Link href="/contact" className="hover:text-orange-100">Hỗ trợ khách hàng</Link><span className="font-bold">{storeContact.phone}</span></div>
        </div>
      </div>

      <header>
        <div className="mm-container flex h-16 items-center gap-4 lg:gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="MegaMart - Trang chủ">
            <LogoMark className="h-9 w-9" />
            <span className="text-2xl font-black tracking-tight text-[#ff4d00]">MegaMart</span>
          </Link>

          <SearchBox
            formClassName="mx-auto hidden w-full max-w-xl flex-1 md:flex"
            inputClassName="h-11 rounded-full border-zinc-300 bg-zinc-50 pl-5 pr-12 focus-visible:border-[#ff4d00] focus-visible:ring-[#ff4d00]/20"
            submitVariant="icon"
          />

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="relative rounded-full text-zinc-700 hover:bg-orange-50 hover:text-[#c53b00] md:hidden" onClick={() => setMobileSearchOpen((open) => !open)} aria-label="Tìm kiếm"><Search className="h-5 w-5" /></Button>
            <Link href="/wishlist" className="relative grid h-10 w-10 place-items-center rounded-full text-zinc-700 hover:bg-orange-50 hover:text-[#c53b00]" aria-label="Sản phẩm yêu thích"><Heart className="h-5 w-5" /><CountBadge count={wishlist.items.length} mounted={mounted} /></Link>
            <NotificationBell />
            <button type="button" onClick={handleCartClick} className="relative flex h-10 items-center gap-2 rounded-lg px-2 text-zinc-800 hover:bg-orange-50 hover:text-[#c53b00] sm:px-3" aria-label="Giỏ hàng"><ShoppingCart className="h-5 w-5" /><span className="hidden text-xs font-bold xl:block">Giỏ hàng</span><CountBadge count={cartCount} mounted={mounted} /></button>

            <div className="hidden lg:block">
              {!mounted ? (
                <div className="flex h-10 items-center gap-2 rounded-lg px-3 bg-zinc-100 animate-pulse">
                  <div className="h-7 w-7 rounded-full bg-zinc-200" />
                  <div className="h-3 w-16 rounded bg-zinc-200" />
                </div>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 gap-2 rounded-lg px-2 hover:bg-orange-50"><span className="grid h-8 w-8 place-items-center rounded-full bg-orange-100 text-sm font-black text-[#c53b00]">{user.name?.charAt(0)?.toUpperCase() || "U"}</span><span className="max-w-24 truncate text-xs font-bold text-zinc-800">{user.name}</span><ChevronDown className="h-3.5 w-3.5 text-zinc-500" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-zinc-200 p-2">
                    <DropdownMenuLabel><span className="block text-sm font-bold">{user.name}</span><span className="block truncate text-xs font-normal text-zinc-500">{user.email}</span></DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {user.role === "ADMIN" && <DropdownMenuItem onClick={() => router.push("/admin")}><SlidersHorizontal className="mr-2 h-4 w-4" />Trang quản trị</DropdownMenuItem>}
                    {(user.role === "SHIPPER" || user.role === "ADMIN") && <DropdownMenuItem onClick={() => router.push("/shipper")}><Truck className="mr-2 h-4 w-4" />Cổng giao hàng</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => router.push("/profile")}><CircleUserRound className="mr-2 h-4 w-4" />Hồ sơ cá nhân</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/profile/orders")}><PackageSearch className="mr-2 h-4 w-4" />Đơn hàng của tôi</DropdownMenuItem>
                    {user.role === "SUPPLIER" && <DropdownMenuItem onClick={() => router.push("/supplier")}><Store className="mr-2 h-4 w-4" />Cổng nhà cung cấp</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => router.push("/compare")}><SlidersHorizontal className="mr-2 h-4 w-4" />So sánh sản phẩm</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600"><LogOut className="mr-2 h-4 w-4" />Đăng xuất</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : <Button onClick={() => router.push("/auth")} className="h-10 bg-[#ff4d00] px-4 font-bold text-white hover:bg-[#d94100]"><LogIn className="mr-2 h-4 w-4" />Đăng nhập</Button>}
            </div>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="outline" size="icon" className="rounded-lg border-zinc-300 lg:hidden" aria-label="Mở menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="right" className="w-[320px] border-zinc-200 bg-white p-0">
                <SheetHeader className="border-b border-zinc-200 p-5 text-left"><SheetTitle className="flex items-center gap-2.5 text-zinc-900"><LogoMark className="h-9 w-9" />MegaMart VN</SheetTitle></SheetHeader>
                <div className="space-y-5 p-5">
                  {!mounted ? (
                    <div className="flex items-center gap-3 rounded-xl bg-zinc-100 p-4 animate-pulse">
                      <div className="h-11 w-11 rounded-full bg-zinc-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3.5 w-24 rounded bg-zinc-200" />
                        <div className="h-2.5 w-36 rounded bg-zinc-200" />
                      </div>
                    </div>
                  ) : user ? <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#ff4d00] font-black text-white">{user.name?.charAt(0)?.toUpperCase() || "U"}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-zinc-900">{user.name}</p><p className="truncate text-xs text-zinc-500">{user.email}</p></div></div> : <Button className="w-full bg-[#ff4d00] font-bold text-white hover:bg-[#d94100]" onClick={() => router.push("/auth")}><LogIn className="mr-2 h-4 w-4" />Đăng nhập / Đăng ký</Button>}
                  <div className="space-y-1">
                    {mobileLinks.map((item) => <SheetClose asChild key={item.href}><Link href={item.href} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-[#c53b00]"><item.icon className="h-5 w-5" />{item.label}{item.href === "/wishlist" && wishlist.items.length > 0 && <Badge className="ml-auto bg-orange-100 text-[#c53b00]">{wishlist.items.length}</Badge>}{item.href === "/compare" && compare.items.length > 0 && <Badge className="ml-auto bg-orange-100 text-[#c53b00]">{compare.items.length}</Badge>}</Link></SheetClose>)}
                    {user && <>{user.role === "ADMIN" && <SheetClose asChild><Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-[#c53b00]"><SlidersHorizontal className="h-5 w-5" />Trang quản trị</Link></SheetClose>}{(user.role === "SHIPPER" || user.role === "ADMIN") && <SheetClose asChild><Link href="/shipper" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-[#c53b00]"><Truck className="h-5 w-5" />Cổng giao hàng</Link></SheetClose>}<SheetClose asChild><Link href="/profile" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-zinc-700 hover:bg-orange-50 hover:text-[#c53b00]"><UserRound className="h-5 w-5" />Tài khoản của tôi</Link></SheetClose></>}
                  </div>
                  <div className="border-t border-zinc-200 pt-5"><button type="button" onClick={handleCartClick} className="flex w-full items-center justify-between rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white"><span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Xem giỏ hàng</span><span>{cartCount}</span></button>{user && <Button variant="ghost" className="mt-2 w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Đăng xuất</Button>}</div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

          {mobileSearchOpen && <div className="border-t border-zinc-200 px-4 py-3 md:hidden"><SearchBox formClassName="mx-auto flex max-w-2xl" inputClassName="h-10 rounded-l-full border-zinc-300 pl-5" submitVariant="bar" autoFocus onNavigate={() => setMobileSearchOpen(false)} /></div>}
      </header>
    </div>
  );
}
