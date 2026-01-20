import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Về chúng tôi | MegaMart",
    description: "Tìm hiểu về MegaMart - Hệ thống bán lẻ công nghệ hàng đầu.",
};

export default function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Về MegaMart</h1>

            <div className="prose prose-lg mx-auto text-gray-600 space-y-6">
                <p>
                    Chào mừng bạn đến với <strong>MegaMart</strong>, điểm đến tin cậy cho mọi nhu cầu công nghệ của bạn.
                    Được thành lập với sứ mệnh mang đến những sản phẩm công nghệ chính hãng, chất lượng cao với mức giá tốt nhất,
                    chúng tôi tự hào là đối tác của các thương hiệu hàng đầu thế giới như Apple, Samsung, Dell, HP, và nhiều hơn nữa.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8">Tầm nhìn của chúng tôi</h2>
                <p>
                    Trở thành hệ thống bán lẻ công nghệ số 1 tại Việt Nam, nơi khách hàng không chỉ mua sắm mà còn được trải nghiệm
                    dịch vụ chăm sóc khách hàng tận tâm và chuyên nghiệp nhất.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8">Tại sao chọn MegaMart?</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Sản phẩm chính hãng:</strong> Cam kết 100% hàng chính hãng, đầy đủ hóa đơn VAT.</li>
                    <li><strong>Giá cả cạnh tranh:</strong> Luôn cập nhật giá tốt nhất thị trường cùng nhiều chương trình khuyến mãi.</li>
                    <li><strong>Dịch vụ chuyên nghiệp:</strong> Đội ngũ tư vấn viên am hiểu công nghệ, hỗ trợ nhiệt tình.</li>
                    <li><strong>Bảo hành uy tín:</strong> Chính sách bảo hành rõ ràng, hỗ trợ kỹ thuật trọn đời.</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-8">Liên hệ</h2>
                <p>
                    Chúng tôi luôn lắng nghe ý kiến đóng góp của khách hàng để không ngừng hoàn thiện.
                    Nếu bạn có bất kỳ thắc mắc nào, đừng ngần ngại liên hệ với chúng tôi qua trang <a href="/contact" className="text-blue-600 hover:underline">Liên hệ</a>.
                </p>
            </div>
        </div>
    );
}
