"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Share2,
  Clock,
  Eye,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Airplay,
} from "lucide-react";
import { fetchPostById } from "@/lib/postsApi";

export default function NewsDetailPage() {
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        const data = await fetchPostById(params.id as string);
        setPost(data);
      } catch (error) {
        console.error("Failed to load post", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadPost();
    }
  }, [params.id]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleShare = () => {
    if (navigator.share && post) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết bài viết!");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] pt-[100px] md:pt-[120px] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-muted-foreground">Đang tải nội dung bài viết...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 pt-[100px] md:pt-[120px]">
        <Card className="border-border bg-card">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">Không tìm thấy bài viết hoặc bài viết đã bị gỡ.</p>
            <Link href="/news">
              <Button variant="outline" className="rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Quay lại tin tức
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pt-[90px] sm:pt-[110px] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* 1. Breadcrumb chuẩn Stitch */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <Link href="/news" className="hover:text-primary transition-colors">
            Tin tức &amp; Tư vấn
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
            {post.tags?.[0] || (post.type === "NEWS" ? "Hướng dẫn mua" : "Sự kiện")}
          </span>
        </div>

        {/* 2. Tiêu đề bài viết & Badge thể loại */}
        <div className="space-y-3">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/15 font-semibold text-xs rounded-md">
            {post.tags?.[0] || (post.type === "NEWS" ? "Hướng dẫn mua sắm" : "Sự kiện ưu đãi")}
          </Badge>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-snug sm:leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed pt-1">
              {post.excerpt}
            </p>
          )}

          {/* Dòng tác giả, ngày đăng, lượt xem, thời gian đọc & Nút chia sẻ */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3.5 border-y border-border text-xs sm:text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="w-4 h-4 text-primary" />
                <span>{post.author?.name || "Minh Anh"}</span>
              </div>

              <span className="text-border">•</span>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.publishedAt || post.createdAt)}</span>
              </div>

              <span className="text-border">•</span>

              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>18.426 lượt xem</span>
              </div>

              <span className="text-border">•</span>

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>7 phút đọc</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">Chia sẻ:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="rounded-lg h-8 px-2.5 text-xs gap-1.5 border-border"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Ảnh bài viết chính */}
        {(post.thumbnail || post.imageUrl) && (
          <div className="rounded-2xl overflow-hidden border border-border shadow-sm bg-card aspect-[16/9] relative">
            <img
              src={post.thumbnail || post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 4. Nội dung bài viết định dạng typography chuẩn Stitch */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm">
          <div
            className="prose prose-slate max-w-none text-foreground/90 leading-relaxed text-[15px] sm:text-base 
            [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3
            [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:my-4 [&_p]:leading-relaxed
            [&_strong]:text-foreground [&_strong]:font-semibold
            [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:list-disc [&_ul]:pl-5
            [&_ol]:my-4 [&_ol]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5
            [&_table]:w-full [&_table]:my-6 [&_table]:border-collapse [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:border [&_table]:border-border
            [&_th]:bg-primary/5 [&_th]:text-foreground [&_th]:p-3.5 [&_th]:text-left [&_th]:font-bold [&_th]:border-b [&_th]:border-border
            [&_td]:p-3.5 [&_td]:border-b [&_td]:border-border [&_td]:text-muted-foreground
            [&_tr:last-child_td]:border-b-0
            [&_img]:rounded-xl [&_img]:my-6 [&_img]:border [&_img]:border-border"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-8 mt-8 border-t border-border">
              <span className="text-xs text-muted-foreground mr-1">Chủ đề:</span>
              {post.tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Tag className="w-3 h-3 text-primary" />
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Box Thông tin Tác giả chuẩn Stitch */}
          <div className="mt-8 p-5 rounded-2xl bg-muted/20 border border-border flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 border border-primary/20">
              {post.author?.name ? post.author.name.slice(0, 2).toUpperCase() : "MA"}
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-foreground text-sm sm:text-base">
                {post.author?.name || "Minh Anh"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chuyên gia đánh giá thiết bị điện máy và gia dụng thông minh với nhiều năm kinh nghiệm tại MegaMart VN.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Nút Quay Lại Danh Sách */}
        <div className="pt-2 text-center">
          <Link href="/news">
            <Button variant="outline" className="rounded-xl px-6 border-border hover:bg-muted gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Xem tất cả tin tức &amp; tư vấn</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
