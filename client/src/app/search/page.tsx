"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { ProductCard } from "@/components/product/ProductCard";
import { searchProducts } from "@/lib/productApi";
import { Search, Loader2, Filter, X, ChevronRight, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { addToCart } from "@/lib/cartApi";
import { toast } from "sonner";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { ProductsGridSkeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/eventTracker";

// Gợi ý khi tìm kiếm không ra gì
const POPULAR_SEARCHES = [
  "tivi samsung",
  "máy lạnh",
  "tủ lạnh",
  "máy giặt",
  "iphone",
  "laptop",
  "nồi chiên không dầu",
  "máy lọc không khí",
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const cartStore = useCartStore();
  const query = searchParams.get("query") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "newest">("relevance");

  // Filters State
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [minPriceInput, setMinPriceInput] = useState<string>("");
  const [maxPriceInput, setMaxPriceInput] = useState<string>("");
  const [appliedPriceRange, setAppliedPriceRange] = useState<{ min?: number; max?: number }>({});
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  useEffect(() => {
    if (query) {
      fetchSearchResults();
    } else {
      setLoading(false);
    }
  }, [query]);

  // Quy ước: gõ "#mã" (vd #ICC150AL) để tìm chính xác theo mã/SKU sản phẩm.
  // Server không hiểu dấu # nên lột ra trước khi gọi API.
  const effectiveQuery = query.trim().replace(/^#+/, "");

  const fetchSearchResults = async () => {
    setLoading(true);
    try {
      if (!effectiveQuery) {
        setProducts([]);
        return;
      }
      const params: any = {
        search: effectiveQuery,
        limit: 100, // Lấy tập kết quả rộng để filter mượt mà ở client
      };
      const response: any = await searchProducts(params);
      const productsData = Array.isArray(response) ? response : response?.data || [];
      setProducts(productsData);
      // Gửi sự kiện SEARCH để trang Analytics có "Từ khóa tìm kiếm phổ biến"
      track.search(effectiveQuery, productsData.length);
    } catch (error) {
      console.error("Search failed:", error);
      toast.error("Không thể tải kết quả tìm kiếm");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Trích xuất thương hiệu động từ kết quả tìm kiếm
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && typeof p.brand === "string" && p.brand.trim()) {
        set.add(p.brand.trim());
      }
    });
    return Array.from(set).slice(0, 8);
  }, [products]);

  // Bộ lọc sản phẩm
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Lọc theo Brand
    if (selectedBrand) {
      list = list.filter((p) => p.brand?.toLowerCase() === selectedBrand.toLowerCase());
    }

    // Lọc theo Công suất / Kích thước (Spec tag)
    if (selectedSpec) {
      list = list.filter((p) => {
        const text = (p.name || "").toLowerCase();
        return text.includes(selectedSpec.toLowerCase());
      });
    }

    // Lọc theo khoảng giá áp dụng
    if (appliedPriceRange.min !== undefined) {
      list = list.filter(
        (p) => Number(p.variants?.[0]?.salePrice || p.variants?.[0]?.price || p.price || 0) >= appliedPriceRange.min!
      );
    }
    if (appliedPriceRange.max !== undefined) {
      list = list.filter(
        (p) => Number(p.variants?.[0]?.salePrice || p.variants?.[0]?.price || p.price || 0) <= appliedPriceRange.max!
      );
    }

    // Sắp xếp
    if (sortBy === "price-asc") {
      list.sort(
        (a, b) =>
          Number(a.variants?.[0]?.price || a.price || 0) - Number(b.variants?.[0]?.price || b.price || 0)
      );
    } else if (sortBy === "price-desc") {
      list.sort(
        (a, b) =>
          Number(b.variants?.[0]?.price || b.price || 0) - Number(a.variants?.[0]?.price || a.price || 0)
      );
    } else if (sortBy === "newest") {
      list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    return list;
  }, [products, selectedBrand, selectedSpec, appliedPriceRange, sortBy]);

  // Phân trang
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleApplyPrice = () => {
    const min = minPriceInput ? Number(minPriceInput) : undefined;
    const max = maxPriceInput ? Number(maxPriceInput) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      toast.error("Giá bắt đầu không được lớn hơn giá kết thúc");
      return;
    }
    setAppliedPriceRange({ min, max });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setSelectedBrand(null);
    setSelectedSpec(null);
    setMinPriceInput("");
    setMaxPriceInput("");
    setAppliedPriceRange({});
    setSelectedRating(null);
    setSortBy("relevance");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(selectedBrand) ||
    Boolean(selectedSpec) ||
    appliedPriceRange.min !== undefined ||
    appliedPriceRange.max !== undefined;

  // Không có kết quả nào từ server và cũng không đang lọc gì:
  // ẩn sidebar + sort cho gọn, hiện gợi ý thay vì bộ lọc vô nghĩa.
  const showDiscovery =
    !loading && products.length === 0 && !hasActiveFilters;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-muted/10 pt-[90px] sm:pt-[110px] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Breadcrumb dẫn đường */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-semibold">Tìm kiếm</span>
        </div>

        {/* 2. Tiêu đề kết quả tìm kiếm */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Kết quả cho &lsquo;{query}&rsquo;
          </h1>
          <p className="text-sm text-muted-foreground">
            Tìm thấy <strong className="text-foreground font-bold">{filteredProducts.length}</strong> sản phẩm
          </p>
        </div>

        {/* 3. Bố cục 2 cột: Cột lọc bên trái (Sidebar) & Lưới sản phẩm bên phải */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI (3/12): BỘ LỌC TÌM KIẾM CHUẨN STITCH - ẩn khi không có gì để lọc */}
          {!showDiscovery && (
          <aside className="lg:col-span-3 space-y-6 bg-card border border-border rounded-2xl p-5 shadow-sm">
            {/* 3.1 Thương hiệu */}
            {availableBrands.length > 0 && (
              <div className="space-y-3 pb-5 border-b border-border">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Thương hiệu
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableBrands.map((b) => {
                    const isSelected = selectedBrand === b;
                    return (
                      <button
                        key={b}
                        onClick={() => {
                          setSelectedBrand(isSelected ? null : b);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:border-primary/50"
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3.2 Công suất / Kích cỡ */}
            <div className="space-y-3 pb-5 border-b border-border">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                Công suất / Kích cỡ
              </h3>
              <div className="flex flex-wrap gap-2">
                {["1 HP", "1.5 HP", "2 HP", "> 2 HP", "55 inch", "65 inch"].map((sp) => {
                  const isSelected = selectedSpec === sp;
                  return (
                    <button
                      key={sp}
                      onClick={() => {
                        setSelectedSpec(isSelected ? null : sp);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {sp}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3.3 Khoảng giá */}
            <div className="space-y-3 pb-5 border-b border-border">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                Khoảng giá (VNĐ)
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Từ"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
                <span className="text-muted-foreground text-xs">-</span>
                <Input
                  type="number"
                  placeholder="Đến"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <Button
                onClick={handleApplyPrice}
                size="sm"
                className="w-full h-9 rounded-xl font-bold text-xs"
              >
                Áp dụng
              </Button>
            </div>

            {/* 3.4 Đánh giá sao */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
                Đánh giá
              </h3>
              <div className="space-y-2">
                {[5, 4, 3].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedRating(selectedRating === star ? null : star)}
                    className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full p-1 rounded-lg ${
                      selectedRating === star ? "bg-primary/10 text-primary font-bold" : ""
                    }`}
                  >
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < star ? "fill-current" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span>từ {star} sao</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
          )}

          {/* CỘT PHẢI: KẾT QUẢ & SORT & TAGS CHUẨN STITCH */}
          <main className={`${showDiscovery ? "lg:col-span-12" : "lg:col-span-9"} space-y-5 min-w-0`}>
            {/* Hàng Tags đang lọc + Sắp xếp - ẩn khi không có kết quả */}
            {!showDiscovery && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
              {/* Tags đang được áp dụng */}
              <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
                {hasActiveFilters ? (
                  <>
                    <span className="text-xs text-muted-foreground mr-1">Đang lọc:</span>
                    {selectedBrand && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 pr-1.5 py-1 text-xs rounded-lg font-medium cursor-pointer"
                        onClick={() => setSelectedBrand(null)}
                      >
                        <span>Hãng: {selectedBrand}</span>
                        <X className="w-3 h-3 hover:text-destructive" />
                      </Badge>
                    )}
                    {selectedSpec && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 pr-1.5 py-1 text-xs rounded-lg font-medium cursor-pointer"
                        onClick={() => setSelectedSpec(null)}
                      >
                        <span>{selectedSpec}</span>
                        <X className="w-3 h-3 hover:text-destructive" />
                      </Badge>
                    )}
                    {(appliedPriceRange.min !== undefined || appliedPriceRange.max !== undefined) && (
                      <Badge
                        variant="secondary"
                        className="gap-1.5 pr-1.5 py-1 text-xs rounded-lg font-medium cursor-pointer"
                        onClick={() => {
                          setAppliedPriceRange({});
                          setMinPriceInput("");
                          setMaxPriceInput("");
                        }}
                      >
                        <span>
                          {appliedPriceRange.min ? `${appliedPriceRange.min / 1000000}M` : "0"} -{" "}
                          {appliedPriceRange.max ? `${appliedPriceRange.max / 1000000}M` : "∞"}
                        </span>
                        <X className="w-3 h-3 hover:text-destructive" />
                      </Badge>
                    )}
                    <button
                      onClick={handleClearAllFilters}
                      className="text-xs text-primary hover:underline font-semibold ml-2 cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Tất cả sản phẩm phù hợp</span>
                )}
              </div>

              {/* Dãy nút Sắp xếp theo */}
              <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-center">
                <span className="text-muted-foreground font-medium hidden sm:inline">Sắp xếp:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: "relevance", label: "Liên quan" },
                    { id: "price-asc", label: "Giá thấp → cao" },
                    { id: "price-desc", label: "Giá cao → thấp" },
                    { id: "newest", label: "Bán chạy" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSortBy(s.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        sortBy === s.id
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            )}

            {/* Lưới sản phẩm (Grid) */}
            {loading ? (
              <ProductsGridSkeleton count={8} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5" />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-14 sm:py-16 px-6 bg-card border border-border rounded-2xl space-y-3">
                <Search className="w-12 h-12 text-muted-foreground mx-auto stroke-1" />
                <h3 className="text-lg font-bold text-foreground">
                  Không tìm thấy sản phẩm nào
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Bộ lọc hiện tại loại hết kết quả. Thử nới bộ lọc hoặc xem gợi ý bên dưới."
                    : "Hãy thử từ khóa khác, hoặc tìm chính xác theo mã sản phẩm."}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Mẹo: gõ <span className="font-mono font-semibold text-foreground">#mã-sản-phẩm</span> để
                  tìm đúng 1 món (vd: <span className="font-mono">#ICC150AL</span>).
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {hasActiveFilters && (
                    <Button onClick={handleClearAllFilters} variant="outline" className="rounded-xl">
                      Xóa các bộ lọc
                    </Button>
                  )}
                  <Button onClick={() => router.push("/products")} className="rounded-xl">
                    Xem tất cả sản phẩm
                  </Button>
                </div>
                <div className="pt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                    Từ khóa phổ biến
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {POPULAR_SEARCHES.map((term) => (
                      <Link
                        key={term}
                        href={`/search?query=${encodeURIComponent(term)}`}
                        className="text-xs px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                      >
                        {term}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
                {paginatedProducts.map((product) => (
                  <div key={product.id} className="h-full min-w-0">
                    <ProductCard
                      product={product}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredProducts.length}
                  itemsPerPage={itemsPerPage}
                />
              </div>
            )}

            {/* Tìm kiếm liên quan - ẩn khi không có kết quả (từ khóa rác ghép vào nhìn kì) */}
            {!showDiscovery && (
              <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 mt-8">
                <h4 className="font-bold text-sm text-foreground">Tìm kiếm liên quan</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    `${effectiveQuery} chính hãng`,
                    `${effectiveQuery} giá rẻ`,
                    `${effectiveQuery} tiết kiệm điện`,
                    `${effectiveQuery} bảo hành 2 năm`,
                    `top ${effectiveQuery} bán chạy`,
                  ].map((term, idx) => (
                    <Link
                      key={idx}
                      href={`/search?query=${encodeURIComponent(term)}`}
                      className="text-xs px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
