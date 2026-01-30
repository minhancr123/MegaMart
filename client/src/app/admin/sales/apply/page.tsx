"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Tag, Search, Plus } from "lucide-react";
import { salesApi } from "@/lib/salesApi";
import { fetchAllProducts } from "@/lib/productApi";
import { toast } from "sonner";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  slug: string;
  images: Array<{ url: string; isPrimary: boolean }>;
  variants: Array<{
    id: string;
    sku: string;
    price: string;
    attributes?: any;
    stock: number;
  }>;
}

export default function ApplySalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [saleStartDate, setSaleStartDate] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchAllProducts();
      const data = response.data?.data || response.data || [];
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVariant = (variantId: string) => {
    setSelectedVariants((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId]
    );
  };

  const handleToggleProduct = (product: Product) => {
    const variantIds = product.variants.map((v) => v.id);
    const allSelected = variantIds.every((id) => selectedVariants.includes(id));

    if (allSelected) {
      setSelectedVariants((prev) => prev.filter((id) => !variantIds.includes(id)));
    } else {
      setSelectedVariants((prev) => [...new Set([...prev, ...variantIds])]);
    }
  };

  const handleApplySale = async () => {
    if (selectedVariants.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 sản phẩm");
      return;
    }

    if (discountPercent <= 0 || discountPercent > 100) {
      toast.error("% giảm giá phải từ 1-100");
      return;
    }

    if (saleStartDate && saleEndDate && new Date(saleStartDate) >= new Date(saleEndDate)) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }

    try {
      setApplying(true);
      await salesApi.applySale({
        variantIds: selectedVariants,
        discountPercent,
        saleStartDate: saleStartDate || undefined,
        saleEndDate: saleEndDate || undefined,
      });

      toast.success(`Đã áp dụng sale ${discountPercent}% cho ${selectedVariants.length} sản phẩm`);
      router.push("/admin/sales");
    } catch (error) {
      console.error("Error applying sale:", error);
      toast.error("Không thể áp dụng sale");
    } finally {
      setApplying(false);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(price));
  };

  const calculateSalePrice = (originalPrice: string) => {
    const price = Number(originalPrice);
    const salePrice = price * (1 - discountPercent / 100);
    return formatPrice(salePrice.toString());
  };

  const filteredProducts = searchTerm
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.variants.some((v) => v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : products;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Áp dụng Sale</h1>
          <p className="text-gray-500 mt-1">Chọn sản phẩm và thiết lập % giảm giá</p>
        </div>
      </div>

      {/* Sale Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cấu hình Sale</CardTitle>
          <CardDescription>Thiết lập % giảm và thời gian áp dụng</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">% Giảm giá *</Label>
              <Input
                id="discount"
                type="number"
                min="1"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                placeholder="Ví dụ: 20"
              />
              <p className="text-xs text-gray-500">Từ 1% đến 100%</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Ngày bắt đầu (tùy chọn)</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={saleStartDate}
                onChange={(e) => setSaleStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Ngày kết thúc (tùy chọn)</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={saleEndDate}
                onChange={(e) => setSaleEndDate(e.target.value)}
              />
            </div>
          </div>

          {selectedVariants.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-orange-900">
                    Đã chọn {selectedVariants.length} sản phẩm
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Giảm giá: {discountPercent}%
                  </p>
                </div>
                <Button onClick={handleApplySale} disabled={applying}>
                  {applying ? "Đang áp dụng..." : "Áp dụng Sale"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Tìm kiếm sản phẩm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Tìm theo tên sản phẩm hoặc SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sản phẩm</CardTitle>
          <CardDescription>
            {filteredProducts.length} sản phẩm - {selectedVariants.length} đã chọn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-500">Đang tải...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Không tìm thấy sản phẩm</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const primaryImage = product.images?.find((img) => img.isPrimary)?.url;
                const allVariantsSelected = product.variants.every((v) =>
                  selectedVariants.includes(v.id)
                );

                return (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={allVariantsSelected}
                        onCheckedChange={() => handleToggleProduct(product)}
                      />
                      {primaryImage && (
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          width={60}
                          height={60}
                          className="rounded object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {product.variants.length} phiên bản
                        </p>

                        <div className="mt-3 space-y-2">
                          {product.variants.map((variant) => {
                            const isSelected = selectedVariants.includes(variant.id);
                            const salePrice = calculateSalePrice(variant.price);

                            return (
                              <div
                                key={variant.id}
                                className={`flex items-center justify-between p-3 rounded border ${
                                  isSelected ? "bg-orange-50 border-orange-300" : "bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleVariant(variant.id)}
                                  />
                                  <div>
                                    <div className="font-mono text-sm font-medium">
                                      {variant.sku}
                                    </div>
                                    {variant.attributes && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {JSON.stringify(variant.attributes)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500 line-through">
                                    {formatPrice(variant.price)}
                                  </div>
                                  <div className="text-lg font-bold text-orange-600">
                                    {salePrice}
                                  </div>
                                  <Badge variant="secondary" className="mt-1">
                                    -{discountPercent}%
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
