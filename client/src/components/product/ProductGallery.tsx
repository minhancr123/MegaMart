"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ZoomIn, Package } from "lucide-react";
import { handleImageError } from "@/lib/imageUtils";

interface ProductImage {
  id?: string;
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  displayOrder?: number;
  /** Biến thể (màu/cấu hình) sở hữu ảnh. Rỗng = ảnh chung cho mọi biến thể. */
  variantId?: string | null;
}

interface ProductGalleryProps {
  images?: ProductImage[];
  productName: string;
  /** % giảm giá của biến thể đang chọn - hiện badge góc trái ảnh chính */
  discountPercent?: number | null;
  /** Biến thể đang chọn - ưu tiên ảnh của biến thể này lên đầu gallery */
  variantId?: string | null;
}

export const ProductGallery = ({ images = [], productName, discountPercent, variantId }: ProductGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  /**
   * Sắp xếp ảnh: ảnh của biến thể đang chọn LUÔN lên trước, ảnh chung xếp sau.
   *
   * Lỗi cũ: gộp hai nhóm rồi sort chung theo isPrimary/displayOrder, nên ảnh
   * chung (bảng thông số, ảnh màu khác nhưng chưa gắn variantId) có
   * displayOrder nhỏ sẽ nhảy lên vị trí 0 và đè ảnh của màu đang chọn. Ví dụ
   * Dyson HD16: ảnh Ceramic Pink displayOrder=15 (variantId null) luôn đè ảnh
   * Amber silk (từ 16) dù khách đang chọn Amber silk.
   */
  const validImages = useMemo(() => {
    const byOrder = (a: ProductImage, b: ProductImage) => {
      if (!!a.isPrimary !== !!b.isPrimary) return a.isPrimary ? -1 : 1;
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    };
    const forVariant = images
      .filter((i) => variantId && i.variantId === variantId)
      .sort(byOrder);
    const shared = images.filter((i) => !i.variantId).sort(byOrder);
    // KHÔNG fallback sang ảnh của biến thể khác: ảnh Trắng hiện làm ảnh chính
    // khi khách chọn Đen thì sai hoàn toàn, thà hiện "Chưa có hình ảnh".
    return [...forVariant, ...shared];
  }, [images, variantId]);

  // Chuyển màu thì ảnh đầu cũng đổi, reset về ảnh đầu của màu mới.
  useEffect(() => {
    setSelectedIndex(0);
  }, [variantId]);

  const currentImage = validImages[selectedIndex] || validImages[0];

  return (
    <div className="flex flex-col gap-4 items-start w-full">
      {/* Main Large Image Container */}
      <div className="relative flex-1 w-full aspect-square bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex items-center justify-center p-6 group">
        {/* Badge giảm giá + trả góp góc trái trên ảnh chính */}
        <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1.5">
          {discountPercent != null && discountPercent > 0 && (
            <span className="rounded-md bg-[#fc4c00] px-2 py-1 text-xs font-black text-white shadow-sm">
              -{discountPercent}%
            </span>
          )}
          <span className="rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold text-[#c53b00] border border-orange-200">
            Trả góp 0%
          </span>
        </div>
        {currentImage?.url ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={currentImage.url}
              alt={currentImage.alt || productName}
              fill
              priority
              sizes="(min-width: 1024px) 500px, 100vw"
              className="object-contain transition-transform duration-500 group-hover:scale-105"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Package className="h-20 w-20 stroke-1 mb-2" />
            <span className="text-sm">Chưa có hình ảnh</span>
          </div>
        )}

        {/* Nút Zoom In góc trên bên phải */}
        <button
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-background/80 hover:bg-background border border-border text-foreground flex items-center justify-center shadow-sm opacity-80 hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"
          title="Phóng to ảnh"
          onClick={() => {
            if (currentImage?.url) {
              window.open(currentImage.url, "_blank");
            }
          }}
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Dải thumbnails ngang bên dưới ảnh chính */}
      {validImages.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto w-full pb-1">
          {validImages.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={img.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-muted/40 cursor-pointer ${
                  isSelected
                    ? "border-primary shadow-sm ring-2 ring-primary/20"
                    : "border-border hover:border-muted-foreground/40 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${productName} - thumbnail ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                  onError={handleImageError}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
