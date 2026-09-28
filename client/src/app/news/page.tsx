"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Newspaper, Search, TrendingUp } from "lucide-react";
import { fetchPosts } from "@/lib/postsApi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewsCardSkeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

type NewsPost = {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  thumbnail?: string | null;
  imageUrl?: string | null;
  type: "NEWS" | "EVENT";
  tags?: string[];
  publishedAt?: string | null;
  createdAt: string;
  author?: { name?: string | null };
};

const topics = [
  { value: "ALL", label: "Tất cả" },
  { value: "GUIDE", label: "Hướng dẫn mua" },
  { value: "TECH", label: "Tin công nghệ" },
  { value: "TIPS", label: "Mẹo sử dụng" },
  { value: "EVENT", label: "Khuyến mãi" },
] as const;

const stripHtml = (html?: string | null) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

const imageOf = (post: NewsPost) => post.thumbnail || post.imageUrl || "/images/stitch/hero-appliances.jpg";

const readTime = (post: NewsPost) => Math.max(3, Math.ceil(stripHtml(post.content).split(" ").length / 180));

const topicMatches = (post: NewsPost, topic: (typeof topics)[number]["value"]) => {
  if (topic === "ALL") return true;
  if (topic === "EVENT") return post.type === "EVENT";
  const tags = (post.tags || []).map((tag) => tag.toLocaleLowerCase("vi"));
  if (topic === "GUIDE") return tags.some((tag) => tag.includes("hướng dẫn") || tag.includes("review"));
  if (topic === "TECH") return tags.some((tag) => tag.includes("công nghệ"));
  return tags.some((tag) => tag.includes("mẹo"));
};

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState<(typeof topics)[number]["value"]>("ALL");

  useEffect(() => {
    let active = true;
    const loadPosts = async () => {
      setLoading(true);
      try {
        const response = await fetchPosts({ page, limit: 12, status: "PUBLISHED", search: search || undefined });
        const payload = response as unknown as {
          data?: NewsPost[] | { data?: NewsPost[]; meta?: { totalPages?: number } };
          meta?: { totalPages?: number };
        };
        const data = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : payload?.data?.data || [];
        const meta = (!Array.isArray(payload) && (payload?.meta || (!Array.isArray(payload.data) ? payload.data?.meta : undefined))) || {};
        if (active) {
          setPosts(data);
          setTotalPages(meta.totalPages || 1);
        }
      } catch (error) {
        console.error("Failed to load news", error);
        if (active) setPosts([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadPosts();
    return () => { active = false; };
  }, [page, search]);

  const filtered = useMemo(() => posts.filter((post) => topicMatches(post, topic)), [posts, topic]);
  const featured = filtered[0];
  const highlights = filtered.slice(1, 4);
  const cards = filtered.slice(1);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7f8fa] pb-16 pt-[112px] md:pt-[132px]">
        <div className="mm-container">
          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#c53b00]">
                <Newspaper className="h-4 w-4" /> Góc điện máy
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Tin tức &amp; Tư vấn</h1>
              <p className="mt-2 max-w-2xl text-slate-600">Cập nhật công nghệ mới, hướng dẫn mua sắm và mẹo sử dụng đồ điện tử hiệu quả.</p>
            </div>
            <form onSubmit={submitSearch} className="flex w-full max-w-md gap-2">
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm bài viết..." className="bg-white" />
              <Button type="submit" className="bg-[#fc4c00] hover:bg-[#c53b00]"><Search className="mr-2 h-4 w-4" />Tìm</Button>
            </form>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <NewsCardSkeleton />
              <NewsCardSkeleton />
              <NewsCardSkeleton />
            </div>
          ) : !featured ? (
            <div className="grid min-h-[320px] place-items-center rounded-2xl border border-slate-200 bg-white text-center">
              <div><Newspaper className="mx-auto mb-3 h-12 w-12 text-slate-300" /><p className="font-semibold text-slate-600">Chưa có bài viết phù hợp</p></div>
            </div>
          ) : (
            <>
              <section className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(310px,.8fr)]">
                <Link href={`/news/${featured.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative aspect-[16/8.5] overflow-hidden bg-slate-100">
                    <img src={imageOf(featured)} alt={featured.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <Badge className="absolute left-5 top-5 border-0 bg-[#fc4c00] text-white">{featured.tags?.[0] || "Tin nổi bật"}</Badge>
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                      <h2 className="max-w-3xl text-2xl font-black leading-tight sm:text-3xl">{featured.title}</h2>
                      <p className="mt-3 hidden max-w-2xl text-sm text-white/85 line-clamp-2 sm:block">{featured.excerpt || stripHtml(featured.content)}</p>
                      <div className="mt-4 flex items-center gap-4 text-xs text-white/75"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(featured.publishedAt || featured.createdAt)}</span><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{readTime(featured)} phút đọc</span></div>
                    </div>
                  </div>
                </Link>

                <div className="grid gap-3">
                  {highlights.map((post) => (
                    <Link key={post.id} href={`/news/${post.id}`} className="group grid min-w-0 grid-cols-[116px_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-shadow duration-300 hover:shadow-md">
                      <img src={imageOf(post)} alt="" className="h-24 w-full rounded-lg object-cover" />
                      <div className="min-w-0 py-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#c53b00]">{post.tags?.[0] || (post.type === "EVENT" ? "Khuyến mãi" : "Tin công nghệ")}</p>
                        <h3 className="mt-1 font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-[#c53b00]">{post.title}</h3>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(post.publishedAt || post.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <nav className="mt-10 flex gap-6 overflow-x-auto border-b border-slate-200" aria-label="Chủ đề bài viết">
                {topics.map((item) => (
                  <button key={item.value} onClick={() => setTopic(item.value)} className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-bold transition-colors ${topic === item.value ? "border-[#fc4c00] text-[#c53b00]" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{item.label}</button>
                ))}
              </nav>

              <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((post) => (
                    <Link key={post.id} href={`/news/${post.id}`} className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                        <img src={imageOf(post)} alt={post.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute left-3 top-3 rounded-md bg-[#fc4c00] px-2 py-1 text-[10px] font-extrabold uppercase text-white">{post.tags?.[0] || "Tin mới"}</span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="min-h-[2.75rem] font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-[#c53b00]">{post.title}</h3>
                        <p className="mt-2 text-sm leading-5 text-slate-600 line-clamp-2">{post.excerpt || stripHtml(post.content)}</p>
                        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-500"><span>{formatDate(post.publishedAt || post.createdAt)}</span><span>{readTime(post)} phút đọc</span></div>
                      </div>
                    </Link>
                  ))}
                </div>

                <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><TrendingUp className="h-5 w-5 text-[#fc4c00]" />Bài xem nhiều</h2>
                  <ol className="mt-4 divide-y divide-slate-100">
                    {filtered.slice(0, 5).map((post, index) => (
                      <li key={post.id}>
                        <Link href={`/news/${post.id}`} className="group grid grid-cols-[28px_1fr] gap-2 py-4">
                          <span className="text-2xl font-black text-slate-200 group-hover:text-orange-200">{index + 1}</span>
                          <span className="text-sm font-semibold leading-5 text-slate-700 line-clamp-2 group-hover:text-[#c53b00]">{post.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </aside>
              </section>

              {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Trước</Button>
                  <span className="grid min-w-10 place-items-center rounded-lg bg-[#fc4c00] px-3 text-sm font-bold text-white">{page}</span>
                  <Button variant="outline" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>Sau<ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
