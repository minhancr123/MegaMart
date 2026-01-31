"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Laptop, Headphones, Watch, Tablet, Home } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProductTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const templates = [
  {
    id: "smartphone",
    name: "Điện thoại",
    icon: Smartphone,
    color: "bg-blue-500",
    attributes: { RAM: "8GB", Storage: "128GB", Color: "Đen" },
    description: "Template cho smartphone với RAM, bộ nhớ, màu sắc"
  },
  {
    id: "laptop",
    name: "Laptop",
    icon: Laptop,
    color: "bg-purple-500",
    attributes: { RAM: "16GB", Storage: "512GB", CPU: "Intel i7", Screen: "15.6 inch" },
    description: "Template cho laptop với cấu hình chi tiết"
  },
  {
    id: "headphone",
    name: "Tai nghe",
    icon: Headphones,
    color: "bg-green-500",
    attributes: { Type: "Over-ear", Connection: "Bluetooth", Color: "Đen" },
    description: "Template cho tai nghe/headphone"
  },
  {
    id: "smartwatch",
    name: "Đồng hồ thông minh",
    icon: Watch,
    color: "bg-orange-500",
    attributes: { Size: "42mm", Material: "Aluminum", Color: "Bạc" },
    description: "Template cho smartwatch"
  },
  {
    id: "tablet",
    name: "Máy tính bảng",
    icon: Tablet,
    color: "bg-pink-500",
    attributes: { Storage: "64GB", Screen: "10.2 inch", Color: "Xám" },
    description: "Template cho tablet/iPad"
  },
  {
    id: "accessory",
    name: "Phụ kiện",
    icon: Home,
    color: "bg-gray-500",
    attributes: { Type: "Phụ kiện", Material: "Nhựa" },
    description: "Template chung cho phụ kiện"
  }
];

export function ProductTemplates({ open, onOpenChange }: ProductTemplatesProps) {
  const router = useRouter();

  const handleSelectTemplate = (template: typeof templates[0]) => {
    // Store template in sessionStorage
    sessionStorage.setItem('productTemplate', JSON.stringify({
      name: template.name,
      attributes: template.attributes
    }));
    
    // Navigate to create page
    router.push('/admin/products/create');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Chọn template sản phẩm</DialogTitle>
          <DialogDescription>
            Bắt đầu nhanh với template có sẵn thuộc tính phù hợp với loại sản phẩm
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="group p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className={`w-12 h-12 ${template.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(template.attributes).slice(0, 3).map((key) => (
                    <span key={key} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {key}
                    </span>
                  ))}
                  {Object.keys(template.attributes).length > 3 && (
                    <span className="text-xs text-gray-500">+{Object.keys(template.attributes).length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button variant="ghost" onClick={() => {
            router.push('/admin/products/create');
            onOpenChange(false);
          }}>
            Tạo từ đầu (không dùng template)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
