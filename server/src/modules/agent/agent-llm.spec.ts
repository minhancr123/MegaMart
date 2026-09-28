import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { buildCrewModel, getLlmProvider } from "./agent-llm";

const cfg = (env: Record<string, string | undefined>) =>
  ({ get: (k: string) => env[k] }) as any;

describe("agent-llm provider switch", () => {
  it("default là gemini khi thiếu LLM_PROVIDER", () => {
    expect(getLlmProvider(cfg({}))).toBe("gemini");
    expect(getLlmProvider(cfg({ LLM_PROVIDER: "oops" }))).toBe("gemini");
  });

  it("LLM_PROVIDER=agnes → ChatOpenAI trỏ apihub", () => {
    const m = buildCrewModel(
      cfg({
        LLM_PROVIDER: "agnes",
        AGNES_API_KEY: "sk-test",
        AGNES_TEXT_MODEL: "agnes-2.5-flash",
      }),
    );
    expect(m).toBeInstanceOf(ChatOpenAI);
  });

  it("gemini cần GOOGLE_AI_KEY, agnes cần AGNES_API_KEY", () => {
    expect(() => buildCrewModel(cfg({}))).toThrow(/GOOGLE_AI_KEY/);
    expect(() => buildCrewModel(cfg({ LLM_PROVIDER: "agnes" }))).toThrow(
      /AGNES_API_KEY/,
    );
  });

  it("gemini → ChatGoogleGenerativeAI", () => {
    const m = buildCrewModel(
      cfg({ GOOGLE_AI_KEY: "x", GEMINI_TEXT_MODEL: "gemini-3.6-flash" }),
    );
    expect(m).toBeInstanceOf(ChatGoogleGenerativeAI);
  });
});
