"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Loader2, Upload, X, Bold, Italic, List, 
  ListOrdered, Link as LinkIcon, Heading1, 
  Heading2, Image as ImageIcon, Code, Newspaper,
  Calendar, FileCheck, Archive, Save, XCircle, Tags as TagsIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createPost, updatePost } from "@/lib/postsApi";
import { tagsApi } from "@/lib/tagsApi";

// 1. Định nghĩa Schema Validation
const postSchema = z.object({
  title: z.string().min(1, "Tiêu đề là bắt buộc"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Nội dung là bắt buộc"),
  type: z.enum(["NEWS", "EVENT"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  imageUrl: z.string().optional(),
  tags: z.string().optional(),
});

interface PostFormProps {
  initialData?: any;
}

export default function PostForm({ initialData }: PostFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(initialData?.imageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(initialData?.tags) ? initialData.tags : []
  );
  const [tagInput, setTagInput] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch popular tags on mount
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        const tags = await tagsApi.getPopular(10);
        setPopularTags(tags.map(t => t.name));
      } catch (error) {
        console.error("Error fetching popular tags:", error);
      }
    };
    fetchPopularTags();
  }, []);

  // 2. Khởi tạo Form
  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title || "",
      excerpt: initialData?.excerpt || "",
      content: initialData?.content || "",
      type: initialData?.type || "NEWS",
      status: initialData?.status || "DRAFT",
      imageUrl: initialData?.imageUrl || "",
      tags: "",
    },
  });

  // 3. Xử lý Upload Ảnh (Base64)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('imageUrl', base64String);
        toast.success("Đã tải ảnh lên");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Có lỗi khi upload ảnh");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    form.setValue('imageUrl', "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 4. Các hàm bổ trợ định dạng nội dung (Rich Text Simulation)
  const insertFormatting = (before: string, after: string = "") => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = form.getValues('content');
    
    const selectedText = value.substring(start, end);
    const beforeText = value.substring(0, start);
    const afterText = value.substring(end);

    const newText = beforeText + before + selectedText + after + afterText;
    form.setValue('content', newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  // 5. Submit Form
  const onSubmit = async (values: z.infer<typeof postSchema>) => {
    setLoading(true);
    try {
      const submitData = {
        ...values,
        tags: selectedTags,
      };

      if (initialData?.id) {
        await updatePost(initialData.id, submitData);
        toast.success("Cập nhật bài viết thành công");
      } else {
        await createPost(submitData);
        toast.success("Tạo bài viết mới thành công");
      }
      
      router.push("/admin/posts");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi lưu bài viết");
    } finally {
      setLoading(false);
    }
  };

  // 6. Tag handlers
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags([...selectedTags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
        
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {initialData ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
          </h1>
          <p className="text-muted-foreground">
            {initialData ? "Cập nhật thông tin bài viết của bạn" : "Tạo một bài viết mới cho website"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tiêu đề */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Tiêu đề *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nhập tiêu đề bài viết..." 
                          className="text-lg" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Mô tả ngắn */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Mô tả ngắn</FormLabel>
                      <FormDescription>
                        Tóm tắt ngắn gọn về nội dung bài viết
                      </FormDescription>
                      <FormControl>
                        <Textarea 
                          placeholder="Viết mô tả ngắn gọn về bài viết..." 
                          className="resize-none min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Nội dung chính + Thanh công cụ */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Nội dung bài viết *</FormLabel>
                      <FormDescription>
                        Sử dụng các công cụ định dạng bên dưới để tạo nội dung
                      </FormDescription>
                      
                      {/* Toolbar */}
                      <div className="flex flex-wrap gap-1 p-2 border rounded-t-md bg-muted/50 mt-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<strong>', '</strong>')}
                          title="In đậm"
                        >
                          <Bold className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<em>', '</em>')}
                          title="In nghiêng"
                        >
                          <Italic className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border self-center mx-1" />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<h1 class="text-2xl font-bold mb-4">', '</h1>')}
                          title="Tiêu đề 1"
                        >
                          <Heading1 className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<h2 class="text-xl font-bold mb-3">', '</h2>')}
                          title="Tiêu đề 2"
                        >
                          <Heading2 className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border self-center mx-1" />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<ul class="list-disc ml-6 mb-4">\n  <li>', '</li>\n</ul>')}
                          title="Danh sách"
                        >
                          <List className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<ol class="list-decimal ml-6 mb-4">\n  <li>', '</li>\n</ol>')}
                          title="Danh sách số"
                        >
                          <ListOrdered className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border self-center mx-1" />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const url = prompt("Nhập link:");
                            if(url) insertFormatting(`<a href="${url}" class="text-blue-600 hover:text-blue-800 underline">`, '</a>')
                          }}
                          title="Chèn link"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => insertFormatting('<code class="bg-gray-100 px-2 py-1 rounded text-sm">', '</code>')}
                          title="Code"
                        >
                          <Code className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <FormControl>
                        <Textarea 
                          {...field} 
                          ref={(e) => {
                            field.ref(e);
                            // @ts-ignore
                            contentTextareaRef.current = e;
                          }}
                          className="min-h-[500px] rounded-t-none font-mono text-sm leading-relaxed" 
                          placeholder="Viết nội dung bài viết tại đây..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            
            {/* Loại & Trạng thái */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="text-base font-semibold mb-4">Thông tin bài viết</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại bài viết *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NEWS">
                            <div className="flex items-center gap-2">
                              <Newspaper className="w-4 h-4" />
                              Tin tức
                            </div>
                          </SelectItem>
                          <SelectItem value="EVENT">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Sự kiện
                            </div>
                          </SelectItem>
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
                      <FormLabel>Trạng thái *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">
                            <div className="flex items-center gap-2">
                              <FileCheck className="w-4 h-4" />
                              Nháp
                            </div>
                          </SelectItem>
                          <SelectItem value="PUBLISHED">
                            <div className="flex items-center gap-2">
                              <Save className="w-4 h-4" />
                              Đã xuất bản
                            </div>
                          </SelectItem>
                          <SelectItem value="ARCHIVED">
                            <div className="flex items-center gap-2">
                              <Archive className="w-4 h-4" />
                              Lưu trữ
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Ảnh bìa */}
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Ảnh bìa</FormLabel>
                      <FormDescription className="text-xs">
                        Tải lên ảnh bìa (tối đa 5MB)
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-4 mt-2">
                          {imagePreview ? (
                            <div className="relative group">
                              <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className="w-full aspect-video object-cover rounded-lg border shadow-sm" 
                              />
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" 
                                onClick={handleRemoveImage}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {uploadingImage ? (
                                <Loader2 className="w-10 h-10 mx-auto animate-spin text-muted-foreground mb-3" />
                              ) : (
                                <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                              )}
                              <p className="text-sm font-medium">Click để tải ảnh</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG, GIF (max. 5MB)
                              </p>
                            </div>
                          )}
                          <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <FormLabel className="text-base font-semibold flex items-center gap-2">
                      <TagsIcon className="w-4 h-4" />
                      Tags
                    </FormLabel>
                    <FormDescription className="text-xs mt-1">
                      Chọn từ tags phổ biến hoặc nhập tag mới (Enter để thêm)
                    </FormDescription>
                  </div>

                  {/* Selected Tags */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => (
                        <div
                          key={tag}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-full text-sm font-medium"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tag Input */}
                  <div>
                    <Input
                      placeholder="Nhập tag mới và nhấn Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      className="w-full"
                    />
                  </div>

                  {/* Popular Tags Suggestions */}
                  {popularTags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        Tags phổ biến:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {popularTags
                          .filter(tag => !selectedTags.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => addTag(tag)}
                              className="inline-flex items-center px-3 py-1 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-full text-sm transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Nút hành động */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 space-y-3">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {initialData ? "Cập nhật bài viết" : "Tạo bài viết"}
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.back()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Hủy
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>

      </form>
    </Form>
  );
}