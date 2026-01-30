import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Shield, Lock, Eye, Database, UserCheck, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Chính sách bảo mật - MegaMart',
    description: 'Chính sách bảo mật thông tin khách hàng tại MegaMart',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white">
            <Header />
            <main className="py-12">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-4">
                            Chính sách bảo mật
                        </h1>
                        <p className="text-slate-600">
                            Cập nhật lần cuối: 29 tháng 01, 2025
                        </p>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
                            <div className="flex gap-3">
                                <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-green-800">
                                    MegaMart cam kết bảo vệ thông tin cá nhân của bạn. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.
                                </div>
                            </div>
                        </div>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Database className="w-6 h-6 text-indigo-600" />
                                1. Thu thập thông tin
                            </h2>
                            <p className="text-slate-600 mb-4">
                                Chúng tôi thu thập các loại thông tin sau:
                            </p>
                            <ul className="space-y-3 text-slate-600">
                                <li><strong>Thông tin cá nhân:</strong> Họ tên, email, số điện thoại, địa chỉ giao hàng</li>
                                <li><strong>Thông tin thanh toán:</strong> Phương thức thanh toán (được mã hóa)</li>
                                <li><strong>Lịch sử mua hàng:</strong> Đơn hàng, sản phẩm đã xem</li>
                                <li><strong>Thông tin kỹ thuật:</strong> IP address, trình duyệt, thiết bị</li>
                                <li><strong>Cookies:</strong> Để cải thiện trải nghiệm người dùng</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Eye className="w-6 h-6 text-purple-600" />
                                2. Sử dụng thông tin
                            </h2>
                            <p className="text-slate-600 mb-4">
                                Thông tin của bạn được sử dụng để:
                            </p>
                            <ul className="space-y-3 text-slate-600">
                                <li>Xử lý đơn hàng và giao hàng</li>
                                <li>Cung cấp dịch vụ khách hàng</li>
                                <li>Gửi thông báo về đơn hàng và khuyến mãi (nếu bạn đồng ý)</li>
                                <li>Cải thiện chất lượng dịch vụ và website</li>
                                <li>Phân tích hành vi người dùng để cá nhân hóa trải nghiệm</li>
                                <li>Phát hiện và ngăn chặn gian lận</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Lock className="w-6 h-6 text-green-600" />
                                3. Bảo vệ thông tin
                            </h2>
                            <p className="text-slate-600 mb-4">
                                Chúng tôi áp dụng các biện pháp bảo mật:
                            </p>
                            <ul className="space-y-3 text-slate-600">
                                <li><strong>Mã hóa SSL/TLS:</strong> Bảo vệ dữ liệu trong quá trình truyền tải</li>
                                <li><strong>Firewall:</strong> Ngăn chặn truy cập trái phép</li>
                                <li><strong>Xác thực hai yếu tố:</strong> Cho các giao dịch quan trọng</li>
                                <li><strong>Đào tạo nhân viên:</strong> Về bảo mật thông tin khách hàng</li>
                                <li><strong>Kiểm tra định kỳ:</strong> Hệ thống bảo mật và rà soát lỗ hổng</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <UserCheck className="w-6 h-6 text-blue-600" />
                                4. Chia sẻ thông tin
                            </h2>
                            <p className="text-slate-600 mb-4">
                                Chúng tôi KHÔNG bán hoặc cho thuê thông tin cá nhân của bạn. Chúng tôi chỉ chia sẻ với:
                            </p>
                            <ul className="space-y-3 text-slate-600">
                                <li><strong>Đối tác vận chuyển:</strong> Để giao hàng cho bạn</li>
                                <li><strong>Cổng thanh toán:</strong> Để xử lý giao dịch (dữ liệu được mã hóa)</li>
                                <li><strong>Cơ quan pháp luật:</strong> Khi có yêu cầu hợp pháp</li>
                                <li><strong>Nhà cung cấp dịch vụ:</strong> Email marketing, phân tích dữ liệu (tuân thủ NDA)</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Quyền của bạn</h2>
                            <p className="text-slate-600 mb-4">
                                Bạn có quyền:
                            </p>
                            <ul className="space-y-3 text-slate-600">
                                <li>Truy cập và xem thông tin cá nhân</li>
                                <li>Yêu cầu sửa đổi thông tin không chính xác</li>
                                <li>Yêu cầu xóa thông tin (trong một số trường hợp)</li>
                                <li>Từ chối nhận email marketing</li>
                                <li>Rút lại sự đồng ý đã cung cấp</li>
                                <li>Khiếu nại về cách chúng tôi xử lý dữ liệu</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Cookies</h2>
                            <p className="text-slate-600 mb-4">
                                Chúng tôi sử dụng cookies để:
                            </p>
                            <ul className="space-y-3 text-slate-600">
                                <li>Ghi nhớ đăng nhập và giỏ hàng</li>
                                <li>Phân tích lượt truy cập website</li>
                                <li>Hiển thị quảng cáo phù hợp</li>
                                <li>Cải thiện hiệu suất website</li>
                            </ul>
                            <p className="text-slate-600 mt-4">
                                Bạn có thể tắt cookies trong cài đặt trình duyệt, nhưng một số tính năng có thể không hoạt động.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Thông tin trẻ em</h2>
                            <p className="text-slate-600">
                                Chúng tôi không cố ý thu thập thông tin từ trẻ em dưới 13 tuổi. Nếu bạn là phụ huynh và phát hiện con mình cung cấp thông tin cho chúng tôi, vui lòng liên hệ để chúng tôi xóa dữ liệu.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                                8. Thay đổi chính sách
                            </h2>
                            <p className="text-slate-600">
                                Chúng tôi có thể cập nhật Chính sách bảo mật theo thời gian. Các thay đổi quan trọng sẽ được thông báo qua email hoặc thông báo trên website.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Liên hệ</h2>
                            <p className="text-slate-600 mb-4">
                                Nếu bạn có câu hỏi về Chính sách bảo mật hoặc muốn thực hiện quyền của mình:
                            </p>
                            <div className="bg-slate-50 rounded-xl p-6">
                                <p className="text-slate-700"><strong>Email:</strong> privacy@megamart.vn</p>
                                <p className="text-slate-700"><strong>Hotline:</strong> 1900 1234</p>
                                <p className="text-slate-700"><strong>Địa chỉ:</strong> 123 Đường ABC, Quận 1, TP.HCM</p>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
