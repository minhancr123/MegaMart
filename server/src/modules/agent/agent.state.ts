/**
 * Shared state cho Product Enrichment crew (LangGraph).
 * Mỗi node đọc state và trả về partial update; LangGraph merge theo key.
 */
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
export type EnrichmentStatus =
  | "researching"
  | "drafting"
  | "reviewing"
  | "approved"
  | "rejected";

export interface ProductEnrichmentInput {
  productId: string;
  productName: string;
  brand?: string | null;
  categoryName?: string | null;
  /** Specs thô (JSON string): tên, brand, category, variants... */
  specsRaw: string;
}

export interface ProductEnrichmentState extends ProductEnrichmentInput {
  normalizedSpecs: string;
  draft: string;
  reviewFeedback: string;
  /** URL ảnh designer gen (rỗng nếu disabled hoặc chưa chạy tới designer). */
  designerImages: string[];
  status: EnrichmentStatus;
  retryCount: number;
}

export interface EnrichmentResult {
  productId: string;
  /** Markdown mô tả sản phẩm cuối cùng (kể cả khi rejected: bản nháp tốt nhất). */
  description: string;
  /** URL ảnh minh họa đã upload Cloudinary. */
  designerImages: string[];
  status: "approved" | "rejected";
  reviewFeedback: string;
  retryCount: number;
}

/** Chặn vòng lặp Reviewer ⇄ Writer vô tận: tối đa 2 lần viết lại. */
export const MAX_REVIEW_RETRIES = 2;

export interface CrewModels {
  /** Model chung khi không chỉ định riêng từng role. */
  default?: BaseChatModel;
  researcher?: BaseChatModel;
  writer?: BaseChatModel;
  reviewer?: BaseChatModel;
}
