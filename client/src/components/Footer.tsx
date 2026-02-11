import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, Send } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoDark } from "@/components/ui/Logo";

export default function Footer() {
  return (
    <footer className="bg-slate-950 dark:bg-black text-white pt-12 sm:pt-16 md:pt-20 pb-6 sm:pb-8 mt-12 sm:mt-16 md:mt-24 border-t border-slate-800 dark:border-gray-900 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12 mb-12 sm:mb-16">
          {/* Company Info */}
          <div className="space-y-6">
            <LogoDark iconSize={32} textSize="text-2xl" />
            <p className="text-slate-300 leading-relaxed">
              Nền tảng mua sắm trực tuyến hàng đầu với hàng ngàn sản phẩm chất lượng, chính hãng và dịch vụ tận tâm.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/50">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-sky-500 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-sky-500/50">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-gradient-to-br hover:from-pink-500 hover:to-purple-600 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/50">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="Youtube" className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-red-600 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/50">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Liên kết nhanh</h4>
            <ul className="space-y-3 text-slate-400">
              <li><Link href="/about" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Về chúng tôi</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Sản phẩm mới</Link></li>
              <li><Link href="/flash-sale" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Khuyến mãi hot</Link></li>
              <li><Link href="/news" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Tin tức công nghệ</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Hỗ trợ khách hàng</h4>
            <ul className="space-y-3 text-slate-400">
              <li><Link href="/contact" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Trung tâm trợ giúp</Link></li>
              <li><Link href="/policy" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Chính sách đổi trả</Link></li>
              <li><Link href="/policy" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Chính sách bảo mật</Link></li>
              <li><Link href="/profile/orders" className="hover:text-white hover:translate-x-1 transition-all inline-flex items-center gap-2"><span className="text-indigo-400">›</span> Theo dõi đơn hàng</Link></li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white">Liên hệ & Đăng ký</h4>
            <div className="text-slate-400 space-y-4 mb-6">
              <p className="flex items-center gap-3 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-indigo-400" />
                </div>
                <span>1900 1234</span>
              </p>
              <p className="flex items-center gap-3 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-indigo-400" />
                </div>
                <span>support@megamart.vn</span>
              </p>
              <p className="flex items-center gap-3 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                </div>
                <span>123 Đường ABC, Quận 1, TP.HCM</span>
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Nhập email của bạn..."
                  className="bg-slate-800/50 border-slate-700 text-white pr-12 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl h-12"
                  aria-label="Email đăng ký nhận tin"
                />
                <Button
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg shadow-lg"
                  aria-label="Đăng ký"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">Đăng ký để nhận thông tin khuyến mãi mới nhất.</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-slate-800 pt-8 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h5 className="text-sm font-semibold text-slate-400 mb-3">Phương thức thanh toán</h5>
              <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                {['VISA', 'MasterCard', 'JCB', 'MOMO', 'ZaloPay'].map((payment) => (
                  <div key={payment} className="bg-slate-800 px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                    {payment}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center md:text-right">
              <h5 className="text-sm font-semibold text-slate-400 mb-3">Vận chuyển</h5>
              <div className="flex gap-3 flex-wrap justify-center md:justify-end">
                {['Giao hàng nhanh', 'Giao hàng tiết kiệm', 'Ninja Van'].map((ship) => (
                  <div key={ship} className="bg-slate-800 px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                    {ship}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
          <p>© 2025 <span className="font-semibold text-indigo-400">MegaMart</span>. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white transition-colors">Điều khoản sử dụng</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Chính sách quyền riêng tư</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
