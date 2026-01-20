import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chính sách bảo mật | MegaMart",
    description: "Chính sách bảo mật thông tin khách hàng tại MegaMart.",
};

export default function PolicyPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Chính sách & Quy định</h1>

            <div className="prose prose-lg mx-auto text-gray-600 space-y-8">
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Chính sách bảo mật thông tin</h2>
                    <p>
                        MegaMart cam kết bảo mật tuyệt đối thông tin cá nhân của khách hàng theo chính sách bảo vệ thông tin cá nhân của MegaMart.
                        Việc thu thập và sử dụng thông tin của mỗi khách hàng chỉ được thực hiện khi có sự đồng ý của khách hàng đó trừ những trường hợp pháp luật có quy định khác.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Chính sách đổi trả hàng</h2>
                    <p>
                        Khách hàng có quyền đổi trả hàng trong vòng <strong>30 ngày</strong> kể từ ngày nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất.
                        Sản phẩm đổi trả phải còn nguyên vẹn, đầy đủ phụ kiện và hóa đơn mua hàng.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Chính sách vận chuyển</h2>
                    <p>
                        MegaMart hỗ trợ giao hàng toàn quốc. Miễn phí vận chuyển cho đơn hàng từ <strong>500.000đ</strong>.
                        Thời gian giao hàng dự kiến từ 1-3 ngày làm việc đối với khu vực nội thành và 3-5 ngày đối với khu vực ngoại thành.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Chính sách bảo hành</h2>
                    <p>
                        Tất cả sản phẩm bán ra tại MegaMart đều được bảo hành chính hãng theo quy định của nhà sản xuất.
                        Khách hàng có thể mang sản phẩm đến các trung tâm bảo hành ủy quyền hoặc gửi về MegaMart để được hỗ trợ.
                    </p>
                </section>
            </div>
        </div>
    );
}
