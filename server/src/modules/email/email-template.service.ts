import { Injectable } from "@nestjs/common";

/**
 * Dựng HTML email thương hiệu MegaMart.
 * Quy tắc tương thích email client: table layout, toàn bộ CSS inline,
 * font stack hệ thống, chiều rộng tối đa 600px.
 */
@Injectable()
export class EmailTemplateService {
  private readonly brand = "#c53b00";
  private readonly brandDark = "#9a2e00";
  private readonly ink = "#1f2937";
  private readonly muted = "#6b7280";
  private readonly line = "#f3e2d3";

  private money(n: any): string {
    const v = Number(n || 0);
    if (!Number.isFinite(v)) return "0₫";
    return (
      new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(v) +
      "₫"
    );
  }

  private date(d: any): string {
    if (!d) return "";
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString("vi-VN");
  }

  private escape(s: any): string {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Địa chỉ giao hàng gọn từ shippingAddress (object, chuỗi JSON hoặc text). */
  private addressOf(order: any): string {
    let a = order?.shippingAddress;
    if (typeof a === "string") {
      const raw = a.trim();
      if (!raw) return "";
      try {
        a = JSON.parse(raw);
        if (typeof a === "string") return this.escape(a.trim());
      } catch {
        return this.escape(raw);
      }
    }
    if (!a || typeof a !== "object") return "";
    const parts = [a.address, a.ward, a.district, a.province].filter(Boolean);
    const name = this.cleanName(a.fullName);
    const addr = parts.map((p: any) => this.escape(p)).join(", ");
    const main = [name, addr].filter(Boolean).join(" &mdash; ");
    const phone = a.phone ? `${this.escape(a.phone)}` : "";
    if (main && phone) return `${main} &bull; ${phone}`;
    return main || phone;
  }

  /** Xưng hô: "Quý khách <Tên>" hoặc gọn "Quý khách". */
  private greet(order: any): string {
    const addr =
      typeof order?.shippingAddress === "string"
        ? (() => {
            try {
              return JSON.parse(order.shippingAddress);
            } catch {
              return null;
            }
          })()
        : order?.shippingAddress;
    const name = this.cleanName(
      order?.user?.name || (typeof addr === "object" ? addr?.fullName : null) || "",
    );
    return name ? `Quý khách ${this.escape(name)}` : "Quý khách";
  }

  /** Tên người nhận cho template voucher/promotion (tránh "Quý khách Quý khách"). */
  private dear(user: any): string {
    const name = this.cleanName(user?.name || "");
    return name ? `Quý khách ${this.escape(name)}` : "Quý khách";
  }

  /** Tên phương thức thanh toán chuẩn tiếng Việt (đồng bộ với client). */
  private providerName(provider?: string | null): string {
    if (!provider) return "Đã thanh toán";
    const names: Record<string, string> = {
      COD: "COD (Thanh toán khi nhận hàng)",
      OTHER: "COD (Thanh toán khi nhận hàng)",
      BANK_TRANSFER: "Chuyển khoản ngân hàng",
      SEPAY: "Chuyển khoản ngân hàng (SePay)",
      VNPAY: "VNPay",
      MOMO: "MoMo",
      STRIPE: "Thẻ quốc tế",
      WALLET: "Ví MegaMart",
    };
    return names[String(provider).toUpperCase()] || String(provider);
  }

  /** Khung chung: header brand + nội dung + footer. */
  layout(title: string, bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#faf7f4;font-family:Helvetica,Arial,'Segoe UI',sans-serif;color:${this.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf7f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #f0e4d7;">
        <tr>
          <td style="background-color:${this.brand};padding:22px 28px 18px;text-align:left;">
            <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">MegaMart</div>
            <div style="font-size:12px;color:#ffe7d6;margin-top:2px;">Điện máy chính hãng &mdash; Tận tâm trong từng đơn hàng</div>
          </td>
        </tr>
        <tr>
          <td style="background-color:${this.brandDark};height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <div style="font-size:18px;font-weight:700;margin-bottom:12px;">${title}</div>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:#faf7f4;padding:18px 28px;border-top:1px solid ${this.line};">
            <div style="font-size:12px;color:${this.muted};line-height:1.7;">
              Hotline: <strong>1900 1234</strong> (8:00 &ndash; 21:00 hằng ngày)<br>
              Email hỗ trợ: <strong>contact@megamart.com</strong><br>
              <span style="font-size:11px;">Thư này được gửi tự động từ hệ thống MegaMart. Quý khách vui lòng không trả lời thư này.</span>
            </div>
          </td>
        </tr>
      </table>
      <div style="font-size:11px;color:${this.muted};margin-top:12px;">&copy; MegaMart. Trân trọng cảm ơn Quý khách đã tin tưởng và đồng hành.</div>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private ctaButton(url: string, text: string): string {
    return `<div style="margin:20px 0 6px;">
      <a href="${url}" style="display:inline-block;background-color:${this.brand};color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;">${text}</a>
    </div>`;
  }

  private mutedText(text: string): string {
    return `<div style="font-size:13px;color:${this.muted};line-height:1.7;">${text}</div>`;
  }

  /** Thanh 4 bước hành trình đơn hàng, bước hiện tại tô cam. */
  private journey(current: number, paid = true): string {
    const steps = ["Đặt hàng", "Thanh toán", "Đang giao", "Nhận hàng"];
    const cells = steps
      .map((label, i) => {
        // Đơn COD chưa trả: bước "Thanh toán" chưa xong thì không tích xanh.
        const done = i === 1 && !paid ? false : i < current;
        const active = i === current;
        const dotBg = done ? "#16a34a" : active ? this.brand : "#e5e7eb";
        const dotColor = done || active ? "#ffffff" : this.muted;
        const labelColor = active ? this.brandDark : done ? this.ink : this.muted;
        return `<td align="center" style="width:25%;vertical-align:top;">
          <div style="width:26px;height:26px;border-radius:50%;background-color:${dotBg};color:${dotColor};font-size:13px;font-weight:800;line-height:26px;margin:0 auto;">${done ? "&#10003;" : i + 1}</div>
          <div style="font-size:11px;font-weight:${active || done ? 700 : 400};color:${labelColor};margin-top:5px;">${label}</div>
        </td>`;
      })
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 6px;"><tr>${cells}</tr></table>`;
  }

  /** Hộp thông tin đơn gọn. Dòng full (vd địa chỉ dài) tràn full-width căn trái. */
  private orderMetaBox(
    rows: Array<{ label: string; value: string; full?: boolean }>,
  ): string {
    const body = rows
      .map(({ label, value, full }) =>
        full
          ? `<tr><td colspan="2" style="font-size:13px;padding:4px 0;"><span style="color:${this.muted};">${label}: </span><span style="font-weight:600;">${value}</span></td></tr>`
          : `<tr><td style="font-size:13px;color:${this.muted};padding:4px 0;white-space:nowrap;">${label}</td><td align="right" style="font-size:13px;font-weight:600;padding:4px 0;">${value}</td></tr>`,
      )
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf7f4;border:1px solid ${this.line};border-radius:10px;margin:14px 0;"><tr><td style="padding:8px 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr></table>`;
  }

  private row(label: string, value: string, bold = false): string {
    return `<tr>
      <td style="font-size:14px;color:${this.muted};padding:5px 0;">${label}</td>
      <td align="right" style="font-size:14px;color:${this.ink};font-weight:${bold ? 800 : 500};padding:5px 0;">${value}</td>
    </tr>`;
  }

  /** Hóa đơn / biên lai thanh toán đơn hàng. */
  invoice(
    order: any,
    opts: { orderUrl: string; receipt?: boolean },
  ): {
    subject: string;
    html: string;
  } {
    const items = (order.items || [])
      .map((it: any, i: number) => {
        const name = this.escape(
          it.variant?.product?.name || it.name || `Sản phẩm ${i + 1}`,
        );
        const sku = it.variant?.sku
          ? ` <span style="color:${this.muted};">(${this.escape(it.variant.sku)})</span>`
          : "";
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        const img = it.variant?.product?.images?.[0]?.url || it.imageUrl || "";
        const thumb = img
          ? `<img src="${img}" alt="" width="56" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #f0e4d7;">`
          : `<span style="display:inline-block;width:56px;height:56px;border-radius:8px;background-color:#f3f4f6;color:${this.muted};font-size:20px;text-align:center;line-height:56px;">&#9673;</span>`;
        return `<tr>
        <td style="font-size:14px;padding:9px 0;border-bottom:1px solid #f3f4f6;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;vertical-align:top;">${thumb}</td>
            <td style="vertical-align:top;">${name}${sku}<div style="font-size:12px;color:${this.muted};">Số lượng: ${qty}</div></td>
          </tr></table>
        </td>
        <td align="right" style="font-size:14px;font-weight:700;padding:9px 0;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${this.money(price * qty)}</td>
      </tr>`;
      })
      .join("");

    const paid = (order.payments || []).find(
      (p: any) => String(p.status) === "PAID",
    );
    const paidAt = paid?.updatedAt || paid?.createdAt || order.updatedAt;
    const method = this.escape(this.providerName(paid?.provider));

    const title = opts.receipt
      ? `Biên lai thanh toán đơn hàng <span style="color:${this.brand};">#${this.escape(order.code)}</span>`
      : `Hóa đơn thanh toán đơn hàng <span style="color:${this.brand};">#${this.escape(order.code)}</span>`;

    const body = `
      <p style="font-size:14px;line-height:1.7;">Kính chào <strong>${this.greet(order)}</strong>,</p>
      <p style="font-size:14px;line-height:1.7;">MegaMart trân trọng xác nhận đã nhận được khoản thanh toán <strong>${this.money(order.total)}</strong> cho đơn hàng <strong>#${this.escape(order.code)}</strong> vào lúc ${this.date(paidAt)} qua phương thức ${method}. Đơn hàng của Quý khách đang được chuẩn bị chu đáo và sẽ sớm được bàn giao cho đơn vị vận chuyển.</p>
      ${this.orderMetaBox([
        { label: "Mã đơn hàng", value: `#${this.escape(order.code)}` },
        { label: "Ngày đặt", value: this.date(order.createdAt) },
        { label: "Phương thức", value: method },
        ...(this.addressOf(order) ? [{ label: "Giao tới", value: this.addressOf(order), full: true }] : []),
      ])}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;">${items}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${this.row("Tạm tính", this.money(order.subtotal ?? order.total))}
        ${Number(order.discountAmount || 0) > 0 ? this.row("Giảm giá voucher", "−" + this.money(order.discountAmount)) : ""}
        ${this.row("Phí vận chuyển", Number(order.shippingFee || 0) > 0 ? this.money(order.shippingFee) : "Miễn phí")}
        ${Number(order.vatAmount || 0) > 0 ? this.row("Thuế VAT", this.money(order.vatAmount)) : ""}
        ${this.row("Tổng thanh toán", this.money(order.total), true)}
      </table>
      ${this.ctaButton(opts.orderUrl, "Theo dõi đơn hàng")}
      ${this.mutedText("Trân trọng cảm ơn Quý khách đã tin tưởng và lựa chọn MegaMart. Mọi thắc mắc, Quý khách vui lòng liên hệ hotline 1900 1234 để được hỗ trợ.")}`;

    return {
      subject: opts.receipt
        ? `[MegaMart] Biên lai đơn hàng #${order.code}`
        : `[MegaMart] Hóa đơn thanh toán đơn hàng #${order.code}`,
      html: this.layout(title, body),
    };
  }

  /** Nhắc thanh toán khi đơn sắp hết thời gian giữ. */
  paymentReminder(
    order: any,
    minutesLeft: number,
    payUrl: string,
  ): { subject: string; html: string } {
    const title = `Đơn hàng <span style="color:${this.brand};">#${this.escape(order.code)}</span> sắp hết thời gian giữ`;
    const body = `
      <p style="font-size:14px;line-height:1.7;">Kính chào <strong>${this.greet(order)}</strong>,</p>
      <p style="font-size:14px;line-height:1.7;">Đơn hàng <strong>#${this.escape(order.code)}</strong> trị giá <strong>${this.money(order.total)}</strong> sẽ <strong>tự động hủy sau khoảng ${minutesLeft} phút</strong> nữa nếu Quý khách chưa hoàn tất thanh toán. Kính mong Quý khách sớm hoàn tất thanh toán để giữ lại sản phẩm cùng các ưu đãi đã áp dụng.</p>
      ${this.ctaButton(payUrl, "Thanh toán ngay")}
      ${this.mutedText("Trường hợp Quý khách đã thanh toán, xin vui lòng bỏ qua thư này — hệ thống cần vài phút để đối soát giao dịch.")}`;
    return {
      subject: `[MegaMart] Nhắc thanh toán đơn #${order.code} (còn ~${minutesLeft} phút)`,
      html: this.layout(title, body),
    };
  }

  /** Đơn đã thanh toán chưa (để vẽ bước "Thanh toán" đúng với đơn COD). */
  private isOrderPaid(order: any): boolean {
    if (["PAID", "COMPLETED", "DELIVERED"].includes(String(order?.status))) return true;
    return (order?.payments || []).some(
      (p: any) => ["PAID", "SUCCESS"].includes(String(p.status)),
    );
  }

  /** Tên xưng hô sạch: trim, bỏ tiền tố trùng ("Quý khách Quý khách"). */
  private cleanName(raw: any): string {
    const name = String(raw ?? "").trim().replace(/^quý khách\s+/i, "").trim();
    return name;
  }

  /** Đơn đã bàn giao vận chuyển: mã vận đơn + hành trình + link theo dõi. */
  shipmentShipped(
    order: any,
    opts: { trackingCode?: string | null; expectedDate?: any; trackUrl: string },
  ): { subject: string; html: string } {
    const code = opts.trackingCode || order.shippingOrderCode || "";
    const title = `Đơn hàng <span style="color:${this.brand};">#${this.escape(order.code)}</span> đang trên đường giao tới Quý khách`;
    const body = `
      <p style="font-size:14px;line-height:1.7;">Kính chào <strong>${this.greet(order)}</strong>,</p>
      <p style="font-size:14px;line-height:1.7;">Tin vui! Đơn hàng <strong>#${this.escape(order.code)}</strong> trị giá <strong>${this.money(order.total)}</strong> đã được bàn giao cho đơn vị vận chuyển và đang trên đường đến với Quý khách.</p>
      ${this.journey(2, this.isOrderPaid(order))}
      ${code ? `<div style="margin:16px 0;border:2px dashed ${this.brand};border-radius:10px;padding:16px;text-align:center;background-color:#fff7f2;">
        <div style="font-size:12px;color:${this.muted};">MÃ VẬN ĐƠN CỦA QUÝ KHÁCH</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:2px;color:${this.brandDark};margin:6px 0;">${this.escape(code)}</div>
        ${opts.expectedDate ? `<div style="font-size:13px;">Dự kiến giao: <strong>${this.date(opts.expectedDate)}</strong></div>` : ""}
      </div>` : ""}
      ${this.orderMetaBox([
        { label: "Mã đơn hàng", value: `#${this.escape(order.code)}` },
        ...(this.addressOf(order) ? [{ label: "Giao tới", value: this.addressOf(order), full: true }] : []),
      ])}
      ${this.ctaButton(opts.trackUrl, "Theo dõi hành trình")}
      ${this.mutedText("Quý khách vui lòng giữ điện thoại thông suốt để shipper liên hệ khi giao hàng. Trân trọng cảm ơn Quý khách đã tin tưởng MegaMart.")}`;
    return {
      subject: `[MegaMart] Đơn #${order.code} đang giao tới bạn 📦`,
      html: this.layout(title, body),
    };
  }

  /** Giao hàng thất bại / cần hẹn lại. */
  shipmentFailed(
    order: any,
    reason?: string,
  ): { subject: string; html: string } {
    const title = `Giao hàng đơn <span style="color:${this.brand};">#${this.escape(order.code)}</span> chưa thành công`;
    const body = `
      <p style="font-size:14px;line-height:1.7;">Kính chào <strong>${this.greet(order)}</strong>,</p>
      <p style="font-size:14px;line-height:1.7;">MegaMart rất tiếc phải thông báo: đơn hàng <strong>#${this.escape(order.code)}</strong> chưa thể giao thành công${reason ? ` với lý do: <strong>${this.escape(reason)}</strong>` : ""}. Đơn hàng của Quý khách sẽ được giao lại trong thời gian sớm nhất.</p>
      ${this.orderMetaBox([
        { label: "Mã đơn hàng", value: `#${this.escape(order.code)}` },
        ...(this.addressOf(order) ? [{ label: "Giao tới", value: this.addressOf(order), full: true }] : []),
      ])}
      <p style="font-size:14px;line-height:1.7;">Để được hỗ trợ nhanh nhất, Quý khách vui lòng liên hệ hotline <strong>1900 1234</strong> (8:00 &ndash; 21:00 hằng ngày) hoặc trả lời trực tiếp cho shipper khi được liên hệ.</p>
      ${this.mutedText("MegaMart chân thành xin lỗi Quý khách vì sự bất tiện này.")}`;
    return {
      subject: `[MegaMart] Giao đơn #${order.code} chưa thành công, sẽ giao lại sớm`,
      html: this.layout(title, body),
    };
  }

  /** Tặng voucher cá nhân. */
  voucher(
    user: any,
    voucher: any,
    message?: string,
  ): { subject: string; html: string } {
    const voucherKind = String(voucher.type).toUpperCase();
    const valueText =
      voucherKind === "PERCENT"
        ? `Giảm ${voucher.value}%`
        : voucherKind === "FREESHIP"
          ? "Miễn phí vận chuyển"
          : this.money(voucher.value);
    const title = `Quà tặng tri ân dành riêng cho <span style="color:${this.brand};">${this.dear(user)}</span>`;
    const body = `
      <p style="font-size:14px;line-height:1.7;">${message ? this.escape(message) : "Nhân dịp tri ân khách hàng thân thiết, MegaMart trân trọng gửi tặng Quý khách ưu đãi đặc biệt dưới đây. Kính mời Quý khách áp dụng khi thanh toán tại giỏ hàng."}</p>
      <div style="margin:18px 0;border:2px dashed ${this.brand};border-radius:10px;padding:18px;text-align:center;background-color:#fff7f2;">
        <div style="font-size:13px;color:${this.muted};">MÃ VOUCHER CỦA BẠN</div>
        <div style="font-size:28px;font-weight:800;letter-spacing:3px;color:${this.brandDark};margin:6px 0;">${this.escape(voucher.code)}</div>
        <div style="font-size:14px;font-weight:700;">${this.escape(valueText)}</div>
        <div style="font-size:12px;color:${this.muted};margin-top:6px;">
          ${Number(voucher.minOrderValue || 0) > 0 ? `Đơn tối thiểu ${this.money(voucher.minOrderValue)} &bull; ` : ""}
          ${voucher.endDate ? `Hạn dùng: ${this.date(voucher.endDate)}` : "Không giới hạn thời gian"}
        </div>
      </div>
      ${this.ctaButton(`${process.env.FRONTEND_URL || "http://localhost:3000"}/cart`, "Sử dụng ngay")}
      ${this.mutedText("Mỗi voucher chỉ áp dụng một (01) lần cho một (01) tài khoản.")}`;
    return {
      subject: `[MegaMart] Tặng bạn voucher ${valueText} 🎁`,
      html: this.layout(title, body),
    };
  }

  /** Thư khuyến mãi / ưu đãi đặc biệt. */
  promotion(
    user: any,
    opts: {
      title: string;
      content: string;
      ctaText?: string;
      ctaUrl?: string;
      bannerUrl?: string;
    },
  ): { subject: string; html: string } {
    const body = `
      ${opts.bannerUrl ? `<img src="${opts.bannerUrl}" alt="" style="width:100%;border-radius:10px;margin-bottom:14px;">` : ""}
      <p style="font-size:14px;line-height:1.8;">Kính chào <strong>${this.dear(user)}</strong>,</p>
      <div style="font-size:14px;line-height:1.8;">${opts.content}</div>
      ${opts.ctaUrl ? this.ctaButton(opts.ctaUrl, opts.ctaText || "Xem ngay") : ""}
      ${this.mutedText("Quý khách nhận được thư này vì đã đăng ký nhận tin khuyến mãi từ MegaMart. Trân trọng cảm ơn Quý khách đã đồng hành cùng chúng tôi.")}`;
    return {
      subject: `[MegaMart] ${opts.title}`,
      html: this.layout(this.escape(opts.title), body),
    };
  }
}
