import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { PrismaService } from "../../../prismaClient/prisma.service";
import type { ProductEnrichmentState } from "../agent.state";
import { createResearcherTools } from "./researcher.tools";

/** Ép AIMessage content (string | blocks[]) về string. */
export function messageText(content: unknown): string {
  // Tool-call-only message có content null/undefined: JSON.stringify(undefined)
  // trả về undefined (không throw) → guard trước để .trim() sau không crash.
  if (content == null) return "";
  if (typeof content === "string") return content;
  // Model có thể trả content dạng block array [{type:'text', text:'...'}] —
  // phải bóc text từng block, không JSON.stringify cả mảng vào prompt sau.
  if (Array.isArray(content)) {
    return content
      .map((c) =>
        typeof c === "string"
          ? c
          : String((c as { text?: unknown })?.text ?? ""),
      )
      .join("");
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content ?? "");
  }
}

const researcherPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là chuyên gia phân tích thông số sản phẩm cho sàn TMĐT MegaMart.
Bạn có tool lookup_category_products để tham khảo sản phẩm cùng danh mục — chỉ gọi TỐI ĐA 1 lần, chỉ khi thật sự cần.
Nhiệm vụ cuối: trích xuất specs từ dữ liệu thô thành dạng gạch đầu dòng tiếng Việt, giữ đúng số liệu (giá, SKU, màu, thuộc tính). Loại bỏ rác/HTML. Không bịa thêm thông số không có trong dữ liệu.
Câu trả lời CUỐI CÙNG phải CHỈ gồm phần specs chuẩn, không thêm lời dẫn.`,
  ],
  [
    "human",
    `Sản phẩm: {productName}
Thương hiệu: {brand}
Danh mục: {categoryName}

DỮ LIỆU THÔ:
{specsRaw}`,
  ],
]);

// Bản KHÔNG tool (đường Agnes plain chain): bỏ hoàn toàn đoạn nhắc tool để
// model khỏi sinh text <tool_call> lẫn vào specs.
const researcherPlainPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là chuyên gia phân tích thông số sản phẩm cho sàn TMĐT MegaMart.
Nhiệm vụ: trích xuất specs từ dữ liệu thô thành dạng gạch đầu dòng tiếng Việt, giữ đúng số liệu (giá, SKU, màu, thuộc tính). Loại bỏ rác/HTML. Không bịa thêm thông số không có trong dữ liệu. Không gọi bất kỳ tool nào.
Câu trả lời phải CHỈ gồm phần specs chuẩn, không thêm lời dẫn.`,
  ],
  [
    "human",
    `Sản phẩm: {productName}
Thương hiệu: {brand}
Danh mục: {categoryName}

DỮ LIỆU THÔ:
{specsRaw}`,
  ],
]);

/**
 * Role 1 — Specs Researcher.
 * - useTools=true (default, Gemini): ReAct agent + tool tra cứu DB.
 * - useTools=false (Agnes...): chain thuần prompt → model, vì provider này
 *   trả tool-call dạng text nên agent loop không bao giờ kích hoạt tool.
 */
export function createResearcherNode(
  model: BaseChatModel,
  prisma: PrismaService,
  opts?: { useTools?: boolean },
) {
  const useTools = opts?.useTools ?? true;
  if (!useTools) {
    const chain = researcherPlainPrompt.pipe(model);
    return async (
      state: ProductEnrichmentState,
    ): Promise<Partial<ProductEnrichmentState>> => {
      const res = await chain.invoke({
        productName: state.productName,
        brand: state.brand || "Không rõ",
        categoryName: state.categoryName || "Không rõ",
        specsRaw: state.specsRaw || "(trống)",
      });
      return {
        normalizedSpecs: messageText(res.content).trim(),
        status: "drafting" as const,
      };
    };
  }

  const agent = createReactAgent({
    llm: model,
    tools: createResearcherTools(prisma),
  });

  return async (
    state: ProductEnrichmentState,
  ): Promise<Partial<ProductEnrichmentState>> => {
    const promptValue = await researcherPrompt.invoke({
      productName: state.productName,
      brand: state.brand || "Không rõ",
      categoryName: state.categoryName || "Không rõ",
      specsRaw: state.specsRaw || "(trống)",
    });
    const result = await agent.invoke(
      { messages: promptValue.toChatMessages() },
      // Chặn ReAct loop vô tận: prompt dặn gọi tool tối đa 1 lần,
      // recursionLimit là lưới an toàn nếu model không nghe (đỡ nuốt quota).
      { recursionLimit: 5 },
    );
    const last = result.messages[result.messages.length - 1];
    const text =
      last && typeof last === "object" && "content" in last
        ? messageText((last as { content: unknown }).content).trim()
        : "";
    return { normalizedSpecs: text, status: "drafting" as const };
  };
}
