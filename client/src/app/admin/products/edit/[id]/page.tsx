"use client";

import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "@/lib/adminApi";
import { fetchProductById } from "@/lib/productApi";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [initialData, setInitialData] = useState<any>(null);

    useEffect(() => {
        if (id) {
            loadProduct();
        }
    }, [id]);

    const loadProduct = async () => {
        try {
            setFetching(true);
            const product = await fetchProductById(id);

            // Transform data to match form structure
            const formData = {
                id: product.id, // Add product ID for image upload
                name: product.name,
                slug: product.slug,
                description: product.description || "",
                brand: product.brand || "",
                categoryId: product.category?.id || "",
                variants: product.variants?.map((v: any) => ({
                    id: v.id,
                    sku: v.sku,
                    price: Number(v.price),
                    stock: v.stock,
                    attributes: v.attributes || {}
                })) || [],
                images: product.images?.map((img: any) => img.url) || []
            };

            setInitialData(formData);
        } catch (error) {
            console.error("Failed to load product", error);
            toast.error("Không thể tải thông tin sản phẩm");
            router.push("/admin/products");
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            setLoading(true);
            await updateProduct(id, data);
            toast.success("Cập nhật sản phẩm thành công");
            router.push("/admin/products");
        } catch (error) {
            console.error("Failed to update product", error);
            toast.error("Có lỗi xảy ra khi cập nhật sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/products">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa sản phẩm</h1>
                    <p className="text-gray-500 mt-1">Cập nhật thông tin sản phẩm</p>
                </div>
            </div>

            {initialData && (
                <ProductForm
                    initialData={initialData}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            )}
        </div>
    );
}
