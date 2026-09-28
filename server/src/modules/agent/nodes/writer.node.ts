import { ChatPromptTemplate } from "@langchain/core/prompts";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ProductEnrichmentState } from "../agent.state";
import { messageText } from "./researcher.node";

const writerPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là copywriter marketing cho sàn TMĐT MegaMart.
Viết mô tả sản phẩm bằng tiếng Việt, định dạng markdown, gồm:
- Tiêu đề H2 nổi bật (không lặp y nguyên tên sản phẩm)
- Đoạn mở đầu 2-3 câu gợi nhu cầu
- "Thông số nổi bật" dạng bullet từ specs (giữ đúng số liệu, KHÔNG bịa)
- Đoạn kêu gọi mua hàng 1-2 câu
Yêu cầu: thân thiện, chuẩn SEO, không dùng từ "giá rẻ nhất", không cam kết bảo hành nếu specs không ghi.
Nếu có nhận xét trả về từ kiểm duyệt, phải sửa đúng các điểm bị chê.
Trả về CHỈ bài mô tả markdown, không thêm lời dẫn.`,
  ],
  [
    "human",
    `Sản phẩm: {productName}
Thương hiệu: {brand}

SPECS CHUẨN:
{specs}
{revisionNote}`,
  ],
]);

/**
 * Model hay bọc bài markdown trong fence ```markdown ... ``` — strip để khỏi
 * hiện chữ fence thô trên trang SP (đã dính 1 lần thật ở product-enrichment).
 */
export function stripCodeFences(md: string): string {
  return md
    .replace(/^```(?:markdown|md)?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

/**
 * Role 2 — Marketing Copywriter.
 * Soạn mô tả sản phẩm markdown chuẩn SEO từ specs đã chuẩn hoá.
 * Nếu có reviewFeedback (bị trả về), phải sửa đúng điểm bị chê.
 */
export function createWriterNode(model: BaseChatModel) {
  const chain = writerPrompt.pipe(model);

  return async (
    state: ProductEnrichmentState,
  ): Promise<Partial<ProductEnrichmentState>> => {
    const res = await chain.invoke({
      productName: state.productName,
      brand: state.brand || "Không rõ",
      specs: state.normalizedSpecs || "(trống)",
      revisionNote: state.reviewFeedback
        ? `BẢN TRƯỚC BỊ TRẢ VỀ VỚI NHẬN XÉT:\n${state.reviewFeedback}\nHãy viết lại, khắc phục đúng các điểm trên. Trả về CHỈ markdown thuần, KHÔNG bọc trong fence \`\`\`.`
        : "",
    });
    return {
      draft: stripCodeFences(messageText(res.content)),
      status: "reviewing" as const,
      // Đếm số lần viết lại thực tế: chỉ tăng khi có feedback (tức là bị trả về).
      // Bản gốc retryCount=0 → tối đa 2 bản sửa (retryCount=2) rồi graph dừng.
      retryCount: state.reviewFeedback
        ? state.retryCount + 1
        : state.retryCount,
    };
  };
}
