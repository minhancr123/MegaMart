"use client";
import { useState, useEffect } from "react";
import PostForm from "@/components/admin/PostForm";
import { fetchPostById } from "@/lib/postsApi";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
            </div>
        );
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
