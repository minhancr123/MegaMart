"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, Star } from "lucide-react";
import { useEffect, useState } from "react";
import axiosClient from "@/lib/axiosClient";
import { toast } from "sonner";

const productImageSchema = z.object({
    url: z.string().url("URL hình ảnh không hợp lệ"),
    isPrimary: z.boolean().optional(),
    alt: z.string().optional(),
});

const productSchema = z.object({
    name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
    slug: z.string().min(1, "Slug là bắt buộc"),
    description: z.string().optional(),
    brand: z.string().optional(),
    categoryId: z.string().min(1, "Danh mục là bắt buộc"),
    variants: z.array(
        z.object({
            id: z.string().optional(),
            sku: z.string().min(1, "SKU là bắt buộc"),
            price: z.coerce.number().min(0, "Giá phải lớn hơn hoặc bằng 0"),
            stock: z.coerce.number().min(0, "Tồn kho phải lớn hơn hoặc bằng 0"),
            attributes: z.any().optional(), // JSON string or object
        })
    ).min(1, "Phải có ít nhất 1 biến thể"),
    images: z.array(productImageSchema).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    initialData?: any;
    onSubmit: (data: ProductFormValues) => Promise<void>;
    loading?: boolean;
}

export function ProductForm({ initialData, onSubmit, loading }: ProductFormProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [imageInput, setImageInput] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [productId, setProductId] = useState(initialData?.id || null);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: initialData || {
            name: "",
            slug: "",
            description: "",
            brand: "",
            categoryId: "",
            variants: [{ sku: "", price: 0, stock: 0, attributes: {} }],
            images: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "variants",
    });

    const images = form.watch("images") || [];

    useEffect(() => {
        console.log("Current images:", images);
    }, [images]);

    useEffect(() => {
        fetchCategories();
        // Update productId when initialData changes
        if (initialData?.id) {
            setProductId(initialData.id);
        }
    }, [initialData]);

    const fetchCategories = async () => {
        try {
            const res: any = await axiosClient.get("/products/categories");
            // Flatten categories if they are nested or just take the list
            // Assuming the API returns a list or we need to process it
            // Based on previous view_file, getCategoryList returns nested children
            // Let's just use the top level and children for now
            const cats = res.data || [];
            const flattened: any[] = [];

            const traverse = (items: any[], level = 0) => {
                items.forEach(item => {
                    flattened.push({
                        ...item,
                        displayName: level > 0 ? `${'\u00A0\u00A0'.repeat(level)}└ ${item.name}` : item.name
                    });
                    if (item.children) traverse(item.children, level + 1);
                });
            };

            traverse(cats);
            setCategories(flattened);
        } catch (error) {
            console.error("Failed to fetch categories", error);
        }
    };

    const handleAddImage = async () => {
        if (!imageInput) return;

        if (!productId) {
            toast.error("Vui lòng tạo sản phẩm trước khi thêm ảnh");
            return;
        }

        // Check if URL already exists
        if (images.some(img => img.url === imageInput)) {
            toast.error("URL ảnh này đã tồn tại");
            return;
        }

        try {
            // Call API to save image URL to database
            const response = await axiosClient.post(
                `/admin/cloud-images/add-url/${productId}`,
                { url: imageInput }
            );

            // axiosClient interceptor returns response.data directly
            const result = response.data || response;

            if (result.success) {
                // Update form with new image object
                const newImage = {
                    url: imageInput,
                    isPrimary: images.length === 0, // First image is primary
                };
                form.setValue("images", [...images, newImage]);
                setImageInput("");
                toast.success("Thêm ảnh thành công");
            } else {
                toast.error(result.message || "Không thể thêm ảnh");
            }
        } catch (error: any) {
            console.error("Failed to add image:", error);
            const errorMessage = error.response?.data?.message || error.message || "Có lỗi xảy ra khi thêm ảnh";
            toast.error(errorMessage);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (!productId) {
            toast.error("Vui lòng tạo sản phẩm trước khi upload ảnh");
            return;
        }

        setUploadingImage(true);

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);

                const response = await axiosClient.post(
                    `/admin/cloud-images/upload/${productId}`,
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );

                // Handle different response structures
                const imageUrl = response.data?.imageUrl ||
                    (response as any).imageUrl ||
                    response.data?.url ||
                    (response as any).url ||
                    response.data?.data?.imageUrl ||
                    response.data?.data?.url;

                if (!imageUrl) {
                    console.error('Upload response:', response);
                    throw new Error('No image URL in response');
                }

                return imageUrl;
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            const currentImages = form.getValues("images") || [];

            // Convert URLs to image objects
            const newImages = uploadedUrls.map((url: string, index: number) => ({
                url,
                isPrimary: currentImages.length === 0 && index === 0, // First image is primary if no existing images
            }));

            form.setValue("images", [...currentImages, ...newImages]);

            toast.success(`Upload thành công ${uploadedUrls.length} ảnh`);
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Upload ảnh thất bại");
        } finally {
            setUploadingImage(false);
            // Reset input
            e.target.value = "";
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        // If removed image was primary and there are other images, make first one primary
        if (newImages.length > 0 && !newImages.some(img => img.isPrimary)) {
            newImages[0].isPrimary = true;
        }
        form.setValue("images", newImages);
    };

    const handleSetPrimaryImage = (index: number) => {
        const newImages = images.map((img, idx) => ({
            ...img,
            isPrimary: idx === index,
        }));
        form.setValue("images", newImages);
        toast.success("Đã đặt làm ảnh chính");
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Thông tin chung</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tên sản phẩm</FormLabel>
                                            <FormControl>
                                                <Input placeholder="iPhone 15 Pro Max" {...field} onChange={(e) => {
                                                    field.onChange(e);
                                                    // Auto generate slug
                                                    if (!initialData) {
                                                        const slug = e.target.value.toLowerCase()
                                                            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                                            .replace(/[đĐ]/g, "d")
                                                            .replace(/[^a-z0-9\s-]/g, "")
                                                            .replace(/\s+/g, "-");
                                                        form.setValue("slug", slug);
                                                    }
                                                }} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug (URL)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="iphone-15-pro-max" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Danh mục</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn danh mục" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {categories.map((cat) => (
                                                            <SelectItem key={cat.id} value={cat.id}>
                                                                {cat.displayName || cat.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="brand"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Thương hiệu</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Apple" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mô tả</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Mô tả chi tiết sản phẩm..." className="min-h-[150px]" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Biến thể (Variants)</span>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ sku: "", price: 0, stock: 0, attributes: {} })}>
                                        <Plus className="w-4 h-4 mr-2" /> Thêm biến thể
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-12 gap-4 items-end border p-4 rounded-lg bg-gray-50">
                                        <div className="col-span-3">
                                            <FormField
                                                control={form.control}
                                                name={`variants.${index}.sku`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">SKU</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="SKU-001" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <FormField
                                                control={form.control}
                                                name={`variants.${index}.price`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Giá (VNĐ)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <FormField
                                                control={form.control}
                                                name={`variants.${index}.stock`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Tồn kho</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <FormField
                                                control={form.control}
                                                name={`variants.${index}.attributes`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Thuộc tính (JSON)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder='{"color":"Red"}'
                                                                value={typeof field.value === 'object' ? JSON.stringify(field.value) : field.value}
                                                                onChange={(e) => {
                                                                    try {
                                                                        field.onChange(JSON.parse(e.target.value));
                                                                    } catch {
                                                                        // Allow typing invalid json temporarily
                                                                    }
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Hình ảnh</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* File Upload Button */}
                                <div>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="image-upload"
                                        disabled={uploadingImage || !productId}
                                    />
                                    <label
                                        htmlFor="image-upload"
                                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${uploadingImage || !productId
                                            ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                                            : "border-blue-300 bg-blue-50 hover:bg-blue-100"
                                            }`}
                                    >
                                        {uploadingImage ? (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                                                <p className="text-sm text-blue-600 font-medium">Đang upload...</p>
                                            </div>
                                        ) : !productId ? (
                                            <div className="flex flex-col items-center text-gray-400">
                                                <ImageIcon className="w-8 h-8 mb-2" />
                                                <p className="text-sm font-medium">Tạo sản phẩm trước</p>
                                                <p className="text-xs">để upload ảnh</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-blue-600">
                                                <Upload className="w-8 h-8 mb-2" />
                                                <p className="text-sm font-medium">Click để chọn ảnh</p>
                                                <p className="text-xs text-gray-500">hoặc kéo thả vào đây</p>
                                            </div>
                                        )}
                                    </label>
                                </div>

                                {/* URL Input (Optional) */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Hoặc nhập URL ảnh..."
                                        value={imageInput}
                                        onChange={(e) => setImageInput(e.target.value)}
                                    />
                                    <Button type="button" onClick={handleAddImage} size="icon">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Image Grid */}
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {images.map((image, index) => (
                                        <div key={index} className="relative group aspect-square rounded-md overflow-hidden border-2 bg-gray-100" style={{
                                            borderColor: image.isPrimary ? '#3b82f6' : '#e5e7eb'
                                        }}>
                                            <img src={image.url} alt={image.alt || ""} className="w-full h-full object-cover" />

                                            {/* Primary Badge */}
                                            {image.isPrimary && (
                                                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                    <Star className="w-3 h-3 fill-white" />
                                                    Ảnh chính
                                                </div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!image.isPrimary && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetPrimaryImage(index)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full shadow-lg"
                                                        title="Đặt làm ảnh chính"
                                                    >
                                                        <Star className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveImage(index)}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg"
                                                    title="Xóa ảnh"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {initialData ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
