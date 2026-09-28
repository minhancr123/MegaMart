"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Logo";
import { useAuthStore } from "@/store/authStore";
import { LogOut, Store } from "lucide-react";

export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen bg-muted/30 dark:bg-zinc-950">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/supplier" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="leading-tight">
              <span className="block text-base font-black tracking-tight text-primary">
                MegaMart <span className="text-foreground">· NCC</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Cổng nhà cung cấp
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-44 truncate text-xs font-semibold text-muted-foreground sm:block">
              {user?.name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <Store className="mr-1.5 h-4 w-4" /> Về shop
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1.5 h-4 w-4" /> Đăng xuất
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
