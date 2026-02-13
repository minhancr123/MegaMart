import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FileText, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Điều khoản sử dụng - MegaMart',
    description: 'Điều khoản và điều kiện sử dụng dịch vụ của MegaMart',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-gray-950">
            <Header />
            <main className="pt-[100px] md:pt-[120px] py-12">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                            Điều khoản sử dụng
                        </h1>
                        <p className="text-slate-600 dark:text-gray-400">
                            Cập nhật lần cuối: 29 tháng 01, 2025
                        </p>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    Bằng việc truy cập và sử dụng website MegaMart, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định dưới đây.
                                </div>
                            </div>
                        </div>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Giới thiệu</h2>
                            <p className="text-slate-600 mb-4">
                                Chào mừng bạn đến với MegaMart. Khi sử dụng dịch vụ của chúng tôi, bạn cam kết đã đọc, hiểu và đồng ý với các điều khoản sử dụng này.
                            </p>
                            <p className="text-slate-600">
                                Chúng tôi có quyền thay đổi, chỉnh sửa, thêm hoặc lược bỏ bất kỳ phần nào trong Điều khoản này vào bất cứ lúc nào.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Tài khoản người dùng</h2>
                            <ul className="space-y-3 text-slate-600">
                                <li>Bạn phải đủ 18 tuổi hoặc có sự đồng ý của cha mẹ/người giám hộ</li>
                                <li>Thông tin đăng ký phải chính xác, đầy đủ và cập nhật</li>
                                <li>Bạn chịu trách nhiệm bảo mật thông tin tài khoản</li>
                                <li>Không được chia sẻ tài khoản cho người khác sử dụng</li>
                                <li>Thông báo ngay cho MegaMart nếu phát hiện hành vi truy cập trái phép</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Quy định giao dịch</h2>
                            <ul className="space-y-3 text-slate-600">
                                <li>Tất cả giao dịch mua bán phải tuân thủ pháp luật Việt Nam</li>
                                <li>Giá sản phẩm có thể thay đổi mà không cần thông báo trước</li>
                                <li>MegaMart có quyền từ chối hoặc hủy đơn hàng trong một số trường hợp</li>
                                <li>Khách hàng cần kiểm tra kỹ thông tin đơn hàng trước khi thanh toán</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Sở hữu trí tuệ</h2>
                            <p className="text-slate-600 mb-4">
                                Tất cả nội dung trên website bao gồm văn bản, hình ảnh, logo, biểu tượng là tài sản của MegaMart và được bảo vệ bởi luật sở hữu trí tuệ.
                            </p>
                            <p className="text-slate-600">
                                Nghiêm cấm mọi hành vi sao chép, phân phối, sử dụng nội dung mà không có sự cho phép của chúng tôi.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Giới hạn trách nhiệm</h2>
                            <ul className="space-y-3 text-slate-600">
                                <li>MegaMart không chịu trách nhiệm về bất kỳ thiệt hại nào phát sinh từ việc sử dụng dịch vụ</li>
                                <li>Chúng tôi không đảm bảo website sẽ hoạt động liên tục, không bị gián đoạn</li>
                                <li>Không chịu trách nhiệm về các liên kết đến website bên thứ ba</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Quyền và nghĩa vụ</h2>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-2">Quyền của người dùng:</h3>
                                    <ul className="space-y-2 text-slate-600">
                                        <li>Được bảo vệ thông tin cá nhân</li>
                                        <li>Được hỗ trợ khi gặp vấn đề</li>
                                        <li>Được quyền khiếu nại, khiếu n ại</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 mb-2">Nghĩa vụ của người dùng:</h3>
                                    <ul className="space-y-2 text-slate-600">
                                        <li>Tuân thủ các điều khoản sử dụng</li>
                                        <li>Không sử dụng dịch vụ cho mục đích bất hợp pháp</li>
                                        <li>Thanh toán đầy đủ, đúng hạn</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Liên hệ</h2>
                            <p className="text-slate-600 mb-4">
                                Nếu bạn có bất kỳ câu hỏi nào về Điều khoản sử dụng, vui lòng liên hệ:
                            </p>
                            <div className="bg-slate-50 rounded-xl p-6">
                                <p className="text-slate-700"><strong>Email:</strong> support@megamart.vn</p>
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
