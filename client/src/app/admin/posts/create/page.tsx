"use client";
import PostForm from "@/components/admin/PostForm";

export default function CreatePostPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Thêm bài viết mới</h1>
            <PostForm />
        </div>
    );
}
