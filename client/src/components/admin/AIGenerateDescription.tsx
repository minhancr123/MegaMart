"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AIGenerateDescriptionProps {
  productName: string;
  category?: string;
  onGenerated: (description: string) => void;
}

export function AIGenerateDescription({ productName, category, onGenerated }: AIGenerateDescriptionProps) {
  const [loading, setLoading] = useState(false);

  const generateDescription = async () => {
    if (!productName) {
      toast.error("Vui lòng nhập tên sản phẩm trước");
      return;
    }

    try {
      setLoading(true);
      
      // Simulate AI generation with smart templates
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const templates = [
        `${productName} là sản phẩm ${category || 'chất lượng cao'} được thiết kế với công nghệ hiện đại. Sản phẩm mang đến trải nghiệm tuyệt vời với hiệu suất vượt trội và độ bền cao.`,
        
        `Khám phá ${productName} - giải pháp hoàn hảo cho nhu cầu của bạn. Với thiết kế tinh tế và tính năng ưu việt, ${productName} sẽ là người bạn đồng hành đáng tin cậy trong mọi hoàn cảnh.`,
        
        `${productName} nổi bật với chất lượng đỉnh cao và giá cả hợp lý. Được làm từ vật liệu cao cấp, sản phẩm đảm bảo độ bền và hiệu suất ổn định trong thời gian dài.`,
        
        `Trải nghiệm sự khác biệt với ${productName}. Sản phẩm được tối ưu hóa để mang lại hiệu quả tối đa, phù hợp cho cả sử dụng cá nhân và chuyên nghiệp.`
      ];
      
      const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
      
      // Add category-specific features
      let description = randomTemplate;
      
      if (productName.toLowerCase().includes('iphone') || productName.toLowerCase().includes('phone')) {
        description += '\n\nĐặc điểm nổi bật:\n• Camera chất lượng cao\n• Pin lâu dùng\n• Hiệu năng mạnh mẽ\n• Thiết kế sang trọng';
      } else if (productName.toLowerCase().includes('laptop') || productName.toLowerCase().includes('macbook')) {
        description += '\n\nĐặc điểm nổi bật:\n• Hiệu năng xử lý vượt trội\n• Màn hình sắc nét\n• Thiết kế mỏng nhẹ\n• Thời lượng pin ấn tượng';
      } else if (productName.toLowerCase().includes('tai nghe') || productName.toLowerCase().includes('headphone')) {
        description += '\n\nĐặc điểm nổi bật:\n• Chất lượng âm thanh tuyệt hảo\n• Chống ồn chủ động\n• Kết nối ổn định\n• Thoải mái khi đeo lâu';
      } else {
        description += '\n\nĐặc điểm nổi bật:\n• Chất lượng cao\n• Bảo hành chính hãng\n• Giá cả cạnh tranh\n• Hỗ trợ khách hàng 24/7';
      }
      
      onGenerated(description);
      toast.success("Đã tạo mô tả sản phẩm!");
      
    } catch (error) {
      console.error("Failed to generate description", error);
      toast.error("Không thể tạo mô tả");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={generateDescription}
      disabled={loading || !productName}
      className="border-purple-200 text-purple-600 hover:bg-purple-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Đang tạo...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Tạo mô tả bằng AI
        </>
      )}
    </Button>
  );
}
