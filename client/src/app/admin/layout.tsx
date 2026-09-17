"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  Activity, Bot, FileText, FolderTree, Gift, History, Image as ImageIcon,
  LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, ShoppingCart,
  Tag, Users, Warehouse, Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";

type NavItem = {
  title: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const mainItems: NavItem[] = [
  { title: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { title: "Sản phẩm", href: "/admin/products", icon: Package },
  { title: "Danh mục", href: "/admin/categories", icon: FolderTree },
  { title: "Đơn hàng", href: "/admin/orders", icon: ShoppingCart },
  { title: "Người dùng", href: "/admin/users", icon: Users },
  { title: "Kho hàng", href: "/admin/inventory", icon: Warehouse },
  { title: "Khuyến mãi", href: "/admin/sales", icon: Tag },
  { title: "Flash Sales", href: "/admin/flash-sales", icon: Zap },
  { title: "Loyalty AI", href: "/admin/loyalty-nurture", icon: Gift },
  { title: "Voucher AI", href: "/admin/voucher-governance", icon: ShieldCheck },
  { title: "Agent Jobs", href: "/admin/agent-jobs", icon: Bot },
  { title: "Banner", href: "/admin/banners", icon: ImageIcon },
  { title: "Bài viết", href: "/admin/posts", icon: FileText },
  { title: "Phân tích", href: "/admin/analytics", icon: Activity },
  { title: "Nhật ký hệ thống", href: "/admin/audit-logs", icon: History },
];

const settingsItem: NavItem = { title: "Cài đặt", href: "/admin/settings", icon: Settings };

function AdminLogo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 px-1">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#ff4d00] text-lg font-black text-white">M</span>
      <span className="min-w-0">
        <span className="block text-base font-extrabold tracking-tight text-white">MegaMart VN</span>
        <span className="block text-[11px] text-zinc-500">Hệ thống Quản trị</span>
      </span>
    </Link>
  );
}

function Navigation({ pathname, onNavigate, closeOnNavigate }: { pathname: string; onNavigate?: () => void; closeOnNavigate?: boolean }) {
  const isActive = (item: NavItem) => item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
  const renderLink = (item: NavItem) => {
    const active = isActive(item);
    const link = (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${active
          ? "bg-white/[0.08] text-white before:absolute before:inset-y-1 before:left-0 before:w-1 before:rounded-r before:bg-[#ff4d00]"
          : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"}`}
      >
        <item.icon className={`h-[18px] w-[18px] ${active ? "text-[#ff6b00]" : "text-zinc-500"}`} />
        <span>{item.title}</span>
      </Link>
    );

    if (closeOnNavigate) {
      return (
        <SheetClose asChild key={item.href}>
          {link}
        </SheetClose>
      );
    }

    return link;
  };

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">{mainItems.map(renderLink)}</nav>
      <div className="border-t border-white/10 p-3">{renderLink(settingsItem)}</div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasHydrated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const overlaySelector = '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]';
    const releaseStuckPointerLock = () => {
      // Bỏ qua rất sớm khi body không bị khóa để observer toàn cây không tốn query DOM.
      if (document.body.style.pointerEvents !== "none") return;
      // Giữ khóa khi overlay vẫn còn trong DOM, kể cả lúc animation đóng.
      if (!document.querySelector(overlaySelector)) {
        document.body.style.pointerEvents = "";
      }
    };

    releaseStuckPointerLock();
    const observer = new MutationObserver(releaseStuckPointerLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"], childList: true, subtree: true });
    window.addEventListener("focus", releaseStuckPointerLock);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", releaseStuckPointerLock);
      releaseStuckPointerLock();
    };
  }, [pathname]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) router.replace("/auth");
    else if (user.role !== "ADMIN") router.replace("/");
  }, [hasHydrated, router, user]);

  if (!hasHydrated || !user || user.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f8fa]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-[#ff4d00]" />
          <p className="text-sm text-zinc-500">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div data-admin-shell className="min-h-screen bg-[#f7f8fa]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-[#0d0e11] lg:flex">
        <div className="border-b border-white/10 p-5"><AdminLogo /></div>
        <Navigation pathname={pathname} />
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ff4d00]/15 text-sm font-bold text-[#ff8a52]">
              {user.name?.charAt(0)?.toUpperCase() || "A"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.name || "Quản trị viên"}</p>
              <p className="truncate text-[11px] text-zinc-500">Administrator</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-zinc-400 hover:bg-red-500/10 hover:text-red-300">
            <LogOut className="h-4 w-4" /> Đăng xuất
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
        <span className="flex items-center gap-2 text-sm font-extrabold text-zinc-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ff4d00] text-white">M</span>MegaMart VN</span>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Mở menu quản trị"><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="flex w-[280px] flex-col border-0 bg-[#0d0e11] p-0 text-white">
            <SheetHeader className="border-b border-white/10 p-5 text-left">
              <SheetTitle className="sr-only">Điều hướng quản trị</SheetTitle>
              <AdminLogo onNavigate={() => setMobileOpen(false)} />
            </SheetHeader>
            <Navigation pathname={pathname} closeOnNavigate />
            <div className="border-t border-white/10 p-4">
              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-zinc-400 hover:bg-red-500/10 hover:text-red-300">
                <LogOut className="h-4 w-4" /> Đăng xuất
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-h-screen p-4 sm:p-6 lg:ml-[260px] lg:p-8 xl:p-10">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
