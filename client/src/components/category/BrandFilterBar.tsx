"use client";

import { useState } from "react";
import { Filter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandFilterBarProps {
  categoryName: string;
  brands: string[];
  selectedBrand: string | null;
  onSelectBrand: (brand: string | null) => void;
  // Các tiêu chí nhanh ví dụ: Dung tích/Kích thước nếu có
  extraTags?: string[];
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
}

export const BrandFilterBar = ({
  categoryName,
  brands = [],
  selectedBrand,
  onSelectBrand,
  extraTags = [],
  selectedTag,
  onSelectTag,
}: BrandFilterBarProps) => {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 mb-6">
      {/* Tiêu đề Box (VD: Nồi chiên dành cho bạn / Tivi dành cho bạn) */}
      <h2 className="text-base sm:text-lg font-bold text-foreground">
        {categoryName ? `${categoryName} dành cho bạn` : "Sản phẩm dành cho bạn"}
      </h2>

      {/* Dãy nút Thương hiệu và Tiêu chí ngang */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {/* Nút Bộ lọc tổng thể */}
        <Button
          variant={selectedBrand ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectBrand(null)}
          className={`rounded-xl h-10 px-3.5 shrink-0 gap-1.5 font-bold text-xs sm:text-sm border-border cursor-pointer ${
            !selectedBrand ? "border-primary text-primary bg-primary/5" : ""
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Tất cả hãng</span>
        </Button>

        {/* Danh sách các logo / tên Thương hiệu nổi bật */}
        {brands.map((b) => {
          const isSelected = selectedBrand === b;
          return (
            <button
              key={b}
              onClick={() => onSelectBrand(isSelected ? null : b)}
              className={`h-10 px-4 rounded-xl border text-xs sm:text-sm font-bold shrink-0 transition-all flex items-center justify-center cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <span>{b}</span>
            </button>
          );
        })}

        {/* Các tags tiêu chuẩn kích thước / dung tích (như trong ảnh mẫu: Dưới 5 Lít, Từ 5-10 Lít, Trên 10 Lít) */}
        {extraTags.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              onClick={() => onSelectTag?.(isSelected ? null : tag)}
              className={`h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-medium shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};
