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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Loader2, Upload, Image as ImageIcon, Star, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axiosClient from "@/lib/axiosClient";
import { formatAttributeValue } from "@/lib/productAttributes";
import { toast } from "sonner";
import { AIGenerateDescription } from "./AIGenerateDescription";
import VariantQrDialog from "./VariantQrDialog";

// Hàm chuyển đổi mã hex sang tên màu tiếng Việt chi tiết
const getColorName = (hex: string): string => {
    if (!hex) return "Chưa chọn";
    
    // Phân tích RGB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // Tính độ sáng (0-255)
    const brightness = (r + g + b) / 3;
    
    // Tính độ bão hòa
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    // Màu xám (không có màu)
    if (saturation < 0.1) {
        if (brightness > 240) return "Trắng";
        if (brightness > 200) return "Xám nhạt";
        if (brightness > 160) return "Xám";
        if (brightness > 80) return "Xám đậm";
        if (brightness > 40) return "Xám tối";
        return "Đen";
    }

    // Xác định màu chính dựa trên RGB
    const rDiff = r - Math.max(g, b);
    const gDiff = g - Math.max(r, b);
    const bDiff = b - Math.max(r, g);

    // Đỏ
    if (rDiff > 30) {
        if (g > 100 && b < 100) return brightness > 180 ? "Cam nhạt" : brightness < 100 ? "Cam đậm" : "Cam";
        else if (g > 150) return "Vàng cam";
        else if (b > 100) return brightness > 180 ? "Hồng" : "Hồng đậm";
        else return brightness > 180 ? "Đỏ nhạt" : brightness < 100 ? "Đỏ đậm" : "Đỏ";
    }
    // Xanh lá
    else if (gDiff > 30) {
        if (r > 100) return "Vàng lá";
        else if (b > 100) return "Xanh lục";
        else return brightness > 180 ? "Xanh nhạt" : brightness < 100 ? "Xanh đậm" : "Xanh lá";
    }
    // Xanh dương
    else if (bDiff > 30) {
        if (r > 100) return brightness > 180 ? "Tím nhạt" : brightness < 100 ? "Tím đậm" : "Tím";
        else if (g > 100) return "Xanh ngọc";
        else return brightness > 180 ? "Xanh nhạt" : brightness < 100 ? "Xanh đậm" : "Xanh dương";
    }
    // Màu trộn
    else if (r > 150 && g > 150 && b < 100) {
        return brightness > 200 ? "Vàng nhạt" : brightness < 100 ? "Vàng đậm" : "Vàng";
    } else if (r > 150 && b > 150 && g < 100) {
        return "Hồng tím";
    } else if (g > 150 && b > 150 && r < 100) {
        return "Xanh lơ";
    } else if (r > 100 && g > 50 && b < 80) {
        return brightness > 150 ? "Nâu nhạt" : "Nâu";
    } else {
        return "Hỗn hợp";
    }
};

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
            colors: z.array(z.object({
                hex: z.string(),
                name: z.string(),
                imageUrl: z.string().optional()
            })).optional(),
            attributes: z.any().optional(), // JSON string or object
        })
    ).min(1, "Phải có ít nhất 1 biến thể"),
    images: z.array(productImageSchema).optional(),
    // URL ảnh minh họa xen trong mô tả - vị trí chèn là marker [DESCIMG:n]
    descriptionImages: z.array(z.string().url("URL ảnh không hợp lệ")).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export type { ProductFormValues };

interface ProductFormProps {
    initialData?: any;
    onSubmit: (data: ProductFormValues) => Promise<void>;
    loading?: boolean;
}

