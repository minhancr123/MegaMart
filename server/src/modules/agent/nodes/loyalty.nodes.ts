import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { structured } from '../agent-llm';

/** Quy tắc tier chốt với user: 10.000đ = 1 điểm. */
export const TIER_RULES = [
  { name: 'Kim Cương', minPoints: 20000 },
  { name: 'Vàng', minPoints: 5000 },
  { name: 'Bạc', minPoints: 1000 },
  { name: 'Mới', minPoints: 0 },
] as const;

/** Trần ngân sách chốt với user cho voucher auto. */
export const LOYALTY_CAPS = {
  maxValue: 50000,
  minOrderValue: 300000,
  validityDaysMin: 7,
  validityDaysMax: 14,
} as const;

export type LoyaltySegment = 'NEW' | 'DORMANT' | 'NEAR_TIER';

/** Ứng viên do job tính sẵn bằng code (rule cứng), LLM chỉ tinh chỉnh. */
export interface NurtureCandidate {
  userId: string;
  name: string;
  segment: LoyaltySegment;
  totalSpent: number;
  points: number;
  currentTier: string;
  nextTier: string | null;
  progressPct: number;
  daysSinceLastOrder: number | null;
}

const segmenterPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn phân khúc khách hàng MegaMart. Code đã xếp segment sơ bộ (NEW: mới ≤7 ngày & ≤1 đơn; DORMANT: không đơn nào 60+ ngày; NEAR_TIER: còn <15% nữa lên hạng).
Nhiệm vụ: xác nhận hoặc sửa segment + viết reason 1 câu + priority 1-5 (NEAR_TIER cao nhất). Trả đúng schema.`,
  ],
  ['human', 'CANDIDATE (JSON):\n{candidate}'],
]);

const SegmentSchema = z.object({
  // Segment lạ → 'NEW' (chỉ ảnh hưởng tone thư, voucher vẫn bị trần ngân sách +
  // reviewer chặn — hướng an toàn thay vì crash cả step).
  segment: z.enum(['NEW', 'DORMANT', 'NEAR_TIER']).catch('NEW'),
  reason: z.string().catch(''),
  priority: z.number().int().catch(3),
});
export type SegmentVerdict = z.infer<typeof SegmentSchema>;

const copywriterPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn viết thông điệp nuôi dưỡng khách MegaMart (tiếng Việt, thân thiện, xưng "MegaMart", ≤ 500 ký tự) + thông số voucher kích cầu.
Voucher BẮT BUỘC: type "FIXED", value ≤ 50000, minOrderValue ≥ 300000, validityDays trong [7..14].
- NEW: chào mừng + hướng dẫn mua đầu.
- DORMANT: nhớ nhung + lý do quay lại.
- NEAR_TIER: còn thiếu bao nhiêu nữa lên hạng (dùng progressPct).
Trả đúng schema.`,
  ],
  [
    'human',
    'SEGMENT (JSON):\n{segment}\n\nCANDIDATE (JSON):\n{candidate}',
  ],
]);

const NurtureContentSchema = z.object({
  message: z.string().max(600).catch(''),
  voucher: z.object({
    // Job hardcode type:'FIXED' lúc tạo nên field này chỉ để đọc — catch để
    // khỏi brick step vì 1 string lạ (giá trị tiền vẫn validate chặt bên dưới).
    type: z.literal('FIXED').catch('FIXED' as const),
    value: z.number().int().min(1000).max(50000),
    minOrderValue: z.number().int().min(300000),
    validityDays: z.number().int().min(7).max(14),
  }),
});
export type NurtureContent = z.infer<typeof NurtureContentSchema>;

const reviewerPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn kiểm duyệt ưu đãi loyalty MegaMart. APPROVE chỉ khi TẤT CẢ đúng:
value ≤ 50000, minOrderValue ≥ 300000, validityDays trong [7..14], message không hứa hẹn ngoài voucher, không lộ dữ liệu nhạy cảm.
Ngược lại REJECT + reason. Trả đúng schema.`,
  ],
  [
    'human',
    'CONTENT (JSON):\n{content}\n\nCANDIDATE (JSON):\n{candidate}',
  ],
]);

const NurtureReviewSchema = z.object({
  // Model trả approved kiểu lạ → false = không tạo voucher (hướng an toàn).
  approved: z.boolean().catch(false),
  reason: z.string().catch(''),
});
export type NurtureReview = z.infer<typeof NurtureReviewSchema>;

export function createLoyaltySegmenter(model: BaseChatModel) {
  const chain = segmenterPrompt.pipe(structured(model, SegmentSchema));
  return async (candidate: NurtureCandidate): Promise<SegmentVerdict> =>
    (await chain.invoke({
      candidate: JSON.stringify(candidate),
    })) as SegmentVerdict;
}

export function createLoyaltyCopywriter(model: BaseChatModel) {
  const chain = copywriterPrompt.pipe(structured(model, NurtureContentSchema));
  return async (
    segment: SegmentVerdict,
    candidate: NurtureCandidate,
  ): Promise<NurtureContent> =>
    (await chain.invoke({
      segment: JSON.stringify(segment),
      candidate: JSON.stringify(candidate),
    })) as NurtureContent;
}

export function createLoyaltyReviewer(model: BaseChatModel) {
  const chain = reviewerPrompt.pipe(structured(model, NurtureReviewSchema));
  return async (
    content: NurtureContent,
    candidate: NurtureCandidate,
  ): Promise<NurtureReview> =>
    (await chain.invoke({
      content: JSON.stringify(content),
      candidate: JSON.stringify(candidate),
    })) as NurtureReview;
}
