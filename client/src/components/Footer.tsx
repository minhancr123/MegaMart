import { Facebook, Instagram, Mail, MapPin, Phone, Send, Youtube } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/Logo";

const customerLinks = [
  { href: "/contact", label: "Trung tâm trợ giúp" },
  { href: "/policy", label: "Chính sách mua hàng" },
  { href: "/privacy", label: "Chính sách bảo mật" },
  { href: "/profile/orders", label: "Theo dõi đơn hàng" },
];

const shoppingLinks = [
  { href: "/products", label: "Tất cả sản phẩm" },
  { href: "/products?sort=newest", label: "Sản phẩm mới" },
  { href: "/wishlist", label: "Sản phẩm yêu thích" },
  { href: "/news", label: "Tin tức công nghệ" },
];

interface StoreContact {
  storeName: string;
  phone: string;
  email: string;
  address: string;
}

const FALLBACK_CONTACT: StoreContact = {
  storeName: "MegaMart",
  phone: "1900 6789",
  email: "hotro@megamart.vn",
  address: "128 Nguyễn Gia Trí, Bình Thạnh, TP.HCM",
};

/** Lấy thông tin cửa hàng từ Admin → Cài đặt (cache 5 phút), rớt mạng thì dùng mặc định. */
let contactCache: { at: number; data: StoreContact } | null = null;
let contactInflight: Promise<StoreContact> | null = null;
const CONTACT_TTL_MS = 5 * 60 * 1000;

async function getStoreContact(): Promise<StoreContact> {
  // Cache module-level: trang search là Client Component nên Footer render ở
  // browser mỗi lần re-render — không cache là mỗi render 1 request → dính
  // ThrottlerGuard (3 req/s) rồi spam 429 đầy console.
  if (contactCache && Date.now() - contactCache.at < CONTACT_TTL_MS) {
    return contactCache.data;
  }
  // Nhiều render cùng 1 tick thì gộp chung 1 request đang bay.
  if (!contactInflight) {
    contactInflight = fetchStoreContact().finally(() => {
      contactInflight = null;
    });
  }
  return contactInflight;
}

async function fetchStoreContact(): Promise<StoreContact> {
  const stale = contactCache?.data ?? FALLBACK_CONTACT;
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(`${base}/api/settings`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`settings ${res.status}`);
    const data = await res.json();
    const s = data?.data ?? data;
    if (!s) throw new Error("settings rỗng");
    contactCache = {
      at: Date.now(),
      data: {
        storeName: s.storeName || FALLBACK_CONTACT.storeName,
        phone: s.phone || FALLBACK_CONTACT.phone,
        email: s.email || FALLBACK_CONTACT.email,
        address: s.address || FALLBACK_CONTACT.address,
      },
    };
    return contactCache.data;
  } catch {
    // Thất bại cũng stamp giờ để render sau khỏi fetch dồn (dùng data cũ).
    contactCache = { at: Date.now(), data: stale };
    return stale;
  }
}

export default async function Footer() {
  const contact = await getStoreContact();
  return (
    <footer className="mt-14 overflow-hidden border-t border-zinc-200 bg-white text-zinc-700 sm:mt-16">
      <div className="border-b border-orange-100 bg-orange-50/70">
        <div className="mm-container flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-zinc-900">Nhận ưu đãi điện máy mới nhất</h2>
            <p className="mt-1 text-sm text-zinc-500">Đăng ký email để không bỏ lỡ chương trình giảm giá.</p>
          </div>
          <div className="flex w-full max-w-md">
            <Input aria-label="Email nhận khuyến mãi" placeholder="Email của bạn" className="h-11 rounded-r-none border-orange-200 bg-white focus-visible:ring-orange-500/20" />
            <Button type="button" className="h-11 rounded-l-none bg-[#ff4d00] px-5 font-bold text-white hover:bg-[#d94100]">
              <Send className="mr-2 h-4 w-4" /> Đăng ký
            </Button>
          </div>
        </div>
      </div>

      <div className="mm-container py-10">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.25fr_.8fr_.8fr_1.15fr]">
          <div>
            <Logo iconSize={22} textSize="text-xl" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-zinc-500">
              Hệ thống bán lẻ điện máy chính hãng với dịch vụ giao lắp tận nơi, bảo hành minh bạch và nhiều lựa chọn thanh toán.
            </p>
            <div className="mt-5 flex gap-2">
              {[Facebook, Instagram, Youtube].map((Icon, index) => (
                <a key={index} href="#" aria-label="Mạng xã hội MegaMart" className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 text-zinc-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#c53b00]">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-zinc-900">Mua sắm</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-500">
              {shoppingLinks.map((item) => <li key={item.href}><Link href={item.href} className="hover:text-[#c53b00]">{item.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black text-zinc-900">Hỗ trợ</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-500">
              {customerLinks.map((item) => <li key={item.href}><Link href={item.href} className="hover:text-[#c53b00]">{item.label}</Link></li>)}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black text-zinc-900">Liên hệ {contact.storeName}</h3>
            <div className="mt-4 space-y-3 text-sm text-zinc-500">
              <p className="flex items-center gap-3"><Phone className="h-4 w-4 shrink-0 text-[#d94300]" /><span><strong className="text-zinc-800">{contact.phone}</strong> · 8:00–22:00</span></p>
              <p className="flex items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-[#d94300]" /><span>{contact.email}</span></p>
              <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#d94300]" /><span>{contact.address}</span></p>
            </div>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-5 border-t border-zinc-200 pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {["VISA", "Mastercard", "JCB", "MoMo", "ZaloPay"].map((payment) => (
              <span key={payment} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-black text-zinc-500">{payment}</span>
            ))}
          </div>
          <p className="text-xs text-zinc-400">© 2026 {contact.storeName} VN · Điện máy chính hãng</p>
          <div className="flex gap-4 text-xs text-zinc-500">
            <Link href="/terms" className="hover:text-[#c53b00]">Điều khoản</Link>
            <Link href="/privacy" className="hover:text-[#c53b00]">Quyền riêng tư</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
