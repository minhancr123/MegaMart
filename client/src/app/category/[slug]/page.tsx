"use client";

import { fetchBrands, fetchCategoriesList, fetchProductsPaged } from "@/lib/productApi";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductsGridSkeleton } from "@/components/ui/skeleton";
import { Category, Product } from "@/interfaces/product";
import Link from "next/link";
import { BrandFilterBar } from "@/components/category/BrandFilterBar";

// Grid xl có 5 cột nên một trang 20 sản phẩm = vừa 4 hàng.
const PAGE_SIZE = 20;

type SortKey = "newest" | "price-asc" | "price-desc";

function findCategory(cats: Category[], slug: string): Category | null {
  for (const c of cats) {
    if (c.slug === slug) return c;
    const child = (c.children ?? []).find((k) => k.slug === slug);
    if (child) return child;
  }
  return null;
}

export default function CategoryPage() {
  const { slug } = useParams();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (đẩy hết lên server, giống trang /products)
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");

  // Đổi danh mục: reset hết bộ lọc + trang, tra categoryId từ slug.
  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    setPage(1);
    setSelectedBrand(null);
    setSelectedTag(null);
    setMinPrice(null);
    setMaxPrice(null);
    setSort("newest");
    setCategoryId(null);
    setCategoryName("");
    setBrands([]);
    setProducts([]);
    const resolve = async () => {
      try {
        const cats = (await fetchCategoriesList()) as Category[];
        if (!mounted) return;
        const found = findCategory(cats, slug as string);
        if (!found) {
          setError("Không tìm thấy danh mục này");
          return;
        }
        setCategoryId(found.id);
        setCategoryName(found.name);
        const brandRows = await fetchBrands({ categoryId: found.id });
        if (!mounted) return;
        setBrands(brandRows.map((b) => b.brand).filter(Boolean).slice(0, 10));
      } catch (err) {
        console.error(err);
        if (mounted) setError("Không thể tải danh mục này");
      }
    };
    void resolve();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // Tải sản phẩm theo trang + bộ lọc. Đổi bộ lọc là về trang 1.
  useEffect(() => {
    if (!categoryId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchProductsPaged({
          categoryId,
          brand: selectedBrand ? [selectedBrand] : undefined,
          minPrice: minPrice ?? undefined,
          maxPrice: maxPrice ?? undefined,
          sort,
          page,
          limit: PAGE_SIZE,
        });
        if (!mounted) return;
        setProducts(res.products);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        // Lọc xong còn ít trang hơn trang đang đứng thì lùi về trang cuối.
        if (res.totalPages > 0 && page > res.totalPages) setPage(res.totalPages);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError("Không thể tải sản phẩm cho danh mục này");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [categoryId, page, selectedBrand, minPrice, maxPrice, sort]);

  const goPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers: (number | "gap")[] = useMemo(() => {
    if (totalPages <= 1) return [];
    const pages = new Set<number>([1, totalPages]);
    for (let p = page - 2; p <= page + 2; p++) {
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const out: (number | "gap")[] = [];
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) out.push("gap");
      out.push(p);
      prev = p;
    }
    return out;
  }, [page, totalPages]);

  const pickTag = (t: string | null) => {
    setSelectedTag(t);
    if (t === "Dưới 5 triệu") {
      setMinPrice(null);
      setMaxPrice(5000000);
    } else if (t === "Từ 5 - 15 triệu") {
      setMinPrice(5000000);
      setMaxPrice(15000000);
    } else if (t === "Trên 15 triệu") {
      setMinPrice(15000000);
      setMaxPrice(null);
    } else {
      setMinPrice(null);
      setMaxPrice(null);
    }
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Breadcrumb dẫn đường */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-semibold">{categoryName || "Danh mục"}</span>
      </div>

      {/* 2. Brand Filter Bar chuẩn theo ảnh mẫu */}
      <BrandFilterBar
        categoryName={categoryName}
        brands={brands}
        selectedBrand={selectedBrand}
        onSelectBrand={(b) => {
          setSelectedBrand(b);
          setPage(1);
        }}
        extraTags={["Dưới 5 triệu", "Từ 5 - 15 triệu", "Trên 15 triệu"]}
        selectedTag={selectedTag}
        onSelectTag={pickTag}
      />

      {/* 3. Dòng Sắp xếp: Bán chạy | Giá thấp > cao | Giá cao > thấp */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm">
          <span className="font-bold text-foreground shrink-0">Sắp xếp theo:</span>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => {
                setSort("newest");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sort === "newest"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mới nhất
            </button>
            <button
              onClick={() => {
                setSort("price-asc");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sort === "price-asc"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Giá thấp → cao
            </button>
            <button
              onClick={() => {
                setSort("price-desc");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sort === "price-desc"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Giá cao → thấp
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Tìm thấy <span className="font-bold text-foreground">{total}</span> sản phẩm
        </div>
      </div>

      {/* 4. Danh sách sản phẩm dạng Grid */}
      <div className="min-w-0">
        {loading && (
          <ProductsGridSkeleton count={10} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5" />
        )}

        {error && <div className="text-destructive font-medium text-center py-10">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-5">
            {products.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
                Không tìm thấy sản phẩm phù hợp với bộ lọc thương hiệu/giá này.
              </div>
            )}
            {products.map((p) => (
              <div key={p.id} className="h-full min-w-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}

        {/* 5. Phân trang */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              className="cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {pageNumbers.map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goPage(p)}
                  className="min-w-9 cursor-pointer"
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
              className="cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
