import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, Send } from 'lucide-react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white">Mega<span className="text-red-500">Mart</span></h3>
            <p className="text-gray-400 leading-relaxed">
              Nền tảng mua sắm trực tuyến hàng đầu với hàng ngàn sản phẩm chất lượng, chính hãng và dịch vụ tận tâm.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-all duration-300">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-400 transition-all duration-300">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition-all duration-300">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-all duration-300">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6 border-b border-gray-800 pb-2 inline-block">Liên kết nhanh</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Về chúng tôi</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Sản phẩm mới</Link></li>
              <li><Link href="/flash-sale" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Khuyến mãi hot</Link></li>
              <li><Link href="/news" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Tin tức công nghệ</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-6 border-b border-gray-800 pb-2 inline-block">Hỗ trợ khách hàng</h4>
            <ul className="space-y-3 text-gray-400">
              <li><Link href="/contact" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Trung tâm trợ giúp</Link></li>
              <li><Link href="/policy" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Chính sách đổi trả</Link></li>
              <li><Link href="/policy" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Chính sách bảo mật</Link></li>
              <li><Link href="/profile/orders" className="hover:text-white transition-colors flex items-center gap-2"><span>›</span> Theo dõi đơn hàng</Link></li>
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-6 border-b border-gray-800 pb-2 inline-block">Liên hệ & Đăng ký</h4>
            <div className="text-gray-400 space-y-4 mb-6">
              <p className="flex items-center gap-3"><Phone className="w-4 h-4 text-red-500" /> 1900 1234</p>
              <p className="flex items-center gap-3"><Mail className="w-4 h-4 text-red-500" /> support@megamart.vn</p>
              <p className="flex items-center gap-3"><MapPin className="w-4 h-4 text-red-500" /> 123 Đường ABC, Quận 1, TP.HCM</p>
            </div>

            <div className="relative">
              <Input
                placeholder="Nhập email của bạn..."
                className="bg-gray-800 border-gray-700 text-white pr-12 focus:ring-red-500 focus:border-red-500 rounded-lg"
              />
              <Button
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-red-600 hover:bg-red-700 rounded-md"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Đăng ký để nhận thông tin khuyến mãi mới nhất.</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
          <p>© 2025 MegaMart. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Điều khoản sử dụng</a>
            <a href="#" className="hover:text-white transition-colors">Chính sách quyền riêng tư</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
