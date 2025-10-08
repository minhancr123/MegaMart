"use client";
import { User, ShoppingCart, Menu, Search, LogInIcon } from "lucide-react";
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
export default function Header() {
  const router = useRouter();
  const {user} = useAuthStore();
  const [open, setOpen] = useState(false);
  return (
    <header className="w-full bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-blue-600">
              MegaMart
            </h1>
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-auto" />
                <Input 
                  placeholder="Tìm kiếm sản phẩm..." 
                  className="pl-10 pr-2 rounded-r-none border-r-0 focus:border-r-0"
                />
              </div>
              <Button 
                className="rounded-l-none border-l-0 px-4"
                type="submit"
              >
                Tìm kiếm
              </Button>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
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
             <Button
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => {
                  if (!user) router.push('/auth');
                }}
              >
                {user ? (
                  <>
                <DropdownMenu >
                  <DropdownMenuTrigger
                  >
                    <button className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{user.name}</span>
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                  >
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="h-4 w-4" />
                      <span>Đơn hàng</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>


                  </>
                ) : (
                  <>
                    <LogInIcon className="h-4 w-4" />
                    <span>Đăng nhập/Đăng ký</span>
                  </>
                )}
              </Button>

              <div className="relative">
                <Button variant="ghost" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Giỏ hàng
                </Button>
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
                >
                  0
                </Badge>
              </div>
            </div>

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
                  0
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Tìm kiếm sản phẩm..." 
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
