"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useMounted } from "@/hooks/useMounted";

export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const mounted = useMounted();

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Shipper Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/shipper" className="flex items-center gap-2.5 font-black tracking-tight text-[#ff4d00]">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff4d00] text-white shadow-md">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base leading-tight">MegaMart Express</span>
              <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cổng giao hàng Shipper</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{user.name}</span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                  <UserCheck className="h-3 w-3" /> Shipper
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              <LogOut className="h-4 w-4 text-red-500" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
