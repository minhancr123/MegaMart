"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Tag,
} from "lucide-react";
import { fetchPosts } from "@/lib/postsApi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NewsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState<"ALL" | "NEWS" | "EVENT">("ALL");

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const params: any = {
          page,
          limit: 12,
          status: "PUBLISHED" // Only show published posts
        };
        if (search) params.search = search;
        if (type !== "ALL") params.type = type;

        const res: any = await fetchPosts(params);
        console.log('News response:', res);

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
        console.error("Failed to load news", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [page, type, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeLabel = (type: string) => {
    return type === "NEWS" ? "Tin tức" : "Sự kiện";
  };

  const getTypeColor = (type: string) => {
    return type === "NEWS" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  };

  // Helper function to strip HTML tags
  const stripHtml = (html: string | undefined | null): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-[100px] md:pt-[120px]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-4">
              <Newspaper className="w-10 h-10" />
              <h1 className="text-4xl font-bold">Tin tức & Sự kiện</h1>
            </div>
            <p className="text-blue-100 text-lg">
              Cập nhật tin tức công nghệ mới nhất và các sự kiện khuyến mãi hấp dẫn
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Filters & Search */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <Input
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" className="gap-2">
                  <Search className="w-4 h-4" />
                  Tìm kiếm
                </Button>
              </form>

              {/* Type Filter */}
              <div className="flex gap-2">
                <Button
                  variant={type === "ALL" ? "default" : "outline"}
                  onClick={() => { setType("ALL"); setPage(1); }}
                >
                  Tất cả
                </Button>
                <Button
                  variant={type === "NEWS" ? "default" : "outline"}
                  onClick={() => { setType("NEWS"); setPage(1); }}
                >
                  Tin tức
                </Button>
                <Button
                  variant={type === "EVENT" ? "default" : "outline"}
                  onClick={() => { setType("EVENT"); setPage(1); }}
                >
                  Sự kiện
                </Button>
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Chưa có bài viết nào</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {posts.map((post: any) => (
                  <Link key={post.id} href={`/news/${post.id}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden">
                      {post.imageUrl && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-3 right-3">
                            <Badge className={getTypeColor(post.type)}>
                              {getTypeLabel(post.type)}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <CardContent className="p-5">
                        {!post.imageUrl && (
                          <Badge className={`${getTypeColor(post.type)} mb-3`}>
                            {getTypeLabel(post.type)}
                          </Badge>
                        )}
                        <h3 className="text-xl font-semibold mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {stripHtml(post.excerpt) || stripHtml(post.content)?.substring(0, 150) + "..."}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                          </div>
                          {post.author && (
                            <div className="flex items-center gap-1">
                              <span>•</span>
                              <span>{post.author.name}</span>
                            </div>
                          )}
                        </div>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {post.tags.slice(0, 3).map((tag: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Trước
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
