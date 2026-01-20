'use client'
import { fetchProductsByCategory } from "@/lib/productApi";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function CategoryPage() {
    const { slug } = useParams();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [q, setQ] = useState("");
    const [minPrice, setMinPrice] = useState<number | null>(null);
    const [maxPrice, setMaxPrice] = useState<number | null>(null);
    const [sort, setSort] = useState<'newest'|'price_asc'|'price_desc'>('newest');

    useEffect(() => {
        if (!slug) return;
        let mounted = true;
        setLoading(true);
        setError(null);
        fetchProductsByCategory(slug as string)
            .then((res) => {
                if (!mounted) return;
                setProducts(Array.isArray(res) ? res : []);
            })
            .catch((err) => {
                console.error(err);
                if (!mounted) return;
                setError('Không thể tải sản phẩm cho danh mục này');
            })
            .finally(() => mounted && setLoading(false));

        return () => { mounted = false; };
    }, [slug]);

    const filtered = useMemo(() => {
        let list = [...products];
        if (q && q.trim()) {
            const s = q.toLowerCase();
            list = list.filter(p => (p.tentask || p.name || p.title || p.tensp || '').toString().toLowerCase().includes(s));
        }
        if (minPrice != null) list = list.filter(p => (p.price || (p.variants?.[0]?.price || 0)) >= minPrice!);
        if (maxPrice != null) list = list.filter(p => (p.price || (p.variants?.[0]?.price || 0)) <= maxPrice!);
        if (sort === 'price_asc') list.sort((a,b) => (a.price || 0) - (b.price || 0));
        if (sort === 'price_desc') list.sort((a,b) => (b.price || 0) - (a.price || 0));
        if (sort === 'newest') list.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return list;
    }, [products, q, minPrice, maxPrice, sort]);

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Danh mục: {slug}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters */}
                <aside className="col-span-1 bg-white p-4 rounded-md shadow-sm">
                    <h3 className="font-semibold mb-3">Bộ lọc</h3>
                    <div className="space-y-3">
                                    <div>
                                        <div className="text-sm text-gray-600">Tìm kiếm</div>
                                        <Input value={q} onChange={(e:any) => setQ(e.target.value)} placeholder="Tìm tên sản phẩm..." />
                                    </div>

                                    <div>
                                        <div className="text-sm text-gray-600">Giá từ</div>
                                        <Input value={minPrice ?? ''} onChange={(e:any) => setMinPrice(e.target.value ? Number(e.target.value) : null)} placeholder="0" type="number" />
                                    </div>

                                    <div>
                                        <div className="text-sm text-gray-600">Đến</div>
                                        <Input value={maxPrice ?? ''} onChange={(e:any) => setMaxPrice(e.target.value ? Number(e.target.value) : null)} placeholder="0" type="number" />
                                    </div>

                        <div>
                            <label className="text-sm text-gray-600">Sắp xếp</label>
                            <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full border rounded-md p-2">
                                <option value="newest">Mới nhất</option>
                                <option value="price_asc">Giá: thấp → cao</option>
                                <option value="price_desc">Giá: cao → thấp</option>
                            </select>
                        </div>

                        <div className="pt-3">
                            <Button onClick={() => { setQ(''); setMinPrice(null); setMaxPrice(null); setSort('newest'); }} variant="outline">Xóa bộ lọc</Button>
                        </div>
                    </div>
                </aside>

                {/* Products list */}
                <section className="col-span-3">
                    {loading && <div className="flex items-center justify-center"><Loader2 className="animate-spin"></Loader2><span>Đang tải sản phẩm</span></div>}
                    {error && <div className="text-red-600">{error}</div>}
                    {!loading && !error && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                            {filtered.length === 0 && <div className="col-span-full text-center text-gray-500">Không tìm thấy sản phẩm.</div>}
                            {filtered.map((p) => (
                                <div key={p.id} className="h-full">
                                    <ProductCard product={p} onAddToCart={() => {}} onViewDetails={() => {}} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}