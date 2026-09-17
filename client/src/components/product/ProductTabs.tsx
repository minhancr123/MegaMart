"use client";

import { useMemo, useState } from "react";
import { Product, SpecRow } from "@/interfaces/product";
import { Star, CheckCircle2, Loader2, FileText, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSpecAttributes, getSpecRows } from "@/components/product/ProductSpecsSidebar";

/**
 * Mô tả cào về là text nhiều dòng: xen kẽ tiêu đề mục và đoạn văn, gạch đầu
 * dòng bắt đầu bằng "•" hoặc "-". Không có markup nào để bám vào nên phân loại
 * theo hình dạng câu: dòng ngắn và không kết thúc bằng dấu chấm là tiêu đề.
 */
type Line = { text: string; kind: "heading" | "bullet" | "paragraph" };

function classifyLine(text: string): Line {
  if (/^[•\-–—*]\s+/.test(text)) {
    return { text: text.replace(/^[•\-–—*]\s+/, ""), kind: "bullet" };
  }
  if (text.length <= 100 && !/[.!?:;,]$/.test(text)) {
    return { text, kind: "heading" };
  }
  return { text, kind: "paragraph" };
}

const EmptyTabState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
    <FileText className="h-10 w-10 stroke-1" />
    <p className="text-sm">{message}</p>
  </div>
);

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

interface ProductTabsProps {
  product: Product;
  reviews: ReviewItem[];
  averageRating: number;
  reviewCount: number;
  rating: number;
  setRating: (rating: number) => void;
  comment: string;
  setComment: (comment: string) => void;
  handleSubmitReview: () => Promise<void>;
  loadingReviews: boolean;
  submittingReview: boolean;
}

