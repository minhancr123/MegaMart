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
   * Sắp xếp ảnh: ảnh của biến thể đang chọn lên đầu, sau đó ảnh chính
   * (isPrimary), rồi theo displayOrder.
   *
   * Ảnh mang variantId thuộc đúng màu/cấu hình đó, nên khi khách bấm chọn màu
   * gallery phải đổi theo thay vì giữ nguyên ảnh cũ. Ảnh không có variantId là
   * ảnh chung, luôn dùng được cho mọi biến thể nên xếp sau nhưng vẫn hiện.
   */
  const validImages = useMemo(() => {
    const forVariant = images.filter((i) => variantId && i.variantId === variantId);
    const shared = images.filter((i) => !i.variantId);
    return [...forVariant, ...shared].sort((a, b) => {
      if (!!a.isPrimary !== !!b.isPrimary) return a.isPrimary ? -1 : 1;
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
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
