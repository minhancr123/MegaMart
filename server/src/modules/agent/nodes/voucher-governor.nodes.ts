import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { structured } from "../agent-llm";

/** Tóm tắt 1 voucher do job tính sẵn (JSON-safe, không BigInt). */
export interface VoucherSummary {
  code: string;
  type: string;
  value: number;
  maxDiscount: number | null;
  minOrderValue: number | null;
  usageLimit: number | null;
  usagePerUser: number | null;
  usedCount: number;
  daysToExpiry: number | null;
  /** Hết hạn thật (so timestamp trực tiếp — xem job-guards.isExpired). */
  isExpired: boolean;
  ageDays: number;
  exhausted: boolean;
  /** user dùng vượt định mức (nghi lạm dụng). */
  abusers: { userId: string; count: number }[];
}

const auditorPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là kiểm toán voucher sàn TMĐT MegaMart. Phân loại MỖI voucher trong danh sách thành đúng 1 issue:
- expiring_soon: còn hạn < 24h (daysToExpiry <= 1)
- exhausted: exhausted = true
- idle: tạo > 14 ngày (ageDays > 14) mà usedCount = 0
- abuse_suspect: mảng abusers không rỗng
- healthy: còn lại
Trả đúng schema, không thêm chữ.`,
  ],
  ["human", "DANH SÁCH VOUCHER (JSON):\n{summaries}"],
]);

const FindingSchema = z.object({
  findings: z
    .array(
      z.object({
        code: z.string().catch(""),
        // Model yếu trả issue lạ → default 'healthy' = bỏ qua (hướng an toàn).
        issue: z
          .enum([
            "expiring_soon",
            "exhausted",
            "idle",
            "abuse_suspect",
            "healthy",
          ])
          .catch("healthy"),
        detail: z.string().catch(""),
      }),
    )
    .catch([]),
});
export type VoucherFindings = z.infer<typeof FindingSchema>;

const optimizerPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là chuyên gia tối ưu voucher MegaMart. Với mỗi finding (bỏ qua healthy), đề xuất ĐÚNG 1 action:
- deactivate: CHỈ khi expiring_soon đã qua hạn thật hoặc exhausted (job dọn rác, an toàn)
- extend: gia hạn thêm ngày (params.days, tối đa 14) cho voucher tốt sắp hết hạn
- add_quota: tăng usageLimit (params.addQuota) cho voucher chạy tốt
- lower_min: hạ minOrderValue (params.newMin, không dưới 100000) cho voucher ế
- close_proposal: đề nghị thu hồi/khoá (chỉ đề xuất, NGƯỜI duyệt tay, không tự thực thi)
- none: không làm gì
Trả đúng schema.`,
  ],
  ["human", "FINDINGS (JSON):\n{findings}\n\nSUMMARIES (JSON):\n{summaries}"],
]);

const ActionSchema = z.object({
  actions: z
    .array(
      z.object({
        code: z.string().catch(""),
        // Action lạ → 'none' = không làm gì (hướng an toàn, reviewer/job kiểm lại).
        action: z
          .enum([
            "deactivate",
            "extend",
            "add_quota",
            "lower_min",
            "close_proposal",
            "none",
          ])
          .catch("none"),
        params: z
          .object({
            days: z.number().optional(),
            addQuota: z.number().optional(),
            newMin: z.number().optional(),
          })
          .default({}),
        reason: z.string().catch(""),
      }),
    )
    .catch([]),
});
export type VoucherActions = z.infer<typeof ActionSchema>;

const reviewerPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `Bạn là kiểm duyệt voucher MegaMart. Chia actions thành 3 nhóm:
- approvedAuto: CHỈ action deactivate (job tự tắt, an toàn tuyệt đối)
- proposals: extend/add_quota/lower_min/close_proposal (người duyệt tay sau)
- rejected: đề xuất vô lý (vd: extend quá 14 ngày, newMin dưới 100000, addQuota âm)
Trả đúng schema.`,
  ],
  ["human", "ACTIONS (JSON):\n{actions}"],
]);

const VerdictSchema = z.object({
  approvedAuto: z
    .array(
      z.object({ code: z.string().catch(""), action: z.literal("deactivate") }),
    )
    .catch([]),
  proposals: z
    .array(
      z.object({
        code: z.string().catch(""),
        // 'none' = optimizer không đề xuất gì cho voucher này (job bỏ qua khi ghi audit).
        action: z
          .enum(["extend", "add_quota", "lower_min", "close_proposal", "none"])
          .catch("none"),
        params: z.record(z.string().catch(""), z.number()).default({}),
        reason: z.string().catch(""),
      }),
    )
    .catch([]),
  rejected: z
    .array(
      z.object({ code: z.string().catch(""), reason: z.string().catch("") }),
    )
    .catch([]),
  notes: z.string().catch(""),
});
export type VoucherVerdict = z.infer<typeof VerdictSchema>;

export function createVoucherAuditor(model: BaseChatModel) {
  const chain = auditorPrompt.pipe(structured(model, FindingSchema));
  return async (summaries: VoucherSummary[]): Promise<VoucherFindings> =>
    (await chain.invoke({
      summaries: JSON.stringify(summaries),
    })) as VoucherFindings;
}

export function createVoucherOptimizer(model: BaseChatModel) {
  const chain = optimizerPrompt.pipe(structured(model, ActionSchema));
  return async (
    findings: VoucherFindings,
    summaries: VoucherSummary[],
  ): Promise<VoucherActions> =>
    (await chain.invoke({
      findings: JSON.stringify(findings),
      summaries: JSON.stringify(summaries),
    })) as VoucherActions;
}

export function createVoucherReviewer(model: BaseChatModel) {
  const chain = reviewerPrompt.pipe(structured(model, VerdictSchema));
  return async (actions: VoucherActions): Promise<VoucherVerdict> =>
    (await chain.invoke({
      actions: JSON.stringify(actions),
    })) as VoucherVerdict;
}
