"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function PostsPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 10 };
            if (search) params.search = search;
            if (type !== "ALL") params.type = type;
            if (status !== "ALL") params.status = status;

            const res: any = await fetchPosts(params);
            console.log('Posts response:', res);
            
            // Handle both array and object responses
            let postsData = [];
            let meta = { totalPages: 1 };
            
            if (Array.isArray(res)) {
                postsData = res;
                meta = { totalPages: 1 };
            } else if (res?.data) {
                postsData = Array.isArray(res.data) ? res.data : res.data.data || [];
                meta = res.data.meta || res.meta || meta;
            } else {
                postsData = res;
            }
            
            setPosts(postsData);
            setTotalPages(meta.totalPages);
        } catch (error) {
            console.error("Failed to load posts", error);
            toast.error("Không thể tải danh sách bài viết");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [page, type, status]);

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

            <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
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

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
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
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Đang tải...</TableCell>
                            </TableRow>
                        ) : posts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Không có bài viết nào</TableCell>
                            </TableRow>
                        ) : (
                            posts.map((post: any) => (
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
                                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(post.id)}>
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
                <span className="py-2 px-4 bg-white rounded border">
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
        </div>
    );
}
