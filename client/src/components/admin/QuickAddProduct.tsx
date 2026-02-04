"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/lib/axiosClient";

interface Category {
  id: string;
  name: string;
}

interface QuickAddProductProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickAddProduct({ open, onOpenChange, onSuccess }: QuickAddProductProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    categoryId: "",
    sku: ""
  });

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const res = await axiosClient.get("/products/categories");
      setCategories(Array.isArray(res) ? res : res.data || []);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  };

  const generateSKU = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.stock || !formData.categoryId) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);
      
      // Create product với variant mặc định
      const productData = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: `Sản phẩm ${formData.name}`,
        variants: [
          {
            sku: formData.sku || generateSKU(),
            price: parseFloat(formData.price) * 100, // Convert to cents
            stock: parseInt(formData.stock),
            attributes: { default: "true" }
          }
        ]
      };

      await axiosClient.post("/products", productData);
      toast.success("Thêm sản phẩm thành công!");
      
      // Reset form
      setFormData({
        name: "",
        price: "",
        stock: "",
        categoryId: "",
        sku: ""
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Failed to create product", error);
      toast.error(error?.response?.data?.message || "Không thể tạo sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Thêm sản phẩm nhanh
          </DialogTitle>
          <DialogDescription>
            Tạo sản phẩm với thông tin cơ bản. Bạn có thể chỉnh sửa chi tiết sau.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Tên sản phẩm *</Label>
            <Input
              id="name"
              placeholder="VD: iPhone 15 Pro Max"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Giá bán (VNĐ) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="25000000"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock">Số lượng *</Label>
              <Input
                id="stock"
                type="number"
                placeholder="100"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Danh mục *</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sku">Mã SKU (tùy chọn)</Label>
            <div className="flex gap-2">
              <Input
                id="sku"
                placeholder="Để trống để tự động tạo"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({ ...formData, sku: generateSKU() })}
              >
                Tạo
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tạo sản phẩm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