export function ProductForm({ initialData, onSubmit, loading }: ProductFormProps) {
    const [categories, setCategories] = useState<any[]>([]);
    const [imageInput, setImageInput] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [descImageInput, setDescImageInput] = useState("");
    // Index biến thể đang mở dialog QR (null = đóng)
    const [qrVariantIndex, setQrVariantIndex] = useState<number | null>(null);
    // Preview trạng thái URL đang nhập: idle | ok | error
    const [descUrlStatus, setDescUrlStatus] = useState<"idle" | "ok" | "error">("idle");
    // Index các ảnh trong danh sách bị lỗi tải (để gắn cờ đỏ)
    const [brokenDescImg, setBrokenDescImg] = useState<Set<number>>(new Set());
    // Ref tới ô textarea mô tả để chèn marker đúng vị trí con trỏ
    const descTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    // Chèn marker [DESCIMG:n] đúng chỗ con trỏ trong ô mô tả
    const insertDescMarkerAtCursor = (marker: string) => {
        const el = descTextareaRef.current;
        const current = form.getValues("description") || "";
        if (!el) {
            form.setValue(
                "description",
                `${current}${current && !current.endsWith("\n") ? "\n" : ""}${marker}\n`
            );
            return;
        }
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? current.length;
        const before = current.slice(0, start);
        const after = current.slice(end);
        const needNlBefore = before !== "" && !before.endsWith("\n");
        const needNlAfter = after !== "" && !after.startsWith("\n");
        form.setValue(
            "description",
            `${before}${needNlBefore ? "\n" : ""}${marker}${needNlAfter ? "\n" : ""}${after}`
        );
        const caret =
            (before + (needNlBefore ? "\n" : "") + marker).length + (needNlAfter ? 1 : 0);
        requestAnimationFrame(() => {
            el.focus();
            try {
                el.setSelectionRange(caret, caret);
            } catch {
                // Bỏ qua nếu trình duyệt không hỗ trợ
            }
        });
    };
    const [productId, setProductId] = useState(initialData?.id || null);
    
    // Dialog state for adding attributes
    const [attrDialog, setAttrDialog] = useState<{
        open: boolean;
        variantIndex: number | null;
        key: string;
        value: string;
    }>({
        open: false,
        variantIndex: null,
        key: "",
        value: ""
    });

    // Dialog state for adding colors
    const [colorDialog, setColorDialog] = useState<{
        open: boolean;
        variantIndex: number | null;
        hex: string;
        name: string;
        imageUrl: string;
    }>({
        open: false,
        variantIndex: null,
        hex: "#000000",
        name: "",
        imageUrl: ""
    });

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: initialData || {
            name: "",
            slug: "",
            description: "",
            brand: "",
            categoryId: "",
            variants: [{ sku: "", price: 0, stock: 0, colors: [], attributes: {} }],
            images: [],
            descriptionImages: [],
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
        
        // Load template from sessionStorage
        const templateData = sessionStorage.getItem('productTemplate');
        if (templateData && !initialData) {
            try {
                const template = JSON.parse(templateData);
                if (template.attributes) {
                    form.setValue('variants.0.attributes', template.attributes);
                }
                sessionStorage.removeItem('productTemplate'); // Clear after use
                toast.success(`Đã áp dụng template ${template.name}`);
            } catch (error) {
                console.error('Failed to load template', error);
            }
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

    // Bảng thông số kỹ thuật: lưu trong attributes.specsTable của BIẾN THỂ ĐẦU TIÊN
    // (đúng chỗ sidebar "Thông số kỹ thuật" ngoài trang sản phẩm đọc).
    const watchedFirstAttrs = form.watch("variants.0.attributes") as any;
    const specsRows: Array<{ label: string; value: string; group?: string }> =
        Array.isArray(watchedFirstAttrs?.specsTable) ? watchedFirstAttrs.specsTable : [];
    const setSpecsTable = (rows: Array<{ label: string; value: string; group?: string }>) => {
        const variants = form.getValues("variants") || [];
        if (variants.length === 0) {
            toast.error("Thêm ít nhất 1 biến thể trước khi nhập thông số");
            return;
        }
        const attrs = { ...((variants[0].attributes as any) || {}), specsTable: rows };
        form.setValue("variants.0.attributes", attrs);
    };

    const handleSubmit = (data: ProductFormValues) => {
        // Sync all colors to attributes.color (comma-separated) for each variant
        const processedData = {
            ...data,
            variants: data.variants.map(variant => {
                const attributes = variant.attributes || {};
                
                // If variant has colors, sync all colors to attributes
                if (variant.colors && variant.colors.length > 0) {
                    attributes.color = variant.colors.map(c => c.name).join(", ");
                }
                
                return {
                    ...variant,
                    attributes
                };
            })
        };
        
        return onSubmit(processedData);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
                                            <div className="flex items-center justify-between mb-2">
                                                <FormLabel>Mô tả</FormLabel>
                                                <AIGenerateDescription
                                                    productName={form.watch("name")}
                                                    category={categories.find(c => c.id === form.watch("categoryId"))?.name}
                                                    onGenerated={(desc) => form.setValue("description", desc)}
                                                />
                                            </div>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Mô tả chi tiết sản phẩm..."
                                                    className="min-h-[150px]"
                                                    {...field}
                                                    ref={(el) => {
                                                        field.ref(el);
                                                        descTextareaRef.current = el;
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Ảnh minh họa xen trong mô tả ([DESCIMG:n]) */}
                                <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
                                    <p className="text-sm font-medium">Ảnh minh họa mô tả</p>
                                    <p className="text-xs text-muted-foreground">
                                        Bấm vào ô mô tả để đặt con trỏ đúng chỗ muốn chèn, rồi dán URL và bấm "Thêm ảnh" —
                                        marker sẽ nằm đúng vị trí đó. Lưu ý dùng <strong>link ảnh trực tiếp</strong> (mở
                                        được ảnh riêng, thường kết thúc bằng .jpg/.png/.webp); link trang web, link
                                        Google Drive/Facebook sẽ không hiện được.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="https://.../anh-minh-hoa.jpg"
                                            value={descImageInput}
                                            onChange={(e) => {
                                                setDescImageInput(e.target.value);
                                                setDescUrlStatus("idle");
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const url = descImageInput.trim();
                                                if (!url) return;
                                                try {
                                                    const parsed = new URL(url);
                                                    if (!["http:", "https:"].includes(parsed.protocol)) {
                                                        throw new Error("bad protocol");
                                                    }
                                                } catch {
                                                    toast.error("URL ảnh không hợp lệ");
                                                    return;
                                                }
                                                const current = form.getValues("descriptionImages") || [];
                                                if (current.includes(url)) {
                                                    toast.error("URL ảnh này đã tồn tại");
                                                    return;
                                                }
                                                const next = [...current, url];
                                                form.setValue("descriptionImages", next, { shouldValidate: true });
                                                insertDescMarkerAtCursor(`[DESCIMG:${next.length - 1}]`);
                                                setDescImageInput("");
                                                setDescUrlStatus("idle");
                                                toast.success("Đã thêm ảnh vào mô tả");
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Thêm ảnh
                                        </Button>
                                    </div>
                                    {/* Xem trước URL đang nhập - thấy ngay link có tải được ảnh không */}
                                    {descImageInput.trim() !== "" && descUrlStatus !== "error" && (
                                        <div className="flex items-center gap-2 rounded-md border bg-gray-50 p-2">
                                            <img
                                                key={descImageInput.trim()}
                                                src={descImageInput.trim()}
                                                alt="Xem trước"
                                                className="h-16 w-16 rounded object-cover border"
                                                onLoad={() => setDescUrlStatus("ok")}
                                                onError={() => setDescUrlStatus("error")}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {descUrlStatus === "ok"
                                                    ? "Link tải được ảnh. Bấm Thêm ảnh để dùng."
                                                    : "Đang kiểm tra link ảnh..."}
                                            </p>
                                        </div>
                                    )}
                                    {descImageInput.trim() !== "" && descUrlStatus === "error" && (
                                        <p className="text-xs text-red-600 font-medium">
                                            Link này không tải được ảnh. Hãy mở link trong tab mới kiểm tra: phải hiện
                                            mỗi tấm ảnh (không phải trang web), rồi copy đúng URL đó.
                                        </p>
                                    )}
                                    {(form.watch("descriptionImages") || []).length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 pt-1">
                                            {(form.watch("descriptionImages") || []).map((url: string, index: number) => (
                                                <div key={`${url}-${index}`} className="relative group rounded-md overflow-hidden border bg-gray-100">
                                                    <img
                                                        src={url}
                                                        alt={`Minh họa ${index + 1}`}
                                                        className="w-full h-20 object-cover"
                                                        onLoad={() =>
                                                            setBrokenDescImg((prev) => {
                                                                if (!prev.has(index)) return prev;
                                                                const next = new Set(prev);
                                                                next.delete(index);
                                                                return next;
                                                            })
                                                        }
                                                        onError={() =>
                                                            setBrokenDescImg((prev) => new Set(prev).add(index))
                                                        }
                                                    />
                                                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                        [DESCIMG:{index}]
                                                    </span>
                                                    {brokenDescImg.has(index) && (
                                                        <span className="absolute bottom-1 left-1 right-1 bg-red-600/90 text-white text-[10px] px-1.5 py-0.5 rounded text-center">
                                                            Link lỗi
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const current = form.getValues("descriptionImages") || [];
                                                            form.setValue(
                                                                "descriptionImages",
                                                                current.filter((_, i) => i !== index)
                                                            );
                                                            setBrokenDescImg((prev) => {
                                                                const next = new Set<number>();
                                                                prev.forEach((i) => {
                                                                    if (i < index) next.add(i);
                                                                    else if (i > index) next.add(i - 1);
                                                                });
                                                                return next;
                                                            });
                                                            // Xóa marker của ảnh này và đánh lại số các marker sau nó
                                                            const desc = form.getValues("description") || "";
                                                            const updated = desc
                                                                .replace(/\[DESCIMG:(\d+)\]/g, (m, n) => {
                                                                    const k = Number(n);
                                                                    if (k === index) return "";
                                                                    if (k > index) return `[DESCIMG:${k - 1}]`;
                                                                    return m;
                                                                })
                                                                .replace(/\n{3,}/g, "\n\n");
                                                            form.setValue("description", updated);
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Xóa ảnh"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Biến thể (Variants)</span>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ sku: "", price: 0, stock: 0, colors: [], attributes: {} })}>
                                        <Plus className="w-4 h-4 mr-2" /> Thêm biến thể
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="border p-4 rounded-lg bg-gray-50 space-y-4">
                                        <div className="grid grid-cols-12 gap-4 items-end">
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
                                            <div className="col-span-4">
                                                <FormField
                                                    control={form.control}
                                                    name={`variants.${index}.attributes`}
                                                    render={({ field }) => {
                                                        const attributes = field.value || {};
                                                        // Bỏ qua object/mảng object (specsTable, colors...) vì React
                                                        // không render được - chúng đã có UI quản lý riêng.
                                                        const entries = Object.entries(attributes).filter(
                                                            ([, v]) =>
                                                                v == null ||
                                                                typeof v === "string" ||
                                                                typeof v === "number" ||
                                                                typeof v === "boolean" ||
                                                                (Array.isArray(v) &&
                                                                    v.every((i) => typeof i !== "object"))
                                                        );

                                                        const addAttribute = () => {
                                                            setAttrDialog({
                                                                open: true,
                                                                variantIndex: index,
                                                                key: "",
                                                                value: ""
                                                            });
                                                        };

                                                        const removeAttribute = (key: string) => {
                                                            const newAttrs = { ...attributes };
                                                            delete newAttrs[key];
                                                            field.onChange(newAttrs);
                                                        };

                                                        return (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Thuộc tính khác</FormLabel>
                                                                <FormControl>
                                                                    <div className="space-y-2">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {entries.map(([key, value]) => (
                                                                                <span
                                                                                    key={key}
                                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                                                                                >
                                                                                    <span className="font-medium text-slate-600">{key}:</span>
                                                                                    <span className="text-slate-800">{formatAttributeValue(value)}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => removeAttribute(key)}
                                                                                        className="ml-1 text-red-500 hover:text-red-700"
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                </span>
                                                                            ))}
                                                                            <button
                                                                                type="button"
                                                                                onClick={addAttribute}
                                                                                className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-slate-300 rounded text-xs text-slate-600 hover:border-slate-400 hover:text-slate-800"
                                                                            >
                                                                                <Plus className="w-3 h-3" />
                                                                                Thêm
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-11">
                                                <FormField
                                                    control={form.control}
                                                    name={`variants.${index}.colors`}
                                                    render={({ field }) => {
                                                        const colors = field.value || [];

                                                        const addColor = () => {
                                                            setColorDialog({
                                                                open: true,
                                                                variantIndex: index,
                                                                hex: "#000000",
                                                                name: "",
                                                                imageUrl: ""
                                                            });
                                                        };

                                                        const removeColor = (colorIndex: number) => {
                                                            const newColors = colors.filter((_: any, i: number) => i !== colorIndex);
                                                            field.onChange(newColors);
                                                            
                                                            // Update attributes.color with remaining colors (comma-separated)
                                                            const currentAttributes = form.getValues(`variants.${index}.attributes`) || {};
                                                            if (newColors.length > 0) {
                                                                const colorNames = newColors.map((c: any) => c.name).join(", ");
                                                                form.setValue(`variants.${index}.attributes`, {
                                                                    ...currentAttributes,
                                                                    color: colorNames
                                                                });
                                                            } else {
                                                                // Remove color from attributes if no colors left
                                                                const { color, ...remainingAttributes } = currentAttributes;
                                                                form.setValue(`variants.${index}.attributes`, remainingAttributes);
                                                            }
                                                        };

                                                        return (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Màu sắc & Ảnh</FormLabel>
                                                                <FormControl>
                                                                    <div className="space-y-2">
                                                                        {colors.length > 0 && (
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {colors.map((color: any, colorIndex: number) => (
                                                                                    <div
                                                                                        key={colorIndex}
                                                                                        className="flex items-center gap-2 p-2 border rounded bg-white"
                                                                                    >
                                                                                        <div
                                                                                            className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                                                                                            style={{ backgroundColor: color.hex }}
                                                                                        />
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="text-xs font-medium truncate">{color.name}</p>
                                                                                            {color.imageUrl && (
                                                                                                <img
                                                                                                    src={color.imageUrl}
                                                                                                    alt={color.name}
                                                                                                    className="w-full h-12 object-cover rounded mt-1"
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => removeColor(colorIndex)}
                                                                                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={addColor}
                                                                            className="w-full py-2 border-2 border-dashed border-slate-300 rounded text-sm text-slate-600 hover:border-slate-400 hover:text-slate-800 flex items-center justify-center gap-2"
                                                                        >
                                                                            <Plus className="w-4 h-4" />
                                                                            Thêm màu
                                                                        </button>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-1 flex flex-col gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Nhãn QR biến thể"
                                                    onClick={() => setQrVariantIndex(index)}
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Bảng thông số kỹ thuật */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span>Thông số kỹ thuật</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSpecsTable([...specsRows, { label: "", value: "", group: "" }])}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Thêm dòng
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    Hiện ở sidebar "Thông số kỹ thuật" ngoài trang sản phẩm. Nhóm (group) không bắt buộc.
                                </p>
                                {specsRows.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">Chưa có dòng nào.</p>
                                )}
                                {specsRows.map((row, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <Input
                                            placeholder="Nhóm (vd: Màn hình)"
                                            value={row.group || ""}
                                            onChange={(e) => {
                                                const next = [...specsRows];
                                                next[index] = { ...next[index], group: e.target.value };
                                                setSpecsTable(next);
                                            }}
                                            className="col-span-3 h-9 text-xs"
                                        />
                                        <Input
                                            placeholder="Tên thông số (vd: Độ phân giải)"
                                            value={row.label}
                                            onChange={(e) => {
                                                const next = [...specsRows];
                                                next[index] = { ...next[index], label: e.target.value };
                                                setSpecsTable(next);
                                            }}
                                            className="col-span-4 h-9 text-xs"
                                        />
                                        <Input
                                            placeholder="Giá trị (vd: 4K Ultra HD)"
                                            value={row.value}
                                            onChange={(e) => {
                                                const next = [...specsRows];
                                                next[index] = { ...next[index], value: e.target.value };
                                                setSpecsTable(next);
                                            }}
                                            className="col-span-4 h-9 text-xs"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSpecsTable(specsRows.filter((_, i) => i !== index))}
                                            className="col-span-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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
                                            borderColor: image.isPrimary ? 'var(--primary)' : '#e5e7eb'
                                        }}>
                                            <img src={image.url} alt={image.alt || ""} className="w-full h-full object-cover" />

                                            {/* Primary Badge */}
                                            {image.isPrimary && (
                                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
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
                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground p-1.5 rounded-full shadow-lg"
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

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {initialData ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Dialog for adding attributes */}
            <Dialog open={attrDialog.open} onOpenChange={(open) => setAttrDialog({ ...attrDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm thuộc tính</DialogTitle>
                        <DialogDescription>
                            Thêm thuộc tính cho biến thể (ví dụ: size, storage, material...)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tên thuộc tính</label>
                            <Input
                                placeholder="ví dụ: size, storage"
                                value={attrDialog.key}
                                onChange={(e) => setAttrDialog({ ...attrDialog, key: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Giá trị</label>
                            <Input
                                placeholder="ví dụ: M, 128GB"
                                value={attrDialog.value}
                                onChange={(e) => setAttrDialog({ ...attrDialog, value: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAttrDialog({ open: false, variantIndex: null, key: "", value: "" })}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (attrDialog.key.trim() && attrDialog.value.trim() && attrDialog.variantIndex !== null) {
                                    const currentAttrs = form.getValues(`variants.${attrDialog.variantIndex}.attributes`) || {};
                                    form.setValue(`variants.${attrDialog.variantIndex}.attributes`, {
                                        ...currentAttrs,
                                        [attrDialog.key.trim()]: attrDialog.value.trim()
                                    });
                                    setAttrDialog({ open: false, variantIndex: null, key: "", value: "" });
                                }
                            }}
                        >
                            Thêm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog for adding colors */}
            <Dialog open={colorDialog.open} onOpenChange={(open) => setColorDialog({ ...colorDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thêm màu sắc</DialogTitle>
                        <DialogDescription>
                            Thêm màu và ảnh cho biến thể này
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Chọn màu</label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="color"
                                    value={colorDialog.hex}
                                    onChange={(e) => {
                                        const hex = e.target.value;
                                        setColorDialog({ 
                                            ...colorDialog, 
                                            hex,
                                            name: getColorName(hex)
                                        });
                                    }}
                                    className="w-20 h-10 cursor-pointer"
                                />
                                <div className="flex items-center gap-2 flex-1 px-3 h-10 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md">
                                    <div
                                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                                        style={{ backgroundColor: colorDialog.hex }}
                                    />
                                    <span className="text-sm font-medium dark:text-gray-200">{getColorName(colorDialog.hex)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tên màu (tùy chỉnh)</label>
                            <Input
                                placeholder="ví dụ: Đỏ ruby, Xanh navy..."
                                value={colorDialog.name}
                                onChange={(e) => setColorDialog({ ...colorDialog, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL Ảnh (tùy chọn)</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://example.com/image.jpg"
                                    value={colorDialog.imageUrl}
                                    onChange={(e) => setColorDialog({ ...colorDialog, imageUrl: e.target.value })}
                                    className="flex-1"
                                />
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            if (!productId) {
                                                toast.error("Vui lòng tạo sản phẩm trước");
                                                return;
                                            }

                                            const formData = new FormData();
                                            formData.append('file', file);

                                            try {
                                                const response = await axiosClient.post(
                                                    `/admin/cloud-images/upload/${productId}`,
                                                    formData,
                                                    {
                                                        headers: {
                                                            'Content-Type': 'multipart/form-data',
                                                        },
                                                    }
                                                );

                                                const result = response.data || response;
                                                if (result.success && result.data?.url) {
                                                    setColorDialog({ ...colorDialog, imageUrl: result.data.url });
                                                    toast.success("Upload ảnh thành công");
                                                }
                                            } catch (error) {
                                                console.error("Upload failed:", error);
                                                toast.error("Upload ảnh thất bại");
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Upload className="w-4 h-4" />
                                    </Button>
                                </label>
                            </div>
                            {colorDialog.imageUrl && (
                                <img
                                    src={colorDialog.imageUrl}
                                    alt="Preview"
                                    className="w-full h-32 object-cover rounded border"
                                />
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setColorDialog({ open: false, variantIndex: null, hex: "#000000", name: "", imageUrl: "" })}
                        >
                            Hủy
                        </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    if (colorDialog.variantIndex !== null) {
                                        const currentColors = form.getValues(`variants.${colorDialog.variantIndex}.colors`) || [];
                                        const newColor = {
                                            hex: colorDialog.hex,
                                            name: colorDialog.name || getColorName(colorDialog.hex),
                                            imageUrl: colorDialog.imageUrl || undefined
                                        };

                                        const updatedColors = [...currentColors, newColor];
                                        form.setValue(`variants.${colorDialog.variantIndex}.colors`, updatedColors);

                                        // Sync all colors to attributes.color (comma-separated)
                                        const currentAttributes = form.getValues(`variants.${colorDialog.variantIndex}.attributes`) || {};
                                        const colorNames = updatedColors.map(c => c.name).join(", ");
                                        form.setValue(`variants.${colorDialog.variantIndex}.attributes`, {
                                            ...currentAttributes,
                                            color: colorNames
                                        });

                                        setColorDialog({ open: false, variantIndex: null, hex: "#000000", name: "", imageUrl: "" });
                                        toast.success("Đã thêm màu và cập nhật attributes");
                                    }
                                }}
                            >
                                Thêm màu
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Dialog nhãn QR biến thể */}
                {(() => {
                    const variants = form.watch("variants") || [];
                    const v = qrVariantIndex != null ? variants[qrVariantIndex] : undefined;
                    const sku = (v?.sku || "").trim();
                    if (qrVariantIndex == null) return null;
                    return (
                        <VariantQrDialog
                            open={qrVariantIndex != null}
                            onOpenChange={(open) => {
                                if (!open) setQrVariantIndex(null);
                            }}
                            sku={sku || "CHUA-CO-SKU"}
                            productName={form.watch("name") || ""}
                        />
                    );
                })()}
            </Form>
        );
    }
