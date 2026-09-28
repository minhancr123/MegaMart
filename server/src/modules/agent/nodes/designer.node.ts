import type { ProductEnrichmentState } from "../agent.state";

export interface DesignerDeps {
  /** Công tắc chính: false (mặc định) thì node thoát ngay, không tốn tiền gen ảnh. */
  enabled: boolean;
  /** Sinh ảnh (bytes JPEG/PNG) từ prompt. Prod: Gemini image model. */
  generateImage: (prompt: string) => Promise<Buffer>;
  /** Upload bytes → URL public. Prod: CloudinaryService.uploadImage. */
  uploadImage: (buffer: Buffer, filename: string) => Promise<string>;
  /** Nhận lỗi best-effort (để service log warning). Không ném tiếp. */
  onError?: (err: unknown) => void;
}

/**
 * Role 4 — Designer (chỉ chạy khi Reviewer APPROVED).
 * Gen 1 ảnh minh họa sản phẩm → upload Cloudinary → trả URL để job lưu ProductImage.
 * Khi disabled: no-op, không gọi bất kỳ API tốn phí nào.
 * Khi gen/upload lỗi (429 quota, safety filter, timeout Cloudinary): NUỐT lỗi,
 * trả mảng rỗng để pipeline vẫn lưu được mô tả đã duyệt — ảnh chỉ là phần phụ.
 */
export function createDesignerNode(deps: DesignerDeps) {
  return async (
    state: ProductEnrichmentState,
  ): Promise<Partial<ProductEnrichmentState>> => {
    if (!deps.enabled) {
      return { designerImages: [] };
    }

    try {
      const prompt =
        `Product photography cho sàn TMĐT, phong cách studio chuyên nghiệp, nền trắng sáng, ` +
        `ánh sáng mềm, góc chụp 3/4. Sản phẩm: ${state.productName}. ` +
        `Đặc điểm: ${(state.normalizedSpecs || "").slice(0, 500)}. ` +
        `Không chữ, không logo, không watermark, tỉ lệ vuông.`;

      const buffer = await deps.generateImage(prompt);
      const url = await deps.uploadImage(buffer, `${state.productId}.jpg`);
      return { designerImages: [url] };
    } catch (err) {
      deps.onError?.(err);
      return { designerImages: [] };
    }
  };
}
