import { Fragment } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Chính sách bảo mật | MegaMart",
    description: "Chính sách bảo mật thông tin khách hàng tại MegaMart.",
};

export default function PolicyPage() {
    return (
        <div className="mm-container py-12 px-4">
            <h1 className="mm-page-title mb-8 text-center">Chính sách &amp; Quy định</h1>

            <div className="mx-auto max-w-3xl space-y-8">
                {([
                    {
                        title: "1. Chính sách bảo mật thông tin",
                        body: "MegaMart cam kết bảo mật tuyệt đối thông tin cá nhân của khách hàng theo chính sách bảo vệ thông tin cá nhân của MegaMart. Việc thu thập và sử dụng thông tin của mỗi khách hàng chỉ được thực hiện khi có sự đồng ý của khách hàng đó trừ những trường hợp pháp luật có quy định khác.",
                        highlight: null,
                    },
                    {
                        title: "2. Chính sách đổi trả hàng",
                        body: "Khách hàng có quyền đổi trả hàng trong vòng {hl} kể từ ngày nhận hàng nếu sản phẩm bị lỗi do nhà sản xuất. Sản phẩm đổi trả phải còn nguyên vẹn, đầy đủ phụ kiện và hóa đơn mua hàng.",
                        highlight: "30 ngày",
                    },
                    {
                        title: "3. Chính sách vận chuyển",
                        body: "MegaMart hỗ trợ giao hàng toàn quốc. Miễn phí vận chuyển cho đơn hàng từ {hl}. Thời gian giao hàng dự kiến từ 1–3 ngày làm việc đối với khu vực nội thành và 3–5 ngày đối với khu vực ngoại thành.",
                        highlight: "500.000đ",
                    },
                    {
                        title: "4. Chính sách bảo hành",
                        body: "Tất cả sản phẩm bán ra tại MegaMart đều được bảo hành chính hãng theo quy định của nhà sản xuất. Khách hàng có thể mang sản phẩm đến các trung tâm bảo hành ủy quyền hoặc gửi về MegaMart để được hỗ trợ.",
                        highlight: null,
                    },
                ] as { title: string; body: string; highlight: string | null }[]).map(({ title, body, highlight }) => (
                    <section key={title} className="mm-surface rounded-xl border p-6 sm:p-8">
                        <h2 className="mb-3 text-xl font-bold text-foreground">{title}</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            {highlight
                                ? body.split("{hl}").map((part, i, arr) =>
                                    i < arr.length - 1
                                        ? <Fragment key={i}>{part}<strong className="text-foreground">{highlight}</strong></Fragment>
                                        : part
                                  )
                                : body}
                        </p>
                    </section>
                ))}
            </div>
        </div>
    );
}
