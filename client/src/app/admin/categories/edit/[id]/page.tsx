"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { fetchCategoryById, updateCategory, fetchAllCategories } from "@/lib/categoryApi";
import { toast } from "sonner";
import Link from "next/link";

const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  slug: z.string().min(1, "Slug là bắt buộc"),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  active: z.boolean(),
});

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  active: boolean;
}

type CategoryFormData = z.infer<typeof categorySchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      active: true,
    },
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setInitialLoading(true);
    try {
      const [categoryData, allCategories] = await Promise.all([
        fetchCategoryById(id),
        fetchAllCategories(),
      ]);

      setCategories(allCategories.filter((c: Category) => c.id !== id)); // Exclude self from parent options

      reset({
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description || "",
        parentId: categoryData.parentId || undefined,
        active: categoryData.active ?? true,
      });
    } catch (error) {
      console.error("Error loading category:", error);
      toast.error("Không thể tải thông tin danh mục");
      router.push("/admin/categories");
    } finally {
      setInitialLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    setValue("slug", generateSlug(name));
  };

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true);
    try {
      await updateCategory(id, data);
      toast.success("Cập nhật danh mục thành công");
      router.push("/admin/categories");
    } catch (error: unknown) {
      console.error("Error updating category:", error);
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật danh mục");
    } finally {
      setLoading(false);
    }
  };

  const parentCategories = categories.filter((c) => !c.parentId);

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/categories">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chỉnh sửa danh mục</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Cập nhật thông tin danh mục</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border dark:border-gray-800">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Tên danh mục <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            {...register("name")}
            onChange={handleNameChange}
            placeholder="VD: Điện thoại"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug <span className="text-red-500">*</span>
          </Label>
          <Input
            id="slug"
            {...register("slug")}
            placeholder="dien-thoai"
          />
          {errors.slug && (
            <p className="text-sm text-red-500">{errors.slug.message}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            URL thân thiện, tự động tạo từ tên danh mục
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Mô tả về danh mục..."
            rows={4}
          />
        </div>

        {/* Parent Category */}
        <div className="space-y-2">
          <Label htmlFor="parentId">Danh mục cha</Label>
          <Select 
            defaultValue={watch("parentId") || "none"}
            onValueChange={(value) => setValue("parentId", value === "none" ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn danh mục cha (nếu có)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không có (Danh mục gốc)</SelectItem>
              {parentCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Để trống nếu đây là danh mục gốc
          </p>
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label htmlFor="active">Trạng thái hoạt động</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">Hiển thị danh mục này trên website</p>
          </div>
          <Switch
            id="active"
            checked={watch("active")}
            onCheckedChange={(checked) => setValue("active", checked)}
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              "Cập nhật danh mục"
            )}
          </Button>
          <Link href="/admin/categories" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Hủy
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
