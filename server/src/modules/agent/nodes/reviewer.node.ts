import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { structured } from "../agent-llm";
import type { ProductEnrichmentState } from "../agent.state";

/** Schema verdict — verdict để string rồi chuẩn hoá ở code vì model yếu hay
 *  viết hoa ("APPROVED") hoặc đặt field "reason" thay vì "feedback".
 *  (preprocess/transform KHÔNG convert được sang JSON Schema nên làm ở code.) */
const ReviewVerdictSchema = z.object({
  verdict: z
    .string()
    .catch("")
    .describe("approved nếu bài đạt, rejected nếu bịa số liệu/cam kết ảo"),
  feedback: z
    .string()
    .catch("")
    .describe("Nhận xét ngắn tiếng Việt, chuỗi rỗng nếu approved"),
  reason: z
    .string()
    .catch("")
    .optional()
    .describe("Alias của feedback mà model yếu hay dùng"),
});

const reviewerPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là kiểm duyệt viên nội dung sàn TMĐT MegaMart.
Đối chiếu BÀI NHÁP với SPECS GỐC. Chấm rejected nếu: bịa thông số không có trong specs, sai số liệu (giá/SKU/màu), hoặc có cam kết bảo hành/giá mà specs không ghi. Còn lại chấm approved.
BẮT BUỘC trả đúng 1 JSON theo 1 trong 2 mẫu, không thêm chữ nào ngoài JSON:
- Đạt: {{"verdict": "approved", "feedback": ""}}
- Lỗi: {{"verdict": "rejected", "feedback": "<nêu cụ thể lỗi + số liệu đúng>"}}
feedback khi rejected KHÔNG được để rỗng.`,
  ],
  [
    "human",
    `SPECS GỐC:
{specs}

BÀI NHÁP:
{draft}`,
  ],
]);

/**
 * Role 3 — Quality Reviewer (structured output).
 * Fact-check bản nháp đối chiếu specs gốc. Schema zod ép LLM trả đúng
 * shape {verdict, feedback} — thay thế parseVerdict thủ công trước đây.
 * KHÔNG tăng retryCount ở đây — Writer tự đếm mỗi lần viết lại có feedback.
 */
export function createReviewerNode(model: BaseChatModel) {
  // jsonSchema (KHÔNG phải jsonMode — ChatGoogleGenerativeAI throw với jsonMode).
  // Gemini native hỗ trợ responseSchema nên trả JSON sạch, khỏi parse tay.
  const chain = reviewerPrompt.pipe(structured(model, ReviewVerdictSchema));

  return async (
    state: ProductEnrichmentState,
  ): Promise<Partial<ProductEnrichmentState>> => {
    let verdict: "approved" | "rejected";
    let feedback: string;
    try {
      const parsed = await chain.invoke({
        specs: state.normalizedSpecs || "(trống)",
        draft: state.draft || "(trống)",
      });
      // Chuẩn hoá verdict: hoa/thường, approve/approve + alias reason/feedback.
      const v = String(parsed.verdict ?? "")
        .trim()
        .toLowerCase();
      feedback = parsed.feedback || parsed.reason || "";
      if (v === "approved" || v === "approve" || v === "pass") {
        verdict = "approved";
      } else if (
        v === "rejected" ||
        v === "reject" ||
        v === "fail" ||
        v === ""
      ) {
        verdict = "rejected";
        if (!feedback) feedback = "Bài viết chưa đạt, viết lại cẩn thận hơn.";
      } else {
        throw new Error(`verdict lạ: ${parsed.verdict}`);
      }
    } catch (err) {
      // Model trả JSON thiếu field/sai shape → coi như reject để writer sửa
      // lại, vòng lặp vẫn bị chặn bởi retryCount. Không ném ra ngoài để khỏi
      // sập cả run vì 1 JSON lỗi.
      verdict = "rejected";
      feedback = `Reviewer output lỗi, viết lại cẩn thận hơn. Chi tiết: ${err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)}`;
    }

    if (verdict === "approved") {
      return { reviewFeedback: "", status: "approved" as const };
    }
    return { reviewFeedback: feedback, status: "reviewing" as const };
  };
}
