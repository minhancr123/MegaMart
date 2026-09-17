import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { structured } from '../agent-llm';

/** Ứng viên do job lọc sẵn (JSON-safe). */
export interface SaleCandidate {
  variantId: string;
  productName: string;
  sku: string;
  price: number;
  available: number;
  sold30d: number;
}

const analystPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là chuyên gia phân tích tồn kho sàn TMĐT MegaMart. Từ danh sách variant tồn cao + bán chậm, chọn TỐI ĐA 5 variant làm flash sale.
Mỗi pick: discountPct NGUYÊN trong [5..25] (tồn càng cao, ế càng lâu thì % càng cao), quantity = min(available, 50).
Ưu tiên: available lớn nhất, sold30d = 0. Trả đúng schema.`,
  ],
  ['human', 'CANDIDATES (JSON):\n{candidates}'],
]);

const AnalystSchema = z.object({
  // KHÔNG ràng buộc range ở schema: job clampSaleItem kiểm chứng lại bằng code
  // (pct→10 nếu ngoài [5..25], loại salePrice<1000đ/quantity<1). Schema chặt ở đây
  // chỉ khiến cả step crash khi model lệch 1 số, trong khi reviewer + guard code
  // đã đủ để loại item xấu.
  picks: z.array(
    z.object({
      variantId: z.string().catch(''),
      discountPct: z.number().int().catch(10),
      quantity: z.number().int().catch(10),
      reason: z.string().catch(''),
    }),
  ),
});
export type SalePicks = z.infer<typeof AnalystSchema>;

const copywriterPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là copywriter marketing MegaMart. Đặt tên chiến dịch flash sale (ngắn, kích cầu, tiếng Việt, KHÔNG thêm tiền tố [DRAFT] — job tự thêm) + tagline 1 câu + mô tả 2-3 câu. Không gen ảnh. Trả đúng schema.`,
  ],
  ['human', 'PICKS (JSON):\n{picks}'],
]);

const CopySchema = z.object({
  name: z.string().catch(''),
  tagline: z.string().catch(''),
  description: z.string().catch(''),
});
export type SaleCopy = z.infer<typeof CopySchema>;

const reviewerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là kiểm duyệt flash sale MegaMart. Duyệt toàn bộ hoặc từ chối từng item.
Từ chối item nếu: discountPct ngoài [5..25], salePrice (= price*(1-pct)) dưới 1000đ, quantity > available, variantId không có trong candidates.
Trả đúng schema (approvedItems là mảng variantId được duyệt).`,
  ],
  [
    'human',
    'PICKS (JSON):\n{picks}\n\nCOPY (JSON):\n{copy}\n\nCANDIDATES (JSON):\n{candidates}',
  ],
]);

export const ReviewSchema = z.object({
  approvedItems: z.array(z.string().catch('')).catch([]),
  rejectedItems: z
    .array(
      z.object({
        variantId: z.string().catch(''),
        reason: z.string().catch(''),
      }),
    )
    .catch([]),
  notes: z.string().catch(''),
});
export type SaleReview = z.infer<typeof ReviewSchema>;

export function createSaleAnalyst(model: BaseChatModel) {
  const chain = analystPrompt.pipe(structured(model, AnalystSchema));
  return async (candidates: SaleCandidate[]): Promise<SalePicks> =>
    (await chain.invoke({
      candidates: JSON.stringify(candidates),
    })) as SalePicks;
}

export function createSaleCopywriter(model: BaseChatModel) {
  const chain = copywriterPrompt.pipe(structured(model, CopySchema));
  return async (picks: SalePicks): Promise<SaleCopy> =>
    (await chain.invoke({ picks: JSON.stringify(picks) })) as SaleCopy;
}

export function createSaleReviewer(model: BaseChatModel) {
  const chain = reviewerPrompt.pipe(structured(model, ReviewSchema));
  return async (
    picks: SalePicks,
    copy: SaleCopy,
    candidates: SaleCandidate[],
  ): Promise<SaleReview> =>
    (await chain.invoke({
      picks: JSON.stringify(picks),
      copy: JSON.stringify(copy),
      candidates: JSON.stringify(candidates),
    })) as SaleReview;
}
