"use client";

import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "@/lib/adminApi";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreateProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [createdProductId, setCreatedProductId] = useState<string | null>(null);
    const [productCreated, setProductCreated] = useState(false);

    const handleSubmit = async (data: any) => {
        try {
            setLoading(true);
            const response = await createProduct(data);
            
            // Save product ID for image upload
            if (response?.data?.id) {
                setCreatedProductId(response.data.id);
                setProductCreated(true);
            }
            
            toast.success("Tạo sản phẩm thành công! Bạn có thể upload ảnh ngay bây giờ.");
        } catch (error) {
            console.error("Failed to create product", error);
            toast.error("Có lỗi xảy ra khi tạo sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.push("/admin/products");
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
                    <h1 className="text-3xl font-bold text-gray-900">Thêm sản phẩm mới</h1>
                    <p className="text-gray-500 mt-1">
                        {productCreated 
                            ? "Sản phẩm đã được tạo! Bạn có thể upload ảnh hoặc quay lại danh sách." 
                            : "Tạo sản phẩm mới cho cửa hàng của bạn"
                        }
                    </p>
                </div>
                {productCreated && (
                    <Button onClick={handleBack} variant="outline" className="ml-auto">
                        Hoàn tất & Quay lại
                    </Button>
                )}
            </div>

            <ProductForm 
                onSubmit={handleSubmit} 
                loading={loading} 
                initialData={createdProductId ? { id: createdProductId } : undefined}
            />
        </div>
    );
}
