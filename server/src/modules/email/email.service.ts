import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "src/prismaClient/prisma.service";
import { EmailTemplateService } from "./email-template.service";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Dịch vụ gửi mail dùng chung toàn hệ thống (best-effort):
 * lỗi SMTP không bao giờ được làm hỏng nghiệp vụ gọi nó.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any = null;
  private warnedMissingConfig = false;
  private from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly templates: EmailTemplateService,
  ) {
    this.from =
      this.configService.get("SMTP_FROM") ||
      this.configService.get("SMTP_USER") ||
      "";
  }

  private getTransporter(): any | null {
    if (this.transporter) return this.transporter;
    const host = this.configService.get("SMTP_HOST") || process.env.SMTP_HOST;
    const user = this.configService.get("SMTP_USER") || process.env.SMTP_USER;
    const pass = this.configService.get("SMTP_PASS") || process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      if (!this.warnedMissingConfig) {
        this.warnedMissingConfig = true;
        this.logger.warn(
          "Chưa cấu hình SMTP (SMTP_HOST/USER/PASS) — bỏ qua gửi mail.",
        );
      }
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require("nodemailer");
    const port = Number(
      this.configService.get("SMTP_PORT") || process.env.SMTP_PORT || 587,
    );
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: { user, pass },
    });
    return this.transporter;
  }

  isConfigured(): boolean {
    return this.getTransporter() != null;
  }

  async sendMail(input: SendMailInput): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      if (!input.to || !EMAIL_RE.test(String(input.to).trim())) {
        return { success: false, error: "Email người nhận không hợp lệ" };
      }
      const transporter = this.getTransporter();
      if (!transporter) return { success: false, error: "SMTP chưa cấu hình" };
      const info = await transporter.sendMail({
        from: this.from,
        to: String(input.to).trim(),
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { success: true, messageId: info?.messageId };
    } catch (err) {
      const message = (err as Error)?.message || "Gửi mail thất bại";
      this.logger.warn(`sendMail to ${input.to} failed: ${message}`);
      return { success: false, error: message };
    }
  }

  private frontendUrl(): string {
    return (
      this.configService.get("FRONTEND_URL") ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000"
    );
  }

  private async loadOrderForMail(orderId: string): Promise<any | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { include: { images: { take: 1 } } },
              },
            },
          },
        },
        payments: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  private recipientOf(order: any): { email?: string; name?: string } {
    const addr =
      typeof order?.shippingAddress === "string"
        ? null
        : order?.shippingAddress;
    const email =
      order?.user?.email || addr?.email || (addr as any)?.customerEmail;
    const name = order?.user?.name || addr?.fullName;
    return { email, name };
  }

  private mailFlags(order: any): Record<string, any> {
    const meta = order?.shippingMetadata;
    return typeof meta === "object" && meta !== null ? meta : {};
  }

  /**
   * Đã gửi loại mail này cho đơn chưa (chống trùng khi webhook retry).
   * Cờ lưu trong shippingMetadata để không lẫn vào timeline nghiệp vụ;
   * vẫn đọc cả history cũ (INVOICE_SENT...) để tương thích đơn đã gửi trước đây.
   */
  private async alreadySent(orderId: string, reason: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { shippingMetadata: true },
    });
    const flags = this.mailFlags(order);
    if (flags.mailSent?.[reason]) return true;
    const existed = await this.prisma.orderStatusHistory.findFirst({
      where: { orderId, reason },
      select: { id: true },
    });
    return !!existed;
  }

  private async markSent(
    orderId: string,
    _fromStatus: string,
    reason: string,
  ): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { shippingMetadata: true },
      });
      const flags = this.mailFlags(order);
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          shippingMetadata: {
            ...flags,
            mailSent: { ...(flags.mailSent || {}), [reason]: new Date().toISOString() },
          },
        },
      });
    } catch (err) {
      this.logger.warn(`markSent failed: ${(err as Error)?.message}`);
    }
  }

  /** Gửi hóa đơn/biên lai sau khi đơn được thanh toán. Fire-and-forget ở caller. */
  async sendInvoice(
    orderId: string,
    opts: { receipt?: boolean } = {},
  ): Promise<boolean> {
    try {
      const order = await this.loadOrderForMail(orderId);
      if (!order) return false;
      if (await this.alreadySent(orderId, "INVOICE_SENT")) return true;
      const { email } = this.recipientOf(order);
      if (!email || !EMAIL_RE.test(email)) {
        this.logger.warn(`sendInvoice ${order.code}: thiếu email người nhận`);
        return false;
      }
      const tpl = this.templates.invoice(
        {
          ...order,
          total: Number(order.total),
          subtotal: (order.items || []).reduce(
            (s: number, it: any) =>
              s + Number(it.price || 0) * Number(it.quantity || 1),
            0,
          ),
          discountAmount: Number(order.discountAmount || 0),
          shippingFee: Number(order.shippingFee || 0),
          vatAmount: Number(order.vatAmount || 0),
        },
        {
          orderUrl: `${this.frontendUrl()}/profile/orders/${order.id}`,
          receipt: opts.receipt,
        },
      );
      const res = await this.sendMail({ to: email, ...tpl });
      if (res.success)
        await this.markSent(orderId, order.status, "INVOICE_SENT");
      return res.success;
    } catch (err) {
      this.logger.warn(
        `sendInvoice ${orderId} failed: ${(err as Error)?.message}`,
      );
      return false;
    }
  }

  /** Nhắc thanh toán khi đơn sắp hết hạn giữ. Mỗi đơn chỉ nhắc 1 lần. */
  async sendPaymentReminder(orderId: string): Promise<boolean> {
    try {
      const order = await this.loadOrderForMail(orderId);
      if (!order || order.status !== "PENDING") return false;
      if (await this.alreadySent(orderId, "PAYMENT_REMINDER_SENT")) return true;
      const { email } = this.recipientOf(order);
      if (!email || !EMAIL_RE.test(email)) return false;
      const holdMinutes = 30;
      const elapsed = Date.now() - new Date(order.createdAt).getTime();
      const minutesLeft = Math.max(1, Math.ceil(holdMinutes - elapsed / 60000));
      const tpl = this.templates.paymentReminder(
        order,
        minutesLeft,
        `${this.frontendUrl()}/profile/orders/${order.id}`,
      );
      const res = await this.sendMail({ to: email, ...tpl });
      if (res.success)
        await this.markSent(orderId, order.status, "PAYMENT_REMINDER_SENT");
      return res.success;
    } catch (err) {
      this.logger.warn(
        `sendPaymentReminder ${orderId} failed: ${(err as Error)?.message}`,
      );
      return false;
    }
  }

  /** Dựng HTML khuyến mãi (dùng cho broadcast bulk). */
  buildPromotion(
    user: any,
    opts: {
      title: string;
      content: string;
      ctaText?: string;
      ctaUrl?: string;
      bannerUrl?: string;
    },
  ): { subject: string; html: string } {
    return this.templates.promotion(user, opts);
  }

  /**
   * Gửi nội dung HTML tự do nhưng vẫn bọc khung thương hiệu MegaMart.
   * Dùng khi migrate các mail cũ (PO, báo cáo...) sang service chung.
   */
  async sendBranded(
    to: string,
    subject: string,
    title: string,
    bodyHtml: string,
  ): Promise<boolean> {
    const html = this.templates.layout(title, bodyHtml);
    return (await this.sendMail({ to, subject, html })).success;
  }

  /**
   * Mail hành trình vận chuyển: "shipped" khi bàn giao, "failed" khi giao lỗi.
   * Mỗi đơn mỗi loại chỉ gửi 1 lần (dedup qua history).
   */
  async sendShipmentUpdate(
    orderId: string,
    kind: "shipped" | "failed",
    extra: { reason?: string } = {},
  ): Promise<boolean> {
    try {
      const order = await this.loadOrderForMail(orderId);
      if (!order) return false;
      // Giao lại lần 2, 3 với lý do khác vẫn báo khách (dedup theo lý do).
      const reason =
        kind === "shipped"
          ? "SHIPPED_MAIL_SENT"
          : `DELIVERY_FAIL_MAIL_SENT:${(extra.reason || "none").slice(0, 120)}`;
      if (await this.alreadySent(orderId, reason)) return true;
      const { email } = this.recipientOf(order);
      if (!email || !EMAIL_RE.test(email)) {
        this.logger.warn(`sendShipmentUpdate ${order.code}: thiếu email người nhận`);
        return false;
      }
      const tpl =
        kind === "shipped"
          ? this.templates.shipmentShipped(
              { ...order, total: Number(order.total) },
              {
                trackingCode: order.shippingOrderCode,
                expectedDate: order.expectedDeliveryDate,
                trackUrl: `${this.frontendUrl()}/profile/orders/${order.id}`,
              },
            )
          : this.templates.shipmentFailed(
              { ...order, total: Number(order.total) },
              extra.reason,
            );
      const res = await this.sendMail({ to: email, ...tpl });
      if (res.success) await this.markSent(orderId, order.status, reason);
      return res.success;
    } catch (err) {
      this.logger.warn(
        `sendShipmentUpdate ${orderId} failed: ${(err as Error)?.message}`,
      );
      return false;
    }
  }

  /** Gửi mail voucher cho 1 user. */
  async sendVoucher(
    to: string,
    name: string | null | undefined,
    voucher: {
      code: string;
      type: string;
      value: number | string;
      minOrderValue?: number | string | null;
      endDate?: Date | string | null;
    },
    message?: string,
  ): Promise<boolean> {
    const tpl = this.templates.voucher({ name }, voucher, message);
    return (await this.sendMail({ to, ...tpl })).success;
  }

  /** Gửi 1 thư khuyến mãi cho 1 user. */
  async sendPromotion(
    to: string,
    name: string,
    opts: {
      title: string;
      content: string;
      ctaText?: string;
      ctaUrl?: string;
      bannerUrl?: string;
    },
  ): Promise<boolean> {
    const tpl = this.templates.promotion({ name }, opts);
    return (await this.sendMail({ to, ...tpl })).success;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Gửi bulk theo chunk nhỏ + nghỉ giữa chunk để không vượt quota Gmail.
   * Trả về thống kê, không ném lỗi.
   */
  async sendBulk(
    recipients: Array<{ email: string; name?: string }>,
    build: (r: { email: string; name?: string }) => {
      subject: string;
      html: string;
    },
    opts: { chunkSize?: number; delayMs?: number } = {},
  ): Promise<{ total: number; sent: number; failed: number }> {
    const chunkSize = Math.max(1, Math.min(opts.chunkSize || 10, 20));
    const delayMs = opts.delayMs ?? 1500;
    let sent = 0;
    const clean = (recipients || []).filter(
      (r, i, arr) =>
        r?.email &&
        EMAIL_RE.test(r.email.trim()) &&
        arr.findIndex(
          (x) => x.email.toLowerCase() === r.email.toLowerCase(),
        ) === i,
    );
    for (let i = 0; i < clean.length; i += chunkSize) {
      const chunk = clean.slice(i, i + chunkSize);
      for (const r of chunk) {
        try {
          const tpl = build(r);
          const res = await this.sendMail({ to: r.email, ...tpl });
          if (res.success) sent++;
        } catch (err) {
          this.logger.warn(
            `sendBulk to ${r.email} failed: ${(err as Error)?.message}`,
          );
        }
      }
      if (i + chunkSize < clean.length) await this.sleep(delayMs);
    }
    return { total: clean.length, sent, failed: clean.length - sent };
  }

  /** Lấy danh sách email khách theo audience cho broadcast. */
  async resolveAudience(audience: {
    userIds?: string[];
    segment?: "ALL" | "RECENT_BUYERS";
    tagId?: string;
  }): Promise<Array<{ email: string; name?: string; id?: string }>> {
    if (audience.userIds?.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: audience.userIds } },
        select: { id: true, name: true, email: true },
      });
      return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || undefined,
      }));
    }
    if (audience.tagId) {
      const links = await (this.prisma as any).customerTagAssignment.findMany({
        where: { tagId: audience.tagId },
        select: { userId: true },
      });
      const ids = [...new Set<string>(links.map((l: any) => String(l.userId)))];
      if (!ids.length) return [];
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, email: true },
      });
      return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || undefined,
      }));
    }
    if (audience.segment === "RECENT_BUYERS") {
      const since = new Date(Date.now() - 90 * 86_400_000);
      const orders = await this.prisma.order.findMany({
        where: {
          createdAt: { gte: since },
          status: { not: "CANCELED" as any },
          userId: { not: null },
        },
        select: { userId: true },
      });
      const ids = [
        ...new Set(orders.map((o) => o.userId).filter(Boolean)),
      ] as string[];
      if (!ids.length) return [];
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, email: true },
      });
      return users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name || undefined,
      }));
    }
    // ALL: toàn bộ USER có email
    const users = await this.prisma.user.findMany({
      where: { role: "USER" as any },
      select: { id: true, name: true, email: true },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name || undefined,
    }));
  }
}
