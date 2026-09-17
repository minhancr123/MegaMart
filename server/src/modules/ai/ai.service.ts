import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prismaClient/prisma.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: any;
  private model: any;

  constructor(private prisma: PrismaService) {
    this.initializeAI();
  }

  private async initializeAI() {
    try {
      const apiKey = process.env.GOOGLE_AI_KEY;
      
      if (!apiKey) {
        this.logger.warn('⚠️ No GOOGLE_AI_KEY found. AI features will use fallback responses.');
        return;
      }

      // Dynamic import to avoid issues if package not installed
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Model ID qua env (default gemini-3.6-flash) — 2.5-flash đã bị Google
      // ngừng cho key mới, đổi env là xong không cần sửa code.
      const modelName = process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash';
      this.model = this.genAI.getGenerativeModel({ model: modelName });
      
      this.logger.log(`🤖 AI Service initialized with ${modelName}`);
    } catch (error) {
      this.logger.error('Failed to initialize AI:', error.message);
    }
  }

  async chat(message: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      if (!this.model) {
        return this.getFallbackResponse(message);
      }

      // Get context about products and categories
      const context = await this.getShopContext();

      // Build conversation with system prompt
      const systemPrompt = `Bạn là trợ lý ảo thông minh của MegaMart - cửa hàng thương mại điện tử.
Nhiệm vụ: Hỗ trợ khách hàng về sản phẩm, đơn hàng, giao hàng, thanh toán, và chính sách.

THÔNG TIN CỬA HÀNG:
${context}

HƯỚNG DẪN TRẢ LỜI:
- Thân thiện, nhiệt tình, chuyên nghiệp
- Trả lời ngắn gọn, rõ ràng (2-4 câu)
- Dùng emoji phù hợp 😊📦🚚💳
- Nếu không biết, hướng dẫn liên hệ hotline: 1900 1234
- Gợi ý sản phẩm khi phù hợp
- Format câu trả lời với markdown khi cần (** cho bold)

HẠN CHẾ:
- KHÔNG bịa đặt thông tin về giá, sản phẩm cụ thể
- KHÔNG hứa hẹn những gì không chắc chắn
- KHÔNG đưa ra thông tin cá nhân khách hàng`;

      // Build chat history
      const chatHistory = conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      // Add system prompt as first message
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }],
          },
          {
            role: 'model',
            parts: [{ text: 'Xin chào! Tôi là trợ lý ảo của MegaMart. Tôi đã sẵn sàng hỗ trợ bạn! 😊' }],
          },
          ...chatHistory,
        ],
      });

      const result = await chat.sendMessage(message);
      const response = result.response;
      const text = response.text();

      this.logger.log(`💬 AI Response: ${text.substring(0, 100)}...`);
      
      return text;
    } catch (error) {
      this.logger.error('AI chat error:', error.message);
      return this.getFallbackResponse(message);
    }
  }

  private async getShopContext(): Promise<string> {
    try {
      // Get basic stats
      const [productCount, categoryCount, activeCategories] = await Promise.all([
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.category.count({ where: { active: true, deletedAt: null } }),
        this.prisma.category.findMany({
          where: { active: true, deletedAt: null },
          select: { name: true, description: true },
          take: 10,
        }),
      ]);

      const categoryList = activeCategories.map(c => `- ${c.name}`).join('\n');

      return `
📊 Tổng quan:
- Sản phẩm: ${productCount}+ sản phẩm đang bán
- Danh mục: ${categoryCount}+ danh mục

📁 Danh mục chính:
${categoryList}

🚚 Giao hàng:
- Giao hàng toàn quốc
- Miễn phí ship đơn từ 500.000đ
- Giao hàng nhanh 2-3 ngày (nội thành)
- COD và thanh toán online

💳 Thanh toán:
- COD (Tiền mặt khi nhận hàng)
- Chuyển khoản ngân hàng
- Ví điện tử (VNPay, Momo, ZaloPay)
- Thẻ tín dụng/ghi nợ

🔄 Chính sách:
- Đổi trả trong 7 ngày (còn nguyên tem, hóa đơn)
- Bảo hành theo quy định nhà sản xuất
- Hoàn tiền 100% nếu lỗi từ shop

📞 Hỗ trợ: Hotline 1900 1234 (8:00 - 22:00 hàng ngày)
`;
    } catch (error) {
      this.logger.error('Failed to get shop context:', error.message);
      return 'Thông tin cửa hàng: MegaMart - Sàn thương mại điện tử uy tín, giao hàng toàn quốc.';
    }
  }

  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase().trim();

    // Keyword-based fallback responses
    if (lowerMessage.includes('đơn hàng') || lowerMessage.includes('order') || lowerMessage.includes('theo dõi')) {
      return '📦 **Theo dõi đơn hàng:**\nBạn có thể theo dõi đơn hàng tại mục "Đơn hàng của tôi" trong tài khoản, hoặc liên hệ hotline **1900 1234** với mã đơn hàng để được hỗ trợ!';
    }

    if (lowerMessage.includes('giao hàng') || lowerMessage.includes('ship') || lowerMessage.includes('vận chuyển')) {
      return '🚚 **Thông tin giao hàng:**\n• Giao hàng toàn quốc\n• Miễn phí ship đơn từ 500.000đ\n• Giao nhanh 2-3 ngày (nội thành)\n• 3-5 ngày (ngoại thành)';
    }

    if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment') || lowerMessage.includes('cod')) {
      return '💳 **Phương thức thanh toán:**\n• COD (Tiền mặt khi nhận hàng)\n• Chuyển khoản ngân hàng\n• Ví điện tử (VNPay, Momo)\n• Thẻ tín dụng/ghi nợ';
    }

    if (lowerMessage.includes('đổi') || lowerMessage.includes('trả') || lowerMessage.includes('hoàn')) {
      return '🔄 **Chính sách đổi trả:**\n• Đổi trả trong 7 ngày\n• Sản phẩm còn nguyên tem, hóa đơn\n• Miễn phí đổi hàng lỗi\n• Hoàn tiền 100% nếu lỗi từ shop\n\nLiên hệ hotline **1900 1234** để được hỗ trợ!';
    }

    if (lowerMessage.includes('tài khoản') || lowerMessage.includes('đăng') || lowerMessage.includes('mật khẩu')) {
      return '📝 **Tài khoản & Đăng nhập:**\n🔐 Đăng ký: Nhấn icon tài khoản → Đăng ký\n🔑 Quên mật khẩu: Link đặt lại sẽ gửi qua email\n\nBạn cũng có thể đăng nhập bằng Google! 😊';
    }

    // Default response
    return 'Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. 😅\n\nBạn có thể hỏi về:\n• Theo dõi đơn hàng\n• Chính sách đổi trả\n• Phương thức thanh toán\n• Thông tin giao hàng\n\nHoặc liên hệ hotline **1900 1234** để được hỗ trợ trực tiếp!';
  }

  async searchProducts(query: string, limit: number = 5) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          variants: {
            take: 1,
            orderBy: { price: 'asc' },
            select: { price: true, salePrice: true },
          },
        },
        take: limit,
      });

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.variants[0]?.price != null ? Number(product.variants[0].price) : null,
        salePrice: product.variants[0]?.salePrice != null ? Number(product.variants[0].salePrice) : null,
      }));
    } catch (error) {
      this.logger.error('Search products error:', error.message);
      return [];
    }
  }
}
