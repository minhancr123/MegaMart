"use client";
import { useState, useEffect } from "react";
import PostForm from "@/components/admin/PostForm";
import { fetchPostById } from "@/lib/postsApi";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDownCircleIcon, ChevronLeft, Link } from "lucide-react";

interface Post {
    id: string;
    title: string;
    excerpt?: string;
    content: string;
    type: string;
    status: string;
    imageUrl?: string;
    tags?: string[];
}

export default function EditPostPage() {
    const params = useParams();
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPost = async () => {
            try {
                const res = await fetchPostById(params.id as string);
                setPost(res as Post);
            } catch (error) {
                console.error("Failed to load post", error);
                toast.error("Không thể tải thông tin bài viết");
            } finally {
                setLoading(false);
            }
        };
        if (params.id) {
            loadPost();
        }
    }, [params.id]);

    if (loading) {
        return <div>Đang tải...</div>;
    }

    if (!post) {
        return <div>Không tìm thấy bài viết</div>;
    }

    return (
        <div className="space-y-6">
            <PostForm initialData={post} />
        </div>
    );
}
