"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, MapPin, Package, UserRound, Wallet } from "lucide-react";

const items = [
  { href: "/profile", label: "Thông tin tài khoản", icon: UserRound, exact: true },
  { href: "/profile/orders", label: "Đơn hàng của tôi", icon: Package },
  { href: "/profile/wallet", label: "Ví MegaMart", icon: Wallet },
  { href: "/profile/addresses", label: "Sổ địa chỉ", icon: MapPin },
  { href: "/profile/loyalty", label: "Điểm thưởng", icon: Gift },
];

export default function ProfileNav() {
  const pathname = usePathname();

  return (
    <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-3 shadow-sm lg:sticky lg:top-[128px]">
      <div className="border-b border-zinc-100 px-3 pb-3 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#c53b00]">Tài khoản</p>
        <h2 className="mt-1 text-lg font-extrabold text-zinc-900">Trung tâm cá nhân</h2>
      </div>
      <nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${active ? "bg-orange-50 text-[#c53b00]" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
              <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-[#ff4d00]" : "text-zinc-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
