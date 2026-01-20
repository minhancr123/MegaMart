"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { useRouter } from "next/navigation";
import { createPost, updatePost } from "@/lib/postsApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const postSchema = z.object({
    title: z.string().min(1, "Tiêu đề là bắt buộc"),
    content: z.string().min(1, "Nội dung là bắt buộc"),
    type: z.enum(["NEWS", "EVENT"]),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    thumbnail: z.string().optional(),
});

interface PostFormProps {
    initialData?: any;
}

export default function PostForm({ initialData }: PostFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof postSchema>>({
        resolver: zodResolver(postSchema),
        defaultValues: initialData || {
            title: "",
            content: "",
            type: "NEWS",
            status: "DRAFT",
            thumbnail: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof postSchema>) => {
        setLoading(true);
        try {
            if (initialData) {
                await updatePost(initialData.id, values);
                toast.success("Cập nhật bài viết thành công");
            } else {
                await createPost(values);
                toast.success("Tạo bài viết mới thành công");
            }
            router.push("/admin/posts");
            router.refresh();
        } catch (error) {
            console.error("Failed to save post", error);
            toast.error("Có lỗi xảy ra khi lưu bài viết");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tiêu đề</FormLabel>
                            <FormControl>
                                <Input placeholder="Nhập tiêu đề bài viết" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Loại bài viết</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn loại bài viết" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="NEWS">Tin tức</SelectItem>
                                        <SelectItem value="EVENT">Sự kiện</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Trạng thái</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn trạng thái" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="DRAFT">Nháp</SelectItem>
                                        <SelectItem value="PUBLISHED">Đã xuất bản</SelectItem>
                                        <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="thumbnail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ảnh bìa (URL)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nội dung</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Nhập nội dung bài viết..."
                                    className="min-h-[300px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Hủy
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? "Cập nhật" : "Tạo mới"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