export const ProductTabs = ({
  product,
  reviews,
  averageRating,
  reviewCount,
  rating,
  setRating,
  comment,
  setComment,
  handleSubmitReview,
  loadingReviews,
  submittingReview,
}: ProductTabsProps) => {
  // Bảng thông số đã chuyển sang sidebar cạnh tabs; ở đây chỉ giữ lại để
  // loại trùng lặp giữa mô tả và bảng thông số.
  const attributes = useMemo(() => getSpecAttributes(product), [product]);
  const specRows: SpecRow[] = useMemo(() => getSpecRows(product), [product]);
  const highlights: string[] = attributes?.specs ?? [];
  // Chuẩn hóa để so sánh trùng lặp giữa mô tả và bảng thông số.
  const norm = (s: string) => s.toLowerCase().trim();
  const specLabels = useMemo(
    () => new Set(specRows.map((r) => norm(r.label))),
    [specRows],
  );
  const specGroups = useMemo(
    () =>
      new Set(
        specRows
          .map((r) => r.group)
          .filter((g): g is string => !!g)
          .map(norm),
      ),
    [specRows],
  );
  // Dòng rác từ khung trang nguồn (link "xem thêm", placeholder video...).
  const JUNK_LINE = /^(xem thêm|hiện tại chưa có|chúng tôi đang cập nhật|đang cập nhật)/i;

  // Mô tả cào về thường có cặp dòng "nhãn / giá trị" đứng liền nhau
  // (vd: "Tốc độ vắt" + "Tối đa 1400 vòng/phút"). Gộp thành một hàng ngang
  // cho gọn thay vì in mỗi dòng một hàng in đậm.
  const descriptionBlocks = useMemo(() => {
    const raw = (product.description ?? "")
      .split("\n")
      .map((line) => line.trim())
      // Bỏ dòng trống và dòng chỉ còn mỗi dấu gạch đầu dòng (• - – — *)
      // do cào về — render ra sẽ thành chấm lẻ trơ trọi.
      .filter((line) => line && !/^\s*[•\-–—*·]+\s*$/.test(line));
    type Block =
      | { kind: "row"; label: string; value: string }
      | { kind: "line"; line: Line }
      | { kind: "image"; index: number };
    const blocks: Block[] = [];
    // Mô tả thường ôm luôn cả phần thông số của bài gốc. Nếu tab Thông số
    // kỹ thuật đã có bảng specsTable thì bỏ các dòng trùng trong mô tả để
    // khỏi hiển thị hai lần (chỉ so nhãn + tên nhóm, giữ lại nếu bảng thiếu).
    const hasSpecsTable = specRows.length > 0;
    const isSpecDuplicate = (label: string, value?: string) => {
      if (!hasSpecsTable) return false;
      if (specGroups.has(norm(label))) return true;
      if (!specLabels.has(norm(label))) return false;
      if (value == null) return true;
      return specRows.some(
        (r) => norm(r.label) === norm(label) && norm(r.value) === norm(value),
      );
    };
    const descImages = product.descriptionImages ?? [];
    for (let i = 0; i < raw.length; i++) {
      if (JUNK_LINE.test(raw[i])) continue;
      // Marker vị trí ảnh minh họa do crawler đánh dấu: [DESCIMG:n]
      const marker = raw[i].match(/^\[DESCIMG:(\d+)\]$/);
      if (marker) {
        const idx = Number(marker[1]);
        if (descImages[idx]) blocks.push({ kind: "image", index: idx });
        continue;
      }
      const current = classifyLine(raw[i]);
      const nextRaw = raw[i + 1];
      // Chỉ gộp cặp nhãn/giá trị khi NHÃN thật sự ngắn (≤50 ký tự). Nhãn dài
      // hơn là câu văn (vd caption ảnh cào về) — gộp sẽ đẩy cột value thành
      // khe hẹp, chữ rớt từng từ một (đã dính thật ở SP loa tranh HW-LS60D).
      if (
        current.kind === "heading" &&
        current.text.length <= 50 &&
        nextRaw != null &&
        nextRaw.length > 0 &&
        nextRaw.length <= 120 &&
        !/^[•\-–—*]\s+/.test(nextRaw) &&
        !/[.!?:;,]$/.test(nextRaw)
      ) {
        if (!isSpecDuplicate(current.text, nextRaw)) {
          blocks.push({ kind: "row", label: current.text, value: nextRaw });
        }
        i++;
      } else if (hasSpecsTable && specGroups.has(norm(current.text))) {
        continue;
      } else if (
        hasSpecsTable &&
        current.kind === "heading" &&
        specLabels.has(norm(current.text))
      ) {
        // Tiêu đề lẻ trùng nhãn thông số (giá trị nằm ở các dòng sau
        // không gộp được) — bảng thông số đã có đủ.
        continue;
      } else {
        blocks.push({ kind: "line", line: current });
      }
    }
    return blocks;
  }, [product.description, product.descriptionImages, specRows, specLabels, specGroups]);
  const hasDescription = descriptionBlocks.length > 0 || highlights.length > 0;
  // Mặc định mở tab Mô tả sản phẩm.
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "qa">(
    "description",
  );



  const renderStars = (value: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = value >= index + 1;
          const half = !filled && value >= index + 0.5;
          return (
            <Star
              key={index}
              className={`h-4 w-4 ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : half
                  ? "fill-amber-200 text-amber-300"
                  : "text-muted-foreground/30"
              }`}
            />
          );
        })}
      </div>
    );
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return "";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="w-full space-y-6">
      {/* Tab Navigation Buttons Bar */}
      <div className="flex items-center justify-center border-b border-border">
        <div className="flex items-center gap-8 text-sm sm:text-base font-semibold">
          <button
            onClick={() => setActiveTab("description")}
            className={`pb-3 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "description"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Mô tả sản phẩm
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "reviews"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Đánh giá ({reviewCount})
          </button>

          <button
            onClick={() => setActiveTab("qa")}
            className={`pb-3 px-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "qa"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Hỏi đáp
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {/* TAB 1: MÔ TẢ — nội dung thật từ Product.description + đặc điểm nổi bật */}
        {activeTab === "description" && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-foreground">
              Mô tả {product.name}
            </h2>

            {highlights.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <h3 className="font-bold text-primary text-sm uppercase">
                  Đặc điểm nổi bật
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                  {highlights.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {descriptionBlocks.length > 0 && (
              <div className="max-w-none text-muted-foreground leading-relaxed space-y-3">
                {descriptionBlocks.map((block, index) =>
                  block.kind === "image" ? (
                    <figure key={index} className="py-2">
                      <img
                        src={(product.descriptionImages ?? [])[block.index]}
                        alt={`${product.name} - ảnh minh họa`}
                        loading="lazy"
                        className="w-full h-auto rounded-xl border border-border"
                      />
                    </figure>
                  ) : block.kind === "row" ? (
                    <div
                      key={index}
                      className="flex items-baseline justify-between gap-4 py-2 border-b border-border/60 last:border-b-0"
                    >
                      {/* Nhãn giới hạn 65% để lọt lưới heuristic cũng không đè
                          bẹp cột value thành khe chữ dọc (sự cố HW-LS60D). */}
                      <span className="font-semibold text-foreground text-sm min-w-0 max-w-[65%] break-words">
                        {block.label}
                      </span>
                      <span className="text-sm text-muted-foreground text-right min-w-0 break-words">
                        {block.value}
                      </span>
                    </div>
                  ) : block.line.kind === "heading" ? (
                    <h3
                      key={index}
                      className="font-bold text-foreground text-base pt-3 first:pt-0"
                    >
                      {block.line.text}
                    </h3>
                  ) : block.line.kind === "bullet" ? (
                    <p key={index} className="flex gap-2 pl-1">
                      <span className="text-primary shrink-0">•</span>
                      <span>{block.line.text}</span>
                    </p>
                  ) : (
                    <p key={index}>{block.line.text}</p>
                  ),
                )}
              </div>
            )}

            {!hasDescription && (
              <EmptyTabState message="Sản phẩm này chưa có mô tả chi tiết." />
            )}
          </div>
        )}

        {/* TAB HỎI ĐÁP */}
        {activeTab === "qa" && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <MessageCircleQuestion className="h-10 w-10 stroke-1" />
              <p className="text-sm font-semibold text-foreground">Hỏi đáp về sản phẩm</p>
              <p className="text-sm">Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!</p>
            </div>
          </div>
        )}

        {/* TAB 3: ĐÁNH GIÁ & NHẬN XÉT */}
        {activeTab === "reviews" && (
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-6 border-b border-border">
              {/* Rating Summary */}
              <div className="text-center border-r-0 md:border-r border-border md:pr-6 flex flex-col items-center justify-center">
                <div className="text-5xl font-black text-primary mb-2">
                  {averageRating.toFixed(1)}/5
                </div>
                <div className="mb-2">{renderStars(Math.round(averageRating * 2) / 2)}</div>
                <p className="text-xs text-muted-foreground font-medium">
                  {reviewCount} đánh giá từ khách hàng đã mua
                </p>
              </div>

              {/* Progress bars */}
              <div className="md:col-span-2 flex flex-col justify-center gap-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-3 font-semibold text-muted-foreground">{star}</span>
                    <Star className="w-3.5 h-3.5 text-muted-foreground/40 fill-current" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: star === 5 ? "75%" : star === 4 ? "18%" : "7%" }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">
                      {star === 5 ? "75%" : star === 4 ? "18%" : "7%"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Form */}
            <div className="space-y-4">
              <h3 className="font-bold text-foreground text-base">Gửi đánh giá của bạn</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Đánh giá chung:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 cursor-pointer transition-colors ${
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      }`}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm sử dụng thực tế của bạn với sản phẩm này..."
                className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-background text-foreground text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="rounded-xl px-6 h-10 shadow-sm"
                >
                  {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gửi nhận xét
                </Button>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4 pt-4 border-t border-border">
              {reviews.length === 0 && !loadingReviews ? (
                <p className="text-center text-muted-foreground text-sm py-6">
                  Chưa có đánh giá nào. Hãy là người đầu tiên nhận xét về sản phẩm này!
                </p>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 rounded-xl border border-border bg-muted/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {review.user?.name || "Khách hàng MegaMart"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Đã mua hàng
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    <div>{renderStars(review.rating)}</div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
