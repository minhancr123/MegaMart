"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAllProducts } from "@/lib/productApi";
import { Product } from "@/interfaces/product";
import { ProductCard } from "@/components/product/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Filter } from "lucide-react";

export default function ProductsPage() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("query") || searchParams.get("q") || "";

    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [sortOption, setSortOption] = useState("newest");

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (products.length > 0) {
            filterProducts();
        }
    }, [products, searchQuery, sortOption]);

    // Update search query if URL param changes
    useEffect(() => {
        const query = searchParams.get("query") || searchParams.get("q") || "";
        if (query !== searchQuery) {
            setSearchQuery(query);
        }
    }, [searchParams]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await fetchAllProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
        }
    };

    const filterProducts = () => {
        let result = [...products];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query) ||
                p.category?.name?.toLowerCase().includes(query)
            );
        }

        // Sort
        if (sortOption === "price-asc") {
            result.sort((a, b) => Number(a.variants?.[0]?.price || 0) - Number(b.variants?.[0]?.price || 0));
        } else if (sortOption === "price-desc") {
            result.sort((a, b) => Number(b.variants?.[0]?.price || 0) - Number(a.variants?.[0]?.price || 0));
        } else {
            // Newest (default) - assuming higher ID or createdAt is newer, but here just default order
            // If we had createdAt, we would sort by it.
        }

        setFilteredProducts(result);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : "Tất cả sản phẩm"}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Tìm thấy {filteredProducts.length} sản phẩm
                    </p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <select
                        className="border rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                    >
                        <option value="newest">Mới nhất</option>
                        <option value="price-asc">Giá tăng dần</option>
                        <option value="price-desc">Giá giảm dần</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-lg">Không tìm thấy sản phẩm nào phù hợp.</p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchQuery(""); setSortOption("newest"); }}
                        className="mt-2 text-blue-600"
                    >
                        Xóa bộ lọc
                    </Button>
                </div>
            )}
        </div>
    );
}