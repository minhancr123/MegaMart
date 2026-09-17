import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { structured } from '../agent-llm';
import { messageText } from './researcher.node';

/** Tín hiệu hành vi do job gom sẵn (JSON-safe). */
export interface BehaviorSignals {
  topCategories: { name: string; count: number }[];
  topBrands: { name: string; count: number }[];
  wishlistIds: string[];
  highRatedIds: string[];
  recentViewIds: string[];
  purchasedIds: string[];
}

export interface RankCandidate {
  productId: string;
  name: string;
  brand: string | null;
  category: string | null;
  soldCount: number;
}

const profilerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn phân tích gu mua sắm khách hàng MegaMart. Từ tín hiệu hành vi, tóm tắt 3-5 dòng tiếng Việt: danh mục + thương hiệu ưa thích, tầm giá ngầm hiểu, điều cần tránh (đã mua rồi thì đừng gợi lại). Ngắn gọn, cụ thể, không bịa.`,
  ],
  ['human', 'SIGNALS (JSON):\n{signals}'],
]);

const rankerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn xếp hạng gợi ý sản phẩm MegaMart. CHỈ được chọn trong CANDIDATES (đúng productId có sẵn — bịa id là lỗi nghiêm trọng).
Ưu tiên: cùng danh mục/thương hiệu trong profile, bán chạy (soldCount cao), chưa mua, có trong wishlist/viewed thì cộng điểm.
Trả đúng schema: tối đa 10, score 0-100, reason ≤ 100 ký tự tiếng Việt.`,
  ],
  [
    'human',
    'PROFILE:\n{profile}\n\nCANDIDATES (JSON):\n{candidates}\n\nPURCHASED IDS (loại trừ):\n{purchased}',
  ],
]);

const RankSchema = z.object({
  rankings: z
    .array(
      z.object({
        productId: z.string().catch(''),
        // Score chỉ quyết định thứ tự hiển thị (job đã lọc id + dedupe) nên
        // default 50 khi model trả lạ — tránh brick cả user vì 1 con số.
        score: z.number().min(0).max(100).catch(50),
        reason: z.string().max(120).catch(''),
      }),
    )
    .max(10)
    .catch([]),
});
export type Rankings = z.infer<typeof RankSchema>;

export function createProfiler(model: BaseChatModel) {
  const chain = profilerPrompt.pipe(model);
  return async (signals: BehaviorSignals): Promise<string> => {
    const res = await chain.invoke({ signals: JSON.stringify(signals) });
    return messageText(res.content).trim();
  };
}

export function createRanker(model: BaseChatModel) {
  const chain = rankerPrompt.pipe(
    structured(model, RankSchema),
  );
  return async (
    profile: string,
    candidates: RankCandidate[],
    purchasedIds: string[],
  ): Promise<Rankings> =>
    (await chain.invoke({
      profile,
      candidates: JSON.stringify(candidates),
      purchased: JSON.stringify(purchasedIds),
    })) as Rankings;
}
