"use client";

import { fetchProductsByCategory } from "@/lib/productApi";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { ProductsGridSkeleton } from "@/components/ui/skeleton";
import { Product } from "@/interfaces/product";
import Link from "next/link";
import { BrandFilterBar } from "@/components/category/BrandFilterBar";

export default function CategoryPage() {
  const { slug } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    const loadCategory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchProductsByCategory(slug as string);
        if (!mounted) return;
        setProducts(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError("Không thể tải sản phẩm cho danh mục này");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadCategory();

    return () => {
      mounted = false;
    };
  }, [slug]);

  // Trích xuất danh sách thương hiệu thực tế từ các sản phẩm trong danh mục
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && typeof p.brand === "string" && p.brand.trim()) {
        set.add(p.brand.trim());
      }
    });
    return Array.from(set).slice(0, 10);
  }, [products]);

  // Tên hiển thị danh mục
  const categoryTitle = useMemo(() => {
    if (products[0]?.category?.name) return products[0].category.name;
    const s = String(slug || "");
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
  }, [products, slug]);

  // Lọc sản phẩm
  const filtered = useMemo(() => {
    let list = [...products];

    // Lọc theo Brand được chọn
    if (selectedBrand) {
      list = list.filter((p) => p.brand?.toLowerCase() === selectedBrand.toLowerCase());
    }

    // Lọc theo từ khóa tìm kiếm
    if (q && q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => {
        const pAny = p as any;
        return (pAny.tentask || p.name || pAny.title || pAny.tensp || "").toString().toLowerCase().includes(s);
      });
    }

    if (minPrice != null) list = list.filter((p) => (p.price || p.variants?.[0]?.price || 0) >= minPrice!);
    if (maxPrice != null) list = list.filter((p) => (p.price || p.variants?.[0]?.price || 0) <= maxPrice!);

    if (sort === "price_asc") list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === "price_desc") list.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sort === "newest") {
      list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    return list;
  }, [products, selectedBrand, q, minPrice, maxPrice, sort]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Breadcrumb dẫn đường */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-semibold">{categoryTitle}</span>
      </div>

      {/* 2. Brand Filter Bar chuẩn theo ảnh mẫu */}
      <BrandFilterBar
        categoryName={categoryTitle}
        brands={availableBrands}
        selectedBrand={selectedBrand}
        onSelectBrand={setSelectedBrand}
        extraTags={["Dưới 5 triệu", "Từ 5 - 15 triệu", "Trên 15 triệu"]}
        selectedTag={selectedTag}
        onSelectTag={(t) => {
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
        }}
      />

      {/* 3. Dòng Sắp xếp: Bán chạy | Giá thấp > cao | Giá cao > thấp */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm">
          <span className="font-bold text-foreground shrink-0">Sắp xếp theo:</span>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => setSort("newest")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sort === "newest"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mới nhất
            </button>
            <button
              onClick={() => setSort("price_asc")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sort === "price_asc"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Giá thấp → cao
            </button>
            <button
              onClick={() => setSort("price_desc")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                sort === "price_desc"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Giá cao → thấp
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Tìm thấy <span className="font-bold text-foreground">{filtered.length}</span> sản phẩm
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
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground bg-card border border-border rounded-2xl">
                Không tìm thấy sản phẩm phù hợp với bộ lọc thương hiệu/giá này.
              </div>
            )}
            {filtered.map((p) => (
              <div key={p.id} className="h-full min-w-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
