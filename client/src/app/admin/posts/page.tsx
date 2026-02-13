"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { fetchPosts, deletePost } from "@/lib/postsApi";
import { toast } from "sonner";
import { format } from "date-fns";

interface PostAuthor {
    id: string;
    name: string;
}

interface Post {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    author?: PostAuthor;
}

export default function PostsPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 10 };
            if (search) params.search = search;
            if (type !== "ALL") params.type = type;
            if (status !== "ALL") params.status = status;

            const res = await fetchPosts(params);
            console.log('Posts response:', res);
            
            // Handle both array and object responses
            let postsData: Post[] = [];
            let meta = { totalPages: 1 };
            
            if (Array.isArray(res)) {
                postsData = res as Post[];
                meta = { totalPages: 1 };
            } else if ((res as { data?: unknown })?.data) {
                const responseData = (res as { data: unknown }).data;
                if (Array.isArray(responseData)) {
                    postsData = responseData as Post[];
                } else if ((responseData as { data?: Post[] })?.data) {
                    postsData = (responseData as { data: Post[] }).data;
                }
                const responseMeta = (responseData as { meta?: { totalPages: number } })?.meta || (res as { meta?: { totalPages: number } })?.meta;
                if (responseMeta) {
                    meta = responseMeta;
                }
            } else {
                postsData = res as Post[];
            }
            
            setPosts(postsData);
            setTotalPages(meta.totalPages);
        } catch (error: unknown) {
            console.error("Failed to load posts", error);
            toast.error("Không thể tải danh sách bài viết");
        } finally {
            setLoading(false);
        }
    }, [page, type, status, search]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadPosts();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;
        try {
            await deletePost(id);
            toast.success("Xóa bài viết thành công");
            loadPosts();
        } catch (error) {
            console.error("Failed to delete post", error);
            toast.error("Xóa bài viết thất bại");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Quản lý Tin tức & Sự kiện</h1>
                <Link href="/admin/posts/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm mới
                    </Button>
                </Link>
            </div>

            <div className="flex gap-4 items-center bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border dark:border-gray-800">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm bài viết..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Button type="submit" variant="secondary">Tìm kiếm</Button>
                </form>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Loại bài viết" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tất cả loại</SelectItem>
                        <SelectItem value="NEWS">Tin tức</SelectItem>
                        <SelectItem value="EVENT">Sự kiện</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                        <SelectItem value="DRAFT">Nháp</SelectItem>
                        <SelectItem value="PUBLISHED">Đã xuất bản</SelectItem>
                        <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border dark:border-gray-800 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="dark:bg-gray-800">
                            <TableHead>Tiêu đề</TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Tác giả</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-8 w-8" />
                                            <Skeleton className="h-8 w-8" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : posts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Không có bài viết nào</TableCell>
                            </TableRow>
                        ) : (
                            posts.map((post: Post) => (
                                <TableRow key={post.id}>
                                    <TableCell className="font-medium">{post.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={post.type === "EVENT" ? "default" : "secondary"}>
                                            {post.type === "EVENT" ? "Sự kiện" : "Tin tức"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={post.status === "PUBLISHED" ? "default" : post.status === "DRAFT" ? "outline" : "destructive"}>
                                            {post.status === "PUBLISHED" ? "Đã xuất bản" : post.status === "DRAFT" ? "Nháp" : "Lưu trữ"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{post.author?.name || "N/A"}</TableCell>
                                    <TableCell>{format(new Date(post.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/posts/edit/${post.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" 
                                                onClick={() => setDeleteId(post.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-center gap-2 mt-4">
                <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                    Trước
                </Button>
                <span className="py-2 px-4 bg-white dark:bg-gray-900 dark:text-white rounded border dark:border-gray-700">
                    Trang {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                    Sau
                </Button>
            </div>

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                onConfirm={() => deleteId && handleDelete(deleteId)}
                title="Xác nhận xóa bài viết"
                description="Bạn có chắc chắn muốn xóa bài viết này? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                variant="destructive"
                isLoading={isDeleting}
            />
        </div>
    );
}
