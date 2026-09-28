import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prismaClient/prisma.service";
import { OrderStatus } from "@prisma/client";
import OpenAI from "openai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private clients: OpenAI[] = [];
  private currentClientIndex = 0;
  // Model "code-daily" cũ không tồn tại trên upstream (404) nên mọi chat đều
  // rớt về câu trả lời cứng. Đổi sang model hợp lệ; chỉnh qua env AI_MODEL.
  private readonly modelName = process.env.AI_MODEL || "openai/gpt-6-luna";

  constructor(private prisma: PrismaService) {
    this.initializeAI();
  }

  private initializeAI() {
    // Key đọc từ env, KHÔNG hardcode trong code (repo có thể public).
    //   ZENMUX_API_KEYS=key1,key2,key3   -> xoay vòng round-robin
    //   ZENMUX_BASE_URL=https://zenmux.ai/api/v1
    const baseURL = process.env.ZENMUX_BASE_URL || "https://zenmux.ai/api/v1";
    const keys = (process.env.ZENMUX_API_KEYS || "")
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0 && !k.includes("thay-bang") && !k.includes("CHANGE-ME"));

    this.clients = keys.map(key => new OpenAI({ apiKey: key, baseURL }));

    if (this.clients.length === 0) {
      this.logger.warn(
        "🤖 AI Service: ZENMUX_API_KEYS rỗng -> chatbot dùng fallback canned response.",
      );
    } else {
      this.logger.log(
        `🤖 AI Service initialized (${this.clients.length} key(s) rotation @ ${baseURL})`,
      );
    }
  }

  private getNextClient(): OpenAI {
    const client = this.clients[this.currentClientIndex];
    this.currentClientIndex = (this.currentClientIndex + 1) % this.clients.length;
    return client;
  }

  async chat(
    message: string,
    conversationHistory: ChatMessage[] = [],
    userId?: string,
  ): Promise<string> {
    try {
      if (this.clients.length === 0) {
        return this.getFallbackResponse(message);
      }

      // Danh tính + đơn hàng + trả hàng của chính chủ: trả lời TRỰC TIẾP từ
      // DB (chuẩn xác, không tốn LLM, không ảo giác) thay vì nhờ LLM.
      const identityAnswer = await this.buildIdentityAnswer(userId, message);
      if (identityAnswer) return identityAnswer;

      const returnAnswer = await this.buildPersonalReturnAnswer(
        userId,
        message,
      );
      if (returnAnswer) return returnAnswer;

      const orderAnswer = await this.buildPersonalOrderAnswer(userId, message);
      if (orderAnswer) return orderAnswer;

      // Tư vấn / liệt kê sản phẩm thật từ DB theo danh mục + ngân sách
      const shoppingAnswer = await this.buildProductShoppingAnswer(
        message,
        conversationHistory,
      );
      if (shoppingAnswer) return shoppingAnswer;

      const latestAnswer = await this.buildLatestGenAnswer(
        message,
        conversationHistory,
      );
      if (latestAnswer) return latestAnswer;

      const tradeInAnswer = await this.buildTradeInAnswer(
        message,
        conversationHistory,
      );
      if (tradeInAnswer) return tradeInAnswer;

      const client = this.getNextClient();
      const context = await this.getShopContext();

      const systemPrompt = `Bạn là trợ lý ảo thông minh của MegaMart - cửa hàng thương mại điện tử.
Nhiệm vụ: Hỗ trợ khách hàng về sản phẩm, đơn hàng, giao hàng, thanh toán, và chính sách.

THÔNG TIN CỬA HÀNG:
${context}

HƯỚNG DẪN TRẢ LỜI:
- Thân thiện, nhiệt tình, chuyên nghiệp
- Trả lời ngắn gọn, rõ ràng (2-4 câu)
- Dùng emoji phù hợp 😊📦🚚💳
- Nếu không biết, hướng dẫn liên hệ hotline: 1900 6789
- Gợi ý sản phẩm khi phù hợp
- Format câu trả lời với markdown khi cần (** cho bold)

HẠN CHẾ:
- KHÔNG bịa đặt thông tin về giá, sản phẩm cụ thể
- KHÔNG hứa hẹn những gì không chắc chắn
- KHÔNG yêu cầu khách cung cấp mã đơn / số điện thoại để tra cứu (hệ thống đã tự tra)
- KHÔNG bao giờ tiết lộ đơn hàng của người khác`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: message }
      ];

      const completion = await client.chat.completions.create({
        model: this.modelName,
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      const text = completion.choices[0]?.message?.content || "";

      // Model đôi khi trả về rỗng (dù không lỗi) -> dùng đáp án từ khóa thay vì
      // gửi bong bóng trắng cho khách
      if (!text.trim()) {
        this.logger.warn("AI returned empty content, using fallback");
        return this.getFallbackResponse(message);
      }

      this.logger.log(`💬 AI Response (Key #${this.currentClientIndex + 1}): ${text.substring(0, 50)}...`);

      return text;
    } catch (error) {
      this.logger.error("AI chat error:", error.message);
      return this.getFallbackResponse(message);
    }
  }

  private async getShopContext(): Promise<string> {
    try {
      const [productCount, categoryCount, activeCategories] = await Promise.all([
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.category.count({ where: { active: true, deletedAt: null } }),
        this.prisma.category.findMany({
          where: { active: true, deletedAt: null },
          select: { name: true },
          take: 10,
        }),
      ]);

      const categoryList = activeCategories.map((c) => `- ${c.name}`).join("\n");

      return `
📊 Tổng quan:
- Sản phẩm: ${productCount}+ sản phẩm đang bán
- Danh mục: ${categoryCount}+ danh mục

📁 Danh mục chính:
${categoryList}

🚚 Giao hàng:
- Miễn phí ship đơn từ 500.000đ
- COD và thanh toán online

📞 Hỗ trợ: Hotline 1900 6789 (8:00 - 22:00 hàng ngày)
`;
    } catch (error) {
      return "MegaMart - Sàn thương mại điện tử uy tín, giao hàng toàn quốc.";
    }
  }

  private static readonly ORDER_STATUS_VI: Record<string, string> = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PROCESSING: "Đang chuẩn bị hàng",
    SHIPPING: "Đang giao hàng",
    DELIVERED: "Đã giao hàng thành công",
    COMPLETED: "Hoàn thành",
    CANCELED: "Đã hủy",
    FAILED: "Giao thất bại",
    REFUNDED: "Đã hoàn tiền",
    PAID: "Đã thanh toán",
  };

  /** True khi khách hỏi về đơn của CHÍNH mình (không phải info giao hàng chung). */
  private isPersonalOrderAsk(message: string): boolean {
    const text = message.toLowerCase();
    if (this.extractOrderCode(message)) return true;
    return /(của tôi|của mình|đang giao|gần nhất|mới nhất|đơn tôi|đơn mình|kiểm tra đơn|tra đơn|đơn của|đơn đâu|đơn nào|đơn hàng tôi)/.test(
      text,
    );
  }

  /** True khi khách hỏi danh tính của chính mình. */
  private isIdentityAsk(message: string): boolean {
    const text = message.toLowerCase();
    return /(tôi là ai|mình là ai|tôi tên gì|mình tên gì|tên tôi là|tên của tôi|who am i|my name)/.test(
      text,
    );
  }

  /**
   * True khi khách muốn trả/đổi/hoàn đơn của CHÍNH mình.
   * Câu hỏi chính sách chung (có "chính sách/quy định/thế nào/vào ví..." mà không
   * kèm mã đơn) thì nhả cho LLM/FAQ xử lý.
   */
  private isPersonalReturnAsk(message: string): boolean {
    const text = message.toLowerCase();
    const code = this.extractOrderCode(message);
    // Mã đơn kèm cụm trả/đổi/hoàn CỤ THỂ ("đơn ORD... đổi địa chỉ" thì không)
    if (
      code &&
      /(trả\s+hàng|đổi\s+trả|hoàn\s+(tiền|hàng)|trả\s+đơn|muốn\s+(trả|đổi|hoàn)|yêu cầu\s+(trả|hoàn))/.test(
        text,
      )
    ) {
      return true;
    }
    // Câu hỏi chính sách chung thì nhả cho LLM/FAQ
    if (
      /(chính sách|quy định|thế nào|ra sao|là gì|bao lâu|vào ví|phí trả|điều kiện)/.test(
        text,
      ) &&
      !code
    ) {
      return false;
    }
    // "đổi" đứng một mình (đổi mật khẩu/địa chỉ) thì KHÔNG tính là trả hàng
    return /(muốn\s+(trả\s+hàng|đổi\s+trả|hoàn\s+(tiền|hàng))|cho\s+(tôi|mình)\s+(trả\s+hàng|đổi\s+trả)|trả\s+hàng|đổi\s+trả|hoàn\s+(tiền|hàng)|yêu cầu\s+(trả\s+hàng|hoàn\s+(tiền|hàng)|đổi\s+trả))/.test(
      text,
    );
  }

  /** Mã đơn hệ thống (ORD + số, vd ORD622271, ORD-2025-001). Có \b và bắt buộc
   * chứa số để không nuốt nhầm từ thường như "order", "reorder". */
  private extractOrderCode(message: string): string | null {
    const m = message.match(/\bORD-?[A-Z0-9-]{2,}\b/i);
    if (m && /\d/.test(m[0])) return m[0].toUpperCase();
    return null;
  }

  private formatVnd(value: unknown): string {
    const n = Number(value ?? 0);
    return Number.isFinite(n)
      ? `${Math.round(n).toLocaleString("vi-VN")}đ`
      : "—";
  }

  private formatOrderLine(o: any, index: number): string {
    const items = (o.items || [])
      .map(
        (it: any) =>
          `${Number(it.quantity || 1)}x ${it.variant?.product?.name || "Sản phẩm"}`,
      )
      .join(", ");
    const statusVi =
      AiService.ORDER_STATUS_VI[String(o.status)] || String(o.status);
    return (
      `${index + 1}. Mã đơn: **${o.code}**\n` +
      `   - Trạng thái: ${statusVi} (${o.status})` +
      (o.shippingCarrier ? ` - Vận chuyển: ${o.shippingCarrier}` : "") +
      (o.expectedDeliveryDate
        ? ` - Dự kiến giao: ${new Date(o.expectedDeliveryDate).toLocaleDateString("vi-VN")}`
        : "") +
      `\n   - Sản phẩm: ${items || "—"}` +
      `\n   - Tổng tiền: ${this.formatVnd(o.total)}` +
      `\n   - Ngày đặt: ${new Date(o.createdAt).toLocaleDateString("vi-VN")}`
    );
  }

  /** Trả lời "tôi là ai" bằng tên/email chính chủ từ DB. */
  private async buildIdentityAnswer(
    userId: string | undefined,
    message: string,
  ): Promise<string | null> {
    if (!this.isIdentityAsk(message)) return null;

    if (!userId) {
      return "👤 Hiện tại bạn đang ở **chế độ khách (chưa đăng nhập)** nên mình chưa biết bạn là ai.\n\nHãy đăng nhập tài khoản MegaMart để mình nhận diện và hỗ trợ tra cứu đơn hàng của riêng bạn nhé! 🔐";
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      if (!user) {
        return "🔐 Tài khoản của bạn không còn tồn tại. Hãy đăng nhập lại giúp mình nhé!";
      }
      const name = (user.name || "").trim();
      if (name) {
        return `👋 Xin chào **${name}**!\nBạn đang đăng nhập bằng email **${user.email}**. Mình là trợ lý ảo MegaMart, mình có thể hỗ trợ gì cho bạn hôm nay? 😊`;
      }
      return `👋 Xin chào bạn!\nBạn đang đăng nhập bằng email **${user.email}** (chưa cập nhật tên hiển thị). Bạn có thể vào mục **Tài khoản → Thông tin cá nhân** để đặt tên nhé! 😊`;
    } catch (error) {
      this.logger.warn(`Identity answer failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Trả lời "tôi muốn trả hàng": liệt kê đơn đủ điều kiện + hướng dẫn tạo yêu
   * cầu trên trang chi tiết đơn (không tạo hộ qua chat vì cần lý do/số tiền/
   * phương thức). Trả null khi là câu hỏi chính sách chung.
   */
  private async buildPersonalReturnAnswer(
    userId: string | undefined,
    message: string,
  ): Promise<string | null> {
    if (!this.isPersonalReturnAsk(message)) return null;

    if (!userId) {
      return "🔐 Bạn đang hỏi về trả hàng nhưng chưa **đăng nhập**.\n\nHãy đăng nhập tài khoản MegaMart để mình kiểm tra xem bạn có đơn nào đủ điều kiện đổi trả không nhé! Hoặc bạn có thể xem **Chính sách đổi trả** tại trang Hỗ trợ. 😊";
    }

    const returnSteps =
      "\n\n📝 **Cách tạo yêu cầu trả hàng:**\n" +
      "1. Vào mục **Tài khoản → Đơn hàng của tôi**.\n" +
      "2. Chọn đơn cần trả để vào **Chi tiết đơn hàng**.\n" +
      "3. Bấm nút **“Yêu cầu hoàn tiền / Trả hàng”** và điền lý do theo hướng dẫn.\n\n" +
      "Đội ngũ CSKH MegaMart sẽ xét duyệt trong 24h làm việc! 😊";

    try {
      const orderSelect = {
        code: true,
        status: true,
        total: true,
        createdAt: true,
        refundRequests: { select: { status: true } },
        statusHistory: {
          where: { toStatus: OrderStatus.DELIVERED },
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { createdAt: true },
        },
        items: {
          select: {
            quantity: true,
            variant: { select: { product: { select: { name: true } } } },
          },
        },
      };

      // Hỏi đích danh 1 mã đơn
      const code = this.extractOrderCode(message);
      if (code) {
        const order: any = await this.prisma.order.findFirst({
          where: { code, userId },
          select: orderSelect,
        });
        if (!order) {
          return `🔍 Không tìm thấy đơn **${code}** trong tài khoản của bạn. Bạn kiểm tra lại mã đơn giúp mình nhé! 📦`;
        }
        const verdict = this.returnEligibility(order);
        if (verdict.ok) {
          return (
            `📦 Đơn **${order.code}** đủ điều kiện trả hàng / hoàn tiền:\n` +
            this.formatOrderLine(order, 0) +
            returnSteps
          );
        }
        return `📦 Đơn **${order.code}**: ${verdict.reason}\n\nCần hỗ trợ thêm, gọi hotline **1900 6789** 📞`;
      }

      // Liệt kê đơn DELIVERED/COMPLETED gần nhất, phân loại đủ/không đủ điều kiện
      const orders: any[] = await this.prisma.order.findMany({
        where: { userId, status: { in: ["DELIVERED", "COMPLETED"] } },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: orderSelect,
      });
      const eligible = orders.filter((o) => this.returnEligibility(o).ok);
      if (eligible.length > 0) {
        const lines = eligible.map((o, i) => this.formatOrderLine(o, i)).join("\n");
        return (
          `📦 Bạn có **${eligible.length} đơn đủ điều kiện trả hàng / hoàn tiền** (đã giao trong ~7 ngày, chưa gửi yêu cầu):\n` +
          lines +
          returnSteps
        );
      }
      if (orders.length > 0) {
        return (
          "📦 Các đơn đã giao của bạn hiện **chưa đủ điều kiện đổi trả** (quá ~7 ngày kể từ ngày đặt hoặc đã gửi yêu cầu hoàn tiền rồi).\n\n" +
          "Nếu có trường hợp đặc biệt (hàng lỗi, thiếu hàng), bạn liên hệ hotline **1900 6789** để được hỗ trợ trực tiếp nhé! 📞"
        );
      }
      return (
        "📦 Hiện tại bạn **không có đơn hàng nào đủ điều kiện đổi trả** (áp dụng cho đơn đã giao thành công).\n\n" +
        "Nếu đơn đang vận chuyển, bạn đợi nhận hàng rồi kiểm tra sản phẩm nhé. Cần hỗ trợ thêm thì gọi hotline **1900 6789**! 📞"
      );
    } catch (error) {
      this.logger.warn(`Return answer failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Đơn đủ điều kiện trả: đã giao/hoàn thành trong ~7 ngày (tính từ NGÀY GIAO
   * trong lịch sử trạng thái, fallback ngày đặt) và còn nút tạo yêu cầu trên UI:
   * - DELIVERED: nút luôn hiện -> chỉ loại khi đã có yêu cầu đang chờ/đã xong.
   * - COMPLETED: nút chỉ hiện khi chưa từng gửi yêu cầu nào.
   */
  private returnEligibility(order: any): { ok: boolean; reason: string } {
    const st = String(order.status);
    const refunds = order.refundRequests || [];
    if (st === "CANCELED") {
      return {
        ok: false,
        reason:
          "đơn đã bị hủy nên không có hàng để trả. Nếu bạn đã thanh toán trước, hãy liên hệ hotline **1900 6789** để kiểm tra hoàn tiền nhé.",
      };
    }
    if (st === "FAILED") {
      return {
        ok: false,
        reason:
          "đơn giao thất bại. Nếu đã thanh toán, bạn bấm nút **“Yêu cầu hoàn tiền”** trên trang chi tiết đơn hoặc gọi hotline **1900 6789** để được xử lý.",
      };
    }
    if (!["DELIVERED", "COMPLETED"].includes(st)) {
      return {
        ok: false,
        reason:
          "chưa giao thành công nên chưa thể trả hàng (hãy đợi nhận hàng rồi kiểm tra sản phẩm).",
      };
    }
    const deliveredAt =
      order.statusHistory?.[0]?.createdAt ?? order.createdAt;
    if (
      new Date(deliveredAt).getTime() <
      Date.now() - 7 * 24 * 3600 * 1000
    ) {
      return {
        ok: false,
        reason: "đã quá ~7 ngày đổi trả (tính từ ngày giao hàng thành công).",
      };
    }
    const busy = refunds.some((r: any) =>
      ["PENDING", "APPROVED", "COMPLETED"].includes(String(r.status)),
    );
    if (busy) {
      return {
        ok: false,
        reason:
          "đã có yêu cầu hoàn tiền đang được xử lý (xem mục Yêu cầu hoàn tiền trong chi tiết đơn).",
      };
    }
    // Đơn COMPLETED từng bị từ chối: UI đã ẩn nút tạo mới
    if (st === "COMPLETED" && refunds.length > 0) {
      return {
        ok: false,
        reason:
          "đơn đã có yêu cầu hoàn tiền bị từ chối trước đó và nút tạo mới đã ẩn — gọi hotline **1900 6789** để được xem xét lại.",
      };
    }
    return { ok: true, reason: "" };
  }

  /**
   * Trả lời TRỰC TIẾP câu hỏi về đơn của chính chủ từ DB (không qua LLM).
   * Trả về null khi không phải intent đơn cá nhân -> để LLM xử lý như thường.
   * Luôn lọc theo userId từ JWT (không tin userId từ body) nên không lộ đơn người khác.
   */
  private async buildPersonalOrderAnswer(
    userId: string | undefined,
    message: string,
  ): Promise<string | null> {
    if (!this.isPersonalOrderAsk(message)) return null;

    if (!userId) {
      return "🔐 Bạn đang hỏi đơn hàng nhưng chưa **đăng nhập**. Hãy đăng nhập tài khoản MegaMart để mình tự tra cứu giúp bạn nhé!\n\nHoặc bạn vào mục **Tài khoản → Đơn hàng của tôi** để xem trực tiếp. 📦";
    }

    try {
      const codeMatch = this.extractOrderCode(message);
      const select = {
        code: true,
        status: true,
        total: true,
        shippingCarrier: true,
        shippingStatus: true,
        expectedDeliveryDate: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            price: true,
            variant: { select: { product: { select: { name: true } } } },
          },
        },
      };

      if (codeMatch) {
        const code = codeMatch;
        const order = await this.prisma.order.findFirst({
          where: { code, userId },
          select,
        });
        if (!order) {
          return `🔍 Không tìm thấy đơn **${code}** trong tài khoản của bạn. Bạn kiểm tra lại mã đơn giúp mình nhé! 📦`;
        }
        return `📦 **Chi tiết đơn hàng của bạn:**\n${this.formatOrderLine(order, 0)}`;
      }

      const orders = await this.prisma.order.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        select,
      });
      if (orders.length === 0) {
        return "📦 Hiện tại bạn **chưa có đơn hàng nào**. Ghé trang chủ săn deal nhé! 🔥";
      }
      // Hỏi riêng đơn đang giao mà có đơn SHIPPING: chỉ liệt kê đúng các đơn đó
      // để tiêu đề khớp nội dung (không lẫn đơn đã giao/hủy).
      const asksDelivering = /đang giao/.test(message.toLowerCase());
      const shipping = orders.filter((o) => String(o.status) === "SHIPPING");
      const listed = asksDelivering && shipping.length > 0 ? shipping : orders;
      const head =
        asksDelivering && shipping.length > 0
          ? `🚚 Bạn có **${shipping.length} đơn đang giao**:`
          : `📦 **${orders.length} đơn gần nhất của bạn:**`;
      const lines = listed.map((o, i) => this.formatOrderLine(o, i)).join("\n");
      return `${head}\n${lines}\n\nCần chi tiết đơn nào, bạn nhắn mã đơn giúp mình nhé! 😊`;
    } catch (error) {
      this.logger.warn(`Order answer failed: ${(error as Error).message}`);
      return null;
    }
  }

  // ---------------------------------------------------------------- shopping
  private static readonly CATEGORY_KEYWORDS: Array<{
    slug: string;
    name: string;
    floor: number;
    keys: string[];
  }> = [
    { slug: "laptop", name: "laptop", floor: 4000000, keys: ["laptop", "máy tính xách tay", "macbook", "notebook"] },
    { slug: "dien-thoai", name: "điện thoại", floor: 1000000, keys: ["điện thoại", "dien thoai", "smartphone", "iphone"] },
    { slug: "tivi", name: "tivi", floor: 2000000, keys: ["tivi", "smart tv", " tv "] },
    { slug: "tu-lanh", name: "tủ lạnh", floor: 3000000, keys: ["tủ lạnh", "tu lanh"] },
    { slug: "may-giat", name: "máy giặt", floor: 3000000, keys: ["máy giặt", "may giat"] },
    { slug: "may-lanh", name: "máy lạnh", floor: 5000000, keys: ["máy lạnh", "máy điều hòa", "điều hòa", "dieu hoa"] },
    { slug: "tai-nghe", name: "tai nghe", floor: 200000, keys: ["tai nghe", "airpods", "headphone", "tai nghe"] },
    { slug: "may-tinh-bang", name: "máy tính bảng", floor: 2500000, keys: ["máy tính bảng", "ipad", "tablet"] },
    { slug: "dong-ho-thong-minh", name: "đồng hồ thông minh", floor: 500000, keys: ["đồng hồ", "smartwatch", "apple watch"] },
    { slug: "camera", name: "camera", floor: 1000000, keys: ["camera", "máy ảnh"] },
    { slug: "am-thanh", name: "loa / âm thanh", floor: 300000, keys: ["loa", "âm thanh", "soundbar"] },
    { slug: "may-hut-bui", name: "máy hút bụi", floor: 1000000, keys: ["máy hút bụi", "robot hút bụi"] },
  ];

  private static readonly BRAND_KEYWORDS: Array<{ brand: string; keys: string[] }> = [
    { brand: "Apple", keys: ["macbook", "iphone", "ipad", "apple", "airpods"] },
    { brand: "Dell", keys: ["dell"] },
    { brand: "HP", keys: ["hp", "hewlett", "pavilion", "omen", "omnibook"] },
    { brand: "Asus", keys: ["asus"] },
    { brand: "Lenovo", keys: ["lenovo", "thinkpad", "ideapad", "legion"] },
    { brand: "Acer", keys: ["acer"] },
    { brand: "MSI", keys: ["msi"] },
    { brand: "Samsung", keys: ["samsung", "galaxy"] },
    { brand: "LG", keys: ["lg", "lg smart"] },
    { brand: "Sony", keys: ["sony"] },
    { brand: "Xiaomi", keys: ["xiaomi", "redmi", "poco"] },
    { brand: "TCL", keys: ["tcl"] },
    { brand: "Panasonic", keys: ["panasonic"] },
    { brand: "Sharp", keys: ["sharp"] },
    { brand: "Aukey", keys: ["aukey"] },
    { brand: "Innostyle", keys: ["innostyle"] },
    { brand: "Mophie", keys: ["mophie"] },
  ];

  /** Nhận diện hãng trong câu ("Macbook đi" -> Apple). Key luôn bọc từ để
   * "omen" không nuốt "women/moment", "msi" không nuốt từ lạ. */
  private detectBrands(text: string): string[] {
    const t = ` ${text.toLowerCase().replace(/[.,?!;:()[\]"“”‘’]/g, " ")} `;
    const found: string[] = [];
    for (const b of AiService.BRAND_KEYWORDS) {
      if (b.keys.some((k) => t.includes(` ${k} `))) {
        if (!found.includes(b.brand)) found.push(b.brand);
      }
    }
    return found;
  }

  private static readonly LAPTOP_ACCESSORY_NOISE = [
    "chuột",
    "balo",
    "ba lô",
    "túi xách",
    "túi chống sốc",
    "cáp",
    "sạc",
    "ốp",
    "dán",
    "giá đỡ",
    "đế tản nhiệt",
  ];

  /** Parse ngân sách tiếng Việt -> VND. "20 trịu/tr/củ" = 20tr, "500k" = 500k. */
  private parseBudget(text: string): { min?: number; max?: number } | null {
    const t = text.toLowerCase().replace(/trịu/g, "triệu");
    const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
    const unitOf = (u: string) =>
      u.startsWith("củ") || u.startsWith("triệu") || u === "tr" ? 1e6 : 1e3;

    // Khoảng: "10-20 triệu", "từ 10 đến 20tr"
    let m = t.match(
      /(\d+(?:[.,]\d+)?)\s*(?:-|–|đến|den)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|củ|k\b)/,
    );
    if (m) {
      const u = unitOf(m[3]);
      const a = num(m[1]) * u;
      const b = num(m[2]) * u;
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
    // Trần: "dưới/tối đa/tầm/khoảng/~ 20 triệu"
    m = t.match(
      /(dưới|duoi|dưới|tối đa|toi da|không quá|tầm|tam|khoảng|khoang|khoảng|under|~|tối đa)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|củ|k\b)/,
    );
    if (m) return { max: num(m[2]) * unitOf(m[3]) };
    // Sàn: "trên/tối thiểu/từ X trở lên", và "từ X" đứng một mình (= từ X trở đi)
    m = t.match(
      /(trên|tren|tối thiểu|toi thieu|min)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|củ|k\b)|từ\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|củ|k\b)\s*trở lên/,
    );
    if (m) {
      const n = m[2] || m[4];
      const u = m[3] || m[5];
      if (n && u) return { min: num(n) * unitOf(u) };
    }
    m = t.match(
      /từ\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr\b|củ|k\b)(?!\s*(đến|den|-|–|trở lên))/,
    );
    if (m) return { min: num(m[1]) * unitOf(m[2]) };
    // Số trần truồng: "20 triệu", "20tr", "5 củ", "500k"
    m = t.match(/(\d+(?:[.,]\d+)?)\s*(triệu|củ|tr\b|k\b)/);
    if (m) return { max: num(m[1]) * unitOf(m[2]) };
    // Số tuyệt đối: "20.000.000"
    m = t.match(/(\d{1,3}(?:\.\d{3})+)\b/);
    if (m) return { max: num(m[1]) };
    return null;
  }

  /** Nhận diện danh mục trong câu (trả về mảng để phát hiện so sánh nhiều loại). */
  private detectCategories(text: string): Array<{ slug: string; name: string; floor: number }> {
    // Chuẩn hóa dấu câu để "mua tv," / "tv?" vẫn khớp key " tv "
    const t = ` ${text.toLowerCase().replace(/[.,?!;:()[\]"“”‘’]/g, " ")} `;
    const found: Array<{ slug: string; name: string; floor: number }> = [];
    for (const c of AiService.CATEGORY_KEYWORDS) {
      if (c.keys.some((k) => t.includes(k))) {
        if (!found.some((f) => f.slug === c.slug)) found.push(c);
      }
    }
    return found;
  }

  /** Gom danh mục + ngân sách + hãng từ câu hiện tại, thiếu thì kế thừa tin nhắn trước. */
  private resolveShoppingContext(
    message: string,
    history: ChatMessage[],
  ): {
    budget: { min?: number; max?: number } | null;
    cats: Array<{ slug: string; name: string; floor: number }>;
    brands: string[];
  } {
    let budget = this.parseBudget(message);
    let cats = this.detectCategories(message);
    let brands = this.detectBrands(message);
    // Đổi danh mục mới mà không nhắc hãng -> reset hãng cũ (tránh dính Dell khi hỏi tivi)
    const freshCat = cats.length > 0;
    if (!budget || cats.length === 0 || (brands.length === 0 && !freshCat)) {
      const pastUsers = [...history]
        .reverse()
        .filter((h) => h.role === "user")
        .map((h) => h.content);
      for (const past of pastUsers) {
        if (!budget) budget = this.parseBudget(past);
        if (cats.length === 0) cats = this.detectCategories(past);
        if (brands.length === 0 && !freshCat) brands = this.detectBrands(past);
        if (budget && cats.length > 0 && (brands.length > 0 || freshCat)) break;
      }
    }
    return { budget, cats, brands };
  }

  private isShoppingIntent(
    message: string,
    cats: Array<{ slug: string; name: string }>,
    budget: { min?: number; max?: number } | null,
  ): boolean {
    const t = message.toLowerCase();
    const hasPolicy =
      /(ship|vận chuyển|giao hàng|hoàn tiền|thanh toán|ví|trả góp|bảo hành|sửa chữa|đổi trả|trả hàng|chính sách)/.test(
        t,
      );
    // Động từ liệt kê rõ ràng mới được át chính sách ("mua laptop có được bảo
    // hành không" vẫn là hỏi chính sách -> nhả)
    const hasListVerb = /(liệt kê|liêt kê|gợi ý|tìm|tim)/.test(t);
    const hasVerb =
      /(muốn mua|liệt kê|liêt kê|gợi ý|tư vấn|tu van|tìm|tim|mua|trong tầm)/.test(
        t,
      );
    // Hỏi chính sách/bảo hành mà không đòi liệt kê -> nhả cho FAQ/LLM
    // ("tivi hỏng sửa 500k", "chính sách bảo hành laptop")
    if (hasPolicy && !hasListVerb) return false;
    // Đủ danh mục + ngân sách là câu mua hàng rõ ràng ("điện thoại 5 củ",
    // hoặc "20 triệu" trả lời câu hỏi ngân sách ở turn trước)
    if (cats.length > 0 && !!budget) return true;
    return hasVerb && (cats.length > 0 || !!budget);
  }

  private effectiveVariantPrice(v: any, nowMs = Date.now()): { current: number; original: number | null } {
    const price = Number(v?.price);
    const saleRaw = v?.salePrice != null ? Number(v.salePrice) : null;
    // Sale phải còn hạn (đầu nào null/invalid thì coi như không giới hạn)
    const toMs = (d: unknown) => {
      if (d == null) return null;
      const ms = new Date(d as any).getTime();
      return Number.isNaN(ms) ? null : ms;
    };
    const startMs = toMs(v?.saleStartDate);
    const endMs = toMs(v?.saleEndDate);
    const inWindow =
      (startMs == null || nowMs >= startMs) &&
      (endMs == null || nowMs <= endMs);
    const validSale =
      inWindow &&
      saleRaw != null &&
      Number.isFinite(saleRaw) &&
      saleRaw > 0 &&
      Number.isFinite(price) &&
      saleRaw < price;
    if (!Number.isFinite(price) || price <= 0) return { current: NaN, original: null };
    return validSale
      ? { current: saleRaw as number, original: price }
      : { current: price, original: null };
  }

  private extractSpecs(v: any, name: string): string {
    try {
      const a = ((v?.attributes ?? {}) as Record<string, any>) || {};
      const get = (...keys: string[]) => {
        for (const k of keys) {
          for (const cand of [k, k.toLowerCase(), k.toUpperCase()]) {
            const val = a[cand];
            if (val != null && String(val).trim() !== "") return String(val).trim();
          }
        }
        return "";
      };
      const parts: string[] = [];
      const cpu =
        get("cpu", "processor", "chip") ||
        (name.match(/(i[3579]-\w+|Ryzen\s?\d|Apple\s?M\d|M\d\s?(Pro|Max)?|Snapdragon\s?\w+)/i)?.[0] ?? "");
      if (cpu) parts.push(cpu);
      const ram = get("ram", "Ram", "RAM", "memory");
      if (ram) parts.push(`RAM ${ram}`);
      const storage = get("storage", "rom", "ssd", "hardDrive", "o cung", "ổ cứng");
      if (storage && !/ram/i.test(storage)) parts.push(storage);
      const screen = get("screen", "display", "man hinh", "màn hình", "kich thuoc", "kích thước");
      if (screen) parts.push(screen);
      return parts.slice(0, 4).join(" • ");
    } catch {
      return "";
    }
  }

  /** Render danh sách thẻ sản phẩm (tên + ảnh + giá + cấu hình + link). */
  private formatProductCards(
    items: Array<{ p: any; best: { current: number; original: number | null }; multi: boolean }>,
  ): string {
    return items
      .map((e: any, i: number) => {
        const pct =
          e.best.original != null && e.best.original > e.best.current
            ? Math.round(((e.best.original - e.best.current) / e.best.original) * 100)
            : 0;
        const priceLine =
          pct > 0
            ? `**${this.formatVnd(e.best.current)}** (giá gốc ${this.formatVnd(e.best.original)}, -${pct}%) 🔥`
            : `**${this.formatVnd(e.best.current)}**`;
        const specs = this.extractSpecs(e.best.v, e.p.name);
        const img = e.p.images?.[0]?.url
          ? `\n   [![${e.p.name.replace(/[\[\]]/g, "")}](${e.p.images[0].url})](/product/${e.p.id})`
          : "";
        return (
          `${i + 1}. **${e.p.name}**${img}\n` +
          `   - Giá${e.multi ? " từ" : ""}: ${priceLine}` +
          (specs ? `\n   - Cấu hình: ${specs}` : "") +
          `\n   - Xem chi tiết: /product/${e.p.id}`
        );
      })
      .join("\n");
  }

  /** Chuẩn hóa 1 product thô từ DB thành entry {p, best, multi} (giá hiệu lực rẻ nhất). */
  private toPricedEntries(raw: any[], nowMs = Date.now()): Array<{
    p: any;
    best: { current: number; original: number | null };
    multi: boolean;
  }> {
    return raw
      .map((p: any) => {
        const priced = (p.variants || [])
          .map((v: any) => ({ v, ...this.effectiveVariantPrice(v, nowMs) }))
          .filter((e: any) => Number.isFinite(e.current) && e.current > 0);
        if (priced.length === 0) return null;
        priced.sort((a: any, b: any) => a.current - b.current);
        return { p, best: priced[0], multi: priced.length > 1 };
      })
      .filter((e: any) => e != null) as any;
  }

  private formatBudgetVi(budget: { min?: number; max?: number }): string {
    const f = (n: number) =>
      n >= 1e6 ? `${+(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)} triệu` : `${Math.round(n / 1e3)}K`;
    if (budget.min != null && budget.max != null)
      return `${f(budget.min)} - ${f(budget.max)}`;
    if (budget.max != null) return `dưới ${f(budget.max)}`;
    return `từ ${f(budget.min ?? 0)}`;
  }

  /**
   * Tư vấn / liệt kê sản phẩm thật từ DB. Trả null khi không phải intent mua sắm
   * (để LLM/FAQ xử lý) hoặc khi so sánh nhiều danh mục.
   */
  private async buildProductShoppingAnswer(
    message: string,
    history: ChatMessage[],
  ): Promise<string | null> {
    const { budget, cats, brands } = this.resolveShoppingContext(message, history);
    if (cats.length > 1) return null; // so sánh nhiều loại -> để LLM phân tích
    if (!this.isShoppingIntent(message, cats, budget)) return null;
    // Nhiều hãng trong 1 câu ("Dell hay HP") -> lọc gộp các hãng đó
    const brandList = brands.length > 0 ? brands : null;

    // Chưa rõ danh mục -> hỏi lại
    if (cats.length === 0) {
      return "🛍️ MegaMart có rất nhiều ngành hàng: **laptop, điện thoại, tivi, tủ lạnh, máy giặt, tai nghe**... Bạn đang tìm mua sản phẩm thuộc danh mục nào để mình liệt kê chi tiết giúp bạn nhé? 😊";
    }
    const cat = cats[0];

    // Chưa có ngân sách -> hỏi ngân sách
    if (!budget || (budget.min == null && budget.max == null)) {
      return `💻 MegaMart hiện có nhiều mẫu **${cat.name}** chính hãng với đủ tầm giá!\n\nĐể mình gợi ý chuẩn nhất, bạn cho biết **khoảng ngân sách dự kiến** (vd: tầm 15 triệu, dưới 20 triệu...) và **nhu cầu sử dụng** nhé? Hoặc xem nhanh tất cả tại: /category/${cat.slug} 😊`;
    }

    try {
      // Ưu tiên khớp slug chính xác ("laptop" không được rơi vào cha
      // "Điện thoại - Laptop" chỉ vì tên chứa chữ laptop).
      const category =
        (await this.prisma.category.findFirst({
          where: { slug: cat.slug },
          select: { id: true, name: true, slug: true },
        })) ??
        (await this.prisma.category.findFirst({
          where: { name: { contains: cat.name, mode: "insensitive" } },
          select: { id: true, name: true, slug: true },
        }));
      if (!category) {
        return `🔍 Hiện mình chưa tìm thấy danh mục **${cat.name}**. Bạn xem tất cả ngành hàng tại trang chủ giúp mình nhé! 😊`;
      }

      const ceiling = budget.max != null ? budget.max * 1.1 : undefined;
      const maxBI = ceiling != null ? BigInt(Math.round(ceiling)) : undefined;
      const noise =
        cat.slug === "laptop"
          ? AiService.LAPTOP_ACCESSORY_NOISE.map((k) => ({
              name: { contains: k, mode: "insensitive" },
            }))
          : [];

      const where: any = {
        deletedAt: null,
        categoryId: category.id,
      };
      if (brandList) {
        where.OR = brandList.map((b) => ({
          brand: { contains: b, mode: "insensitive" },
        }));
      }
      if (noise.length > 0) where.NOT = noise;
      where.variants =
        maxBI != null
          ? {
              some: {
                stock: { gt: 0 },
                OR: [
                  { salePrice: { not: null, gt: 0, lte: maxBI } },
                  { salePrice: null, price: { gt: 0, lte: maxBI } },
                ],
              },
            }
          : { some: { stock: { gt: 0 } } };
      const raw = await this.prisma.product.findMany({
        where,
        take: 30,
        orderBy: { soldCount: "desc" },
        select: {
          id: true,
          name: true,
          brand: true,
          soldCount: true,
          images: {
            select: { url: true },
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
            take: 1,
          },
          variants: {
            where: { stock: { gt: 0 } },
            select: {
              price: true,
              salePrice: true,
              saleStartDate: true,
              saleEndDate: true,
              discountPercent: true,
              attributes: true,
            },
          },
        },
      });

      const cheapFirst = /rẻ nhất|re nhat|tiết kiệm|tiet kiem|bình dân|binh dan|giá tốt/.test(
        message.toLowerCase(),
      );
      const items = this.toPricedEntries(raw)
        .filter(
          (e: any) =>
            e &&
            e.best.current >= cat.floor &&
            (budget.max == null || e.best.current <= budget.max * 1.1) &&
            (budget.min == null || e.best.current >= budget.min),
        )
        // Máy trong ngân sách lên trước, máy vượt trần (biên +10%) xếp sau;
        // trong từng nhóm sắp theo giá tiệm cận trần (hoặc rẻ trước nếu xin rẻ)
        .sort((a: any, b: any) => {
          if (budget.max != null) {
            const aIn = a.best.current <= budget.max ? 0 : 1;
            const bIn = b.best.current <= budget.max ? 0 : 1;
            if (aIn !== bIn) return aIn - bIn;
          }
          return cheapFirst
            ? a.best.current - b.best.current
            : b.best.current - a.best.current;
        })
        .slice(0, 4);

      const brandTxt = brandList ? ` hãng **${brandList.join(", ")}**` : "";
      if (items.length === 0) {
        const floorTxt = `${Math.round(cat.floor / 1e6)} triệu`;
        return (
          `🔍 Rất tiếc, hiện MegaMart chưa có **${category.name.toLowerCase()}${brandTxt}** nào trong tầm **${this.formatBudgetVi(budget)}** (${category.name} chính hãng giá từ khoảng **${floorTxt}** trở lên).\n\n` +
          `💡 Bạn thử nới ngân sách${brandList ? ", bỏ lọc hãng" : ""} hoặc xem toàn bộ mẫu tại: /category/${category.slug} nhé! 😊`
        );
      }

      const lines = this.formatProductCards(items);

      return (
        `🛍️ **${category.name}${brandTxt} trong tầm ${this.formatBudgetVi(budget)} nổi bật tại MegaMart:**\n` +
        lines +
        `\n\n👉 Xem tất cả tại: /category/${category.slug}\nBạn cần tư vấn thêm về dòng máy nào cứ nói mình nhé! 😊`
      );
    } catch (error) {
      this.logger.warn(`Shopping answer failed: ${(error as Error).message}`);
      return null;
    }
  }

  /** True khi hỏi đời/thế hệ mới nhất của 1 dòng máy ("Macbook ra tới đời nào"). */
  private isLatestGenAsk(message: string): boolean {
    const t = message.toLowerCase();
    if (
      !/(mới nhất|đời nào|đời mới|đời bao nhiêu|ra tới|ra mắt|vừa ra|thế hệ|latest|mới ra mắt)/.test(
        t,
      )
    ) {
      return false;
    }
    // Câu mua sắm cụ thể (có ngân sách/động từ liệt kê) thì để nhánh shopping lo
    if (this.parseBudget(message)) return false;
    if (/(liệt kê|liêt kê|gợi ý|tìm|tim)/.test(t)) return false;
    return true;
  }

  /**
   * Đời máy mới nhất: liệt kê mẫu mới về nhất đang bán tại shop (theo ngày tạo),
   * kèm giá thật. Không bịa đời máy toàn thị trường.
   */
  private async buildLatestGenAnswer(
    message: string,
    history: ChatMessage[],
  ): Promise<string | null> {
    if (!this.isLatestGenAsk(message)) return null;
    const { cats, brands } = this.resolveShoppingContext(message, history);
    if (cats.length !== 1) return null; // thiếu/so sánh nhiều dòng -> LLM
    const cat = cats[0];

    try {
      const category = await this.prisma.category.findFirst({
        where: { slug: cat.slug },
        select: { id: true, name: true, slug: true },
      });
      if (!category) return null;
      const where: any = { deletedAt: null, categoryId: category.id };
      if (brands.length === 1) {
        where.brand = { contains: brands[0], mode: "insensitive" };
      }
      const raw = await this.prisma.product.findMany({
        where,
        take: 15,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          brand: true,
          soldCount: true,
          images: {
            select: { url: true },
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
            take: 1,
          },
          variants: {
            where: { stock: { gt: 0 } },
            select: {
              price: true,
              salePrice: true,
              saleStartDate: true,
              saleEndDate: true,
              discountPercent: true,
              attributes: true,
            },
          },
        },
      });
      const items = this.toPricedEntries(raw).slice(0, 3);
      if (items.length === 0) return null;
      const brandTxt = brands.length === 1 ? ` hãng **${brands[0]}**` : "";
      return (
        `✨ Các mẫu **${cat.name}${brandTxt}** mới nhất đang bán tại MegaMart:\n` +
        this.formatProductCards(items) +
        `\n\n👉 Xem tất cả tại: /category/${category?.slug || cat.slug}\n` +
        `Đời mới nhất trên toàn thị trường bạn xem thêm trên trang chủ hãng nhé, còn cần tư vấn mẫu nào cứ nói mình! 😊`
      );
    } catch (error) {
      this.logger.warn(`Latest-gen answer failed: ${(error as Error).message}`);
      return null;
    }
  }

  /** True khi hỏi thu cũ đổi mới / lên đời máy. */
  private isTradeInAsk(message: string): boolean {
    const t = message.toLowerCase();
    return /(thu\s*cũ\s*đổi\s*mới|đổi\s*máy\s*cũ|máy\s*cũ\s*đổi|trade[\s-]*in|lên\s*đời|thu\s*mua.*cũ)/.test(
      t,
    );
  }

  /**
   * Thu cũ đổi mới: shop chưa có bảng giá thu nên không báo số bù cụ thể.
   * Gợi ý mẫu máy mới cùng phân khúc + quy trình thẩm định.
   */
  private async buildTradeInAnswer(
    message: string,
    history: ChatMessage[],
  ): Promise<string | null> {
    if (!this.isTradeInAsk(message)) return null;
    const { cats } = this.resolveShoppingContext(message, history);
    if (cats.length > 1) return null;
    // Chưa rõ đổi dòng nào thì hỏi lại thay vì đoán bừa laptop
    if (cats.length === 0) {
      return (
        "🔄 MegaMart có nhận **thu cũ đổi mới** (máy cũ trừ tiền lên đời máy mới). " +
        "Số tiền bù = giá máy mới − giá thu máy cũ (giá thu do kỹ thuật thẩm định theo tình trạng máy).\n\n" +
        "Bạn muốn đổi từ máy gì sang máy gì để mình gợi ý mẫu mới phù hợp (vd: **laptop**, **điện thoại**...)? 😊"
      );
    }
    const cat = cats[0];

    try {
      const category = await this.prisma.category.findFirst({
        where: { slug: cat.slug },
        select: { id: true, name: true, slug: true },
      });
      if (!category) return null;
      const raw = await this.prisma.product.findMany({
        where: {
          deletedAt: null,
          categoryId: category.id,
          variants: { some: { stock: { gt: 0 } } },
        },
        take: 10,
        orderBy: { soldCount: "desc" },
        select: {
          id: true,
          name: true,
          brand: true,
          soldCount: true,
          images: {
            select: { url: true },
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
            take: 1,
          },
          variants: {
            where: { stock: { gt: 0 } },
            select: {
              price: true,
              salePrice: true,
              saleStartDate: true,
              saleEndDate: true,
              discountPercent: true,
              attributes: true,
            },
          },
        },
      });
      const items = this.toPricedEntries(raw)
        .filter((e: any) => e.best.current >= cat.floor)
        .slice(0, 3);
      if (items.length === 0) return null;

      return (
        `🔄 **Thu cũ đổi mới ${category.name}:** MegaMart nhận thu lại máy cũ để trừ tiền khi lên đời máy mới. ` +
        `Số tiền bù = giá máy mới − giá thu máy cũ (giá thu do kỹ thuật thẩm định theo cấu hình, tình trạng pin/màn/vỏ và phụ kiện, nên mình chưa báo số chính xác tại đây được).\n\n` +
        `💻 **Một số mẫu ${category.name} mới bán chạy để bạn tham khảo:**\n` +
        this.formatProductCards(items) +
        `\n\n📝 **Quy trình:**\n` +
        `1. Chọn mẫu máy mới muốn đổi sang.\n` +
        `2. Mang máy cũ + sạc ra cửa hàng (hoặc gọi hotline **1900 6789** để được hướng dẫn gửi máy).\n` +
        `3. Kỹ thuật kiểm tra và báo giá thu trong ~30 phút, chốt bù là nhận máy mới ngay! 😊`
      );
    } catch (error) {
      this.logger.warn(`Trade-in answer failed: ${(error as Error).message}`);
      return null;
    }
  }

  /** Tìm sản phẩm theo tên (endpoint /ai/search-products đang gọi nhưng chưa có). */
  async searchProducts(query: string, limit = 5) {
    const take = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { brand: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { soldCount: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        brand: true,
        soldCount: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          take: 1,
        },
        variants: {
          select: { price: true, salePrice: true },
          take: 1,
        },
      },
    });
    return products.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      soldCount: p.soldCount,
      imageUrl: p.images?.[0]?.url || null,
      price:
        p.variants?.[0]?.salePrice != null
          ? Number(p.variants[0].salePrice)
          : p.variants?.[0]?.price != null
            ? Number(p.variants[0].price)
            : null,
    }));
  }

  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("đơn hàng")) return "Bạn có thể theo dõi đơn hàng tại mục 'Đơn hàng của tôi'.";
    if (lowerMessage.includes("giao hàng")) return "Chúng tôi giao hàng toàn quốc, miễn phí đơn từ 500k.";
    return "Xin lỗi, tôi đang bận một chút. Bạn vui lòng liên hệ hotline 1900 6789 nhé! 😊";
  }
}
