"use client";

import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "@/lib/adminApi";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ProductFormValues } from "@/components/admin/ProductForm";

export default function CreateProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: ProductFormValues) => {
        try {
            setLoading(true);
            const response = await createProduct(data);
            const newId = response?.data?.id;

            toast.success("Tạo sản phẩm thành công! Chuyển sang trang chỉnh sửa để thêm ảnh...");
            // Sang trang Edit để upload ảnh / nhập thông số - khỏi ở lại trang
            // create với nút submit gây nhầm lẫn (bấm nữa là trùng SP)
            if (newId) {
                router.push(`/admin/products/edit/${newId}`);
            } else {
                router.push("/admin/products");
            }
        } catch (error: any) {
            console.error("Failed to create product", error);
            // Ưu tiên message rõ từ server (vd trùng slug/SKU)
            const serverMessage =
                error?.data?.message || error?.errormassage || error?.response?.data?.message;
            toast.error(serverMessage || "Có lỗi xảy ra khi tạo sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/products">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Thêm sản phẩm mới</h1>
                    <p className="text-muted-foreground mt-1">
                        Tạo sản phẩm mới cho cửa hàng của bạn
                    </p>
                </div>
            </div>

            <ProductForm
                onSubmit={handleSubmit}
                loading={loading}
            />
        </div>
    );
}
