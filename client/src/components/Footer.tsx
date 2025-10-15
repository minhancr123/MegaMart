 import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue-400">MegaMart</h3>
            <p className="text-gray-300 mb-4">
              Nền tảng mua sắm trực tuyến hàng đầu với hàng ngàn sản phẩm chất lượng.
            </p>
            <div className="flex gap-4">
              <Facebook className="text-xl hover:text-blue-400 cursor-pointer transition-colors" />
              <Twitter className="text-xl hover:text-blue-400 cursor-pointer transition-colors" />
              <Instagram className="text-xl hover:text-blue-400 cursor-pointer transition-colors" />
              <Youtube className="text-xl hover:text-blue-400 cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Về chúng tôi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sản phẩm</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Khuyến mãi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Liên hệ</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Trung tâm trợ giúp</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Chính sách đổi trả</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Bảo mật</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Vận chuyển</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liên hệ</h4>
            <div className="text-gray-300 space-y-2">
              <p>📞 Hotline: 1900 1234</p>
              <p>📧 Email: support@megamart.vn</p>
              <p>📍 Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>© 2025 MegaMart. Tất cả quyền được bảo lưu.</p>
        </div>
      </div>
    </footer>
  );
}
