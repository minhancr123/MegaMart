"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Pencil, Trash2, Plus, Search, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
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
        setIsDeleting(true);
        try {
            await deletePost(id);
            toast.success("Xóa bài viết thành công");
            loadPosts();
        } catch (error) {
            console.error("Failed to delete post", error);
            toast.error("Xóa bài viết thất bại");
        } finally {
            setIsDeleting(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                title="Quản lý Tin tức & Sự kiện"
                description="Tạo và quản lý bài viết tin tức, sự kiện"
                actions={
                    <Link href="/admin/posts/create">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm mới
                        </Button>
                    </Link>
                }
            />

            <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
                    <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="Loại bài viết" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tất cả loại</SelectItem>
                        <SelectItem value="NEWS">Tin tức</SelectItem>
                        <SelectItem value="EVENT">Sự kiện</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full lg:w-[180px]">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                        <SelectItem value="DRAFT">Nháp</SelectItem>
                        <SelectItem value="PUBLISHED">Đã xuất bản</SelectItem>
                        <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                    </SelectContent>
                </Select>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
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
                            <AdminTableSkeleton columns={6} />
                        ) : posts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                    <AdminEmptyState
                                        icon={FileText}
                                        title="Không có bài viết nào"
                                        description="Thử đổi bộ lọc hoặc tạo bài viết mới."
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            posts.map((post: Post) => (
                                <TableRow key={post.id}>
                                    <TableCell className="font-medium">{post.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={post.type === "EVENT" ? "info" : "secondary"}>
                                            {post.type === "EVENT" ? "Sự kiện" : "Tin tức"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={post.status === "PUBLISHED" ? "success" : post.status === "DRAFT" ? "outline" : "secondary"}>
                                            {post.status === "PUBLISHED" ? "Đã xuất bản" : post.status === "DRAFT" ? "Nháp" : "Lưu trữ"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{post.author?.name || "N/A"}</TableCell>
                                    <TableCell className="text-muted-foreground">{format(new Date(post.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/admin/posts/edit/${post.id}`}>
                                                <Button variant="ghost" size="icon" aria-label="Sửa bài viết">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                aria-label="Xóa bài viết"
                                                
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
            </Card>

            {!loading && totalPages > 1 && (
                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            )}

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
