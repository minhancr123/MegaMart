"use client";

import { ProductForm, ProductFormValues } from "@/components/admin/ProductForm";
import ProductStockCard from "@/components/admin/ProductStockCard";
import { updateProduct } from "@/lib/adminApi";
import { fetchProductById } from "@/lib/productApi";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProductVariant {
    id: string;
    sku: string;
    price: number;
    stock: number;
    colors?: Array<{ name: string; hex: string; imageUrl?: string }>;
    attributes?: Record<string, unknown>;
}

interface ProductImage {
    url: string;
    isPrimary?: boolean;
    alt?: string;
}

interface ProductColor {
    name: string;
}

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const fromQuery = searchParams.get("from");
    const id = params.id as string;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [initialData, setInitialData] = useState<ProductFormValues | null>(null);

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
                variants: product.variants?.map((v: ProductVariant) => {
                    const attributes = v.attributes || {};
                    // Sync all colors to attributes.color (comma-separated)
                    if (v.colors && Array.isArray(v.colors) && v.colors.length > 0) {
                        attributes.color = v.colors.map((c: ProductColor) => c.name).join(", ");
                    }
                    return {
                        id: v.id,
                        sku: v.sku,
                        price: Number(v.price),
                        stock: v.stock,
                        colors: v.colors || [],
                        attributes
                    };
                }) || [],
                images: product.images?.map((img: ProductImage) => ({
                    url: img.url,
                    isPrimary: img.isPrimary || false,
                    alt: img.alt || ""
                })) || [],
                descriptionImages: (product as any).descriptionImages || []
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

    const handleSubmit = async (data: ProductFormValues) => {
        try {
            setLoading(true);
            await updateProduct(id, data);
            toast.success("Cập nhật sản phẩm thành công");
            
            // Reload product data instead of redirecting
            await loadProduct();
        } catch (error: any) {
            console.error("Failed to update product", error);
            const serverMessage =
                error?.data?.message || error?.errormassage || error?.response?.data?.message;
            toast.error(serverMessage || "Có lỗi xảy ra khi cập nhật sản phẩm");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[400px] gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <span className="text-muted-foreground text-sm font-medium animate-pulse">Đang tải dữ liệu sản phẩm...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                        if (fromQuery) {
                            router.push(`/admin/products${fromQuery.startsWith("?") ? fromQuery : `?${fromQuery}`}`);
                        } else if (window.history.length > 1) {
                            router.back();
                        } else {
                            router.push("/admin/products");
                        }
                    }}
                    title="Quay lại"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Chỉnh sửa sản phẩm</h1>
                    <p className="text-muted-foreground mt-1">Cập nhật thông tin sản phẩm</p>
                </div>
            </div>

            {initialData && (
                <ProductForm
                    initialData={initialData}
                    onSubmit={handleSubmit}
                    loading={loading}
                />
            )}

            <ProductStockCard productId={id} />
        </div>
    );
}
