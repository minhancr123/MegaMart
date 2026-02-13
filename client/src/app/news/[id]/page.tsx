"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
} from "lucide-react";
import { fetchPostById } from "@/lib/postsApi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        const data = await fetchPostById(params.id as string);
        console.log('Post detail:', data);
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
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    return type === "NEWS" ? "Tin tức" : "Sự kiện";
  };

  const getTypeColor = (type: string) => {
    return type === "NEWS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Đã copy link bài viết!");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen pt-[100px] md:pt-[120px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-12 pt-[100px] md:pt-[120px]">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">Không tìm thấy bài viết</p>
              <Link href="/news">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Quay lại danh sách
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[100px] md:pt-[120px]">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/news">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Post Header */}
          <Card className="mb-6">
            <CardContent className="p-8">
              <Badge className={`${getTypeColor(post.type)} mb-4`}>
                {getTypeLabel(post.type)}
              </Badge>
              
              <h1 className="text-4xl font-bold mb-6 leading-tight">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="text-xl text-gray-600 mb-6">
                  {post.excerpt}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 pb-6 border-b">
                {post.author && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{post.author.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                </div>
                {post.readTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{post.readTime} phút đọc</span>
                  </div>
                )}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {post.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Image */}
          {post.imageUrl && (
            <Card className="mb-6 overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-auto object-cover"
              />
            </Card>
          )}

          {/* Post Content */}
          <Card>
            <CardContent className="p-8">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link href="/news">
              <Button variant="outline" size="lg" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh sách tin tức
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
    <Footer />
    </>
  );
}
