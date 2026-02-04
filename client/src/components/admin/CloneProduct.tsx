"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";

interface ProductVariant {
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, unknown>;
  colors?: unknown[];
}

interface ProductCategory {
  name: string;
}

interface Product {
  name: string;
  description: string;
  categoryId: string;
  category?: ProductCategory;
  variants?: ProductVariant[];
}

interface CloneProductProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CloneProduct({ product, open, onOpenChange, onSuccess }: CloneProductProps) {
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState(`${product?.name} (Copy)`);

  const handleClone = async () => {
    if (!product || !newName) {
      toast.error("Vui lòng nhập tên sản phẩm mới");
      return;
    }

    try {
      setLoading(true);
      
      // Clone product data
      const clonedData = {
        name: newName,
        description: product.description,
        categoryId: product.categoryId,
        variants: product.variants?.map((v: ProductVariant) => ({
          sku: `${v.sku}-COPY-${Date.now()}`,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
          colors: v.colors
        })) || []
      };

      await axiosClient.post("/products", clonedData);
      toast.success("Sao chép sản phẩm thành công!");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to clone product", error);
      toast.error(error?.response?.data?.message || "Không thể sao chép sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-blue-500" />
            Sao chép sản phẩm
          </DialogTitle>
          <DialogDescription>
            Tạo bản sao của &quot;{product?.name}&quot; với tất cả thông tin và biến thể.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="newName">Tên sản phẩm mới *</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nhập tên cho sản phẩm mới"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium text-gray-900">Thông tin sẽ được sao chép:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Mô tả sản phẩm</li>
              <li>Danh mục: {product?.category?.name}</li>
              <li>Số lượng biến thể: {product?.variants?.length || 0}</li>
              <li>Giá và tồn kho của từng biến thể</li>
              <li>Thuộc tính và màu sắc</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              * Ảnh sản phẩm không được sao chép. Bạn cần upload lại sau khi tạo.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleClone} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Copy className="w-4 h-4 mr-2" />
            Sao chép
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
