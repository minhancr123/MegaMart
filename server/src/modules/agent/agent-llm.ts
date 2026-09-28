import { ConfigService } from "@nestjs/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { z } from "zod";

export type LlmProvider = "gemini" | "agnes";

/** Provider crews dùng — đọc từ env, default gemini để giữ hành vi cũ. */
export function getLlmProvider(config: ConfigService): LlmProvider {
  return config.get<string>("LLM_PROVIDER") === "agnes" ? "agnes" : "gemini";
}

/**
 * Model chat cho crews theo provider.
 * - gemini: ChatGoogleGenerativeAI (hỗ trợ tool-calling + jsonSchema).
 * - agnes: ChatOpenAI trỏ về apihub.agnes-ai.com (OpenAI-compatible).
 *   LƯU Ý: Agnes trả tool-call dạng text <tool_call>, KHÔNG phải structured
 *   tool_calls → ReAct agent/tools không kích hoạt được, chỉ dùng text thuần
 *   + response_format json_object.
 */
export function buildCrewModel(config: ConfigService): BaseChatModel {
  if (getLlmProvider(config) === "agnes") {
    const apiKey = config.get<string>("AGNES_API_KEY");
    if (!apiKey) {
      throw new Error(
        "AGNES_API_KEY chưa cấu hình trong server/.env — crew không chạy được.",
      );
    }
    return new ChatOpenAI({
      apiKey,
      configuration: {
        baseURL:
          config.get<string>("AGNES_BASE_URL") ||
          "https://apihub.agnes-ai.com/v1",
      },
      model: config.get<string>("AGNES_TEXT_MODEL") || "agnes-2.5-flash",
      temperature: 0.7,
    });
  }
  const apiKey = config.get<string>("GOOGLE_AI_KEY");
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_KEY chưa cấu hình trong server/.env — crew không chạy được với LLM thật.",
    );
  }
  const model = config.get<string>("GEMINI_TEXT_MODEL") || "gemini-3.6-flash";
  return new ChatGoogleGenerativeAI({ apiKey, model, temperature: 0.7 });
}

/** Model cũ cho tương thích — giờ đi qua provider switch. */
export function buildGeminiChatModel(config: ConfigService): BaseChatModel {
  return buildCrewModel(config);
}

/**
 * Model cho nodes STRUCTURED OUTPUT (schema JSON).
 * - gemini: cùng model text (native jsonSchema).
 * - agnes: agnes-3.0-flash — bản 2.5-flash tự bịa field (vd {"score":"APPROVE"})
 *   thay vì theo schema, đã verify thực tế.
 * temperature = 0 cho mọi structured node: chấm/trích xuất cần ổn định tuyệt
 * đối, không cần sáng tạo (sáng tạo để researcher/writer lo, temp 0.7).
 */
export function buildSmartModel(config: ConfigService): BaseChatModel {
  if (getLlmProvider(config) === "agnes") {
    const apiKey = config.get<string>("AGNES_API_KEY");
    if (!apiKey) {
      throw new Error(
        "AGNES_API_KEY chưa cấu hình trong server/.env — crew không chạy được.",
      );
    }
    return new ChatOpenAI({
      apiKey,
      configuration: {
        baseURL:
          config.get<string>("AGNES_BASE_URL") ||
          "https://apihub.agnes-ai.com/v1",
      },
      model: config.get<string>("AGNES_SMART_MODEL") || "agnes-3.0-flash",
      temperature: 0,
    });
  }
  // Gemini: dựng trực tiếp với temperature 0 (không đi qua buildCrewModel
  // vì bản đó temp 0.7 cho sáng tạo — structured cần deterministic).
  const apiKey = config.get<string>("GOOGLE_AI_KEY");
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_KEY chưa cấu hình trong server/.env — crew không chạy được với LLM thật.",
    );
  }
  const model = config.get<string>("GEMINI_TEXT_MODEL") || "gemini-3.6-flash";
  return new ChatGoogleGenerativeAI({ apiKey, model, temperature: 0 });
}

/**
 * Structured output theo provider:
 * - gemini: jsonSchema (native responseSchema).
 * - agnes: jsonMode (response_format json_object — đã verify trả JSON sạch).
 * FakeListChatModel trong test bỏ qua method, parse JSON string như thường.
 */
export function structured<T>(model: BaseChatModel, schema: z.ZodType<T>) {
  return model.withStructuredOutput(schema, {
    method:
      getLlmProviderFromModel(model) === "agnes" ? "jsonMode" : "jsonSchema",
  });
}

/**
 * Đoán provider từ model instance để chọn method (tránh đọc env trong nodes).
 * ChatOpenAI → agnes (endpoint duy nhất dùng ChatOpenAI trong repo).
 * Bóc .bound trước vì model bọc withConfig/bind (RunnableBinding) làm
 * instanceof sai → đoán nhầm provider → sai method (gemini+jsonMode=crash).
 */
function getLlmProviderFromModel(model: BaseChatModel): LlmProvider {
  const inner = (model as unknown as { bound?: BaseChatModel })?.bound ?? model;
  if (inner instanceof ChatOpenAI) return "agnes";
  return "gemini";
}
