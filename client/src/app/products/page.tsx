'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { fetchProductsPaged, fetchCategoriesList, fetchBrands } from '@/lib/productApi';
import { useRouter } from 'next/navigation';
import { Product, Category } from '@/interfaces/product';
import { addToCart } from '@/lib/cartApi';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import {
    Filter,
    SlidersHorizontal,
    X,
    Grid3x3,
    List,
    Package,
    Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton, ProductsGridSkeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export default function ProductsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const cartStore = useCartStore();

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<{ brand: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Pagination (do server quyết định, client chỉ giữ trang hiện tại)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 36;

    // Gõ tới đâu gọi API tới đó sẽ đụng rate limit (3 req/giây), nên hoãn lại.
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debouncedPrice, setDebouncedPrice] = useState<[number, number]>([0, 50000000]);

    // Danh mục chỉ cần tải một lần
    useEffect(() => {
        fetchCategoriesList()
            .then((data) => setCategories(data || []))
            .catch(() => toast.error('Không thể tải danh mục'));
    }, []);

    // Hoãn ô tìm kiếm và thanh giá 400ms trước khi gọi API
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedPrice(priceRange), 400);
        return () => clearTimeout(t);
    }, [priceRange]);

    // Danh sách hãng đếm theo danh mục + từ khoá đang chọn, đổi 2 điều kiện đó là tải lại
    useEffect(() => {
        let cancelled = false;
        fetchBrands({
            search: debouncedSearch.trim() || undefined,
            categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        })
            .then((data) => { if (!cancelled) setBrands(data || []); })
            .catch(() => { if (!cancelled) setBrands([]); });
        return () => { cancelled = true; };
    }, [debouncedSearch, selectedCategory]);

    // Đổi điều kiện lọc thì quay về trang 1, nếu không sẽ rơi vào trang trống
    useEffect(() => {
        // Việc đồng bộ trang hiện tại với bộ lọc là chủ ý; dữ liệu trang được tải ở effect kế tiếp.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [selectedCategory, selectedBrands, debouncedSearch, debouncedPrice, sortBy]);

    const toggleBrand = (brand: string) => {
        setSelectedBrands((prev) =>
            prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
        );
    };

    // Lấy đúng một trang từ server, kèm toàn bộ điều kiện lọc
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            const page = await fetchProductsPaged({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch.trim() || undefined,
                categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
                brand: selectedBrands.length ? selectedBrands : undefined,
                minPrice: debouncedPrice[0] > 0 ? debouncedPrice[0] : undefined,
                maxPrice: debouncedPrice[1] < 50000000 ? debouncedPrice[1] : undefined,
                sort: sortBy,
            });
            // Bỏ qua kết quả của request đã cũ để không ghi đè lên request mới hơn
            if (cancelled) return;
            setProducts(page.products);
            setTotalItems(page.total);
            setTotalPages(page.totalPages);
            setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [currentPage, debouncedSearch, debouncedPrice, selectedCategory, selectedBrands, sortBy]);

    /**
     * Danh sách nút trang: luôn có trang 1 và trang cuối, kèm 2 trang bên cạnh
     * trang đang xem, các đoạn bị bỏ qua thay bằng dấu "…".
     *
     * Danh mục có vài nghìn sản phẩm nên hàng trăm trang. Kiểu cũ chỉ render 5
     * trang đầu, muốn tới trang cuối phải bấm "Sau" hàng trăm lần.
     */
    const pageNumbers: (number | 'gap')[] = useMemo(() => {
        if (totalPages <= 1) return [];
        const pages = new Set<number>([1, totalPages]);
        for (let p = currentPage - 2; p <= currentPage + 2; p++) {
            if (p >= 1 && p <= totalPages) pages.add(p);
        }
        const sorted = [...pages].sort((a, b) => a - b);
        const out: (number | 'gap')[] = [];
        let prev = 0;
        for (const page of sorted) {
            if (prev && page - prev > 1) out.push('gap');
            out.push(page);
            prev = page;
        }
        return out;
    }, [currentPage, totalPages]);

    const handleAddToCart = async (variantId: string, quantity: number) => {
        if (!user?.id) {
            router.push('/auth');
            return;
        }

        try {
            const response: any = await addToCart(user.id, variantId, quantity);
            if (response.success) {
                toast.success(response.message || 'Đã thêm sản phẩm vào giỏ hàng');
                
                // Cập nhật cartStore
                const product = products.find(p => p.variants?.some(v => v.id === variantId));
                if (product) {
                    const variant = product.variants?.find(v => v.id === variantId);
                    if (variant) {
                        cartStore.addItem({
                            id: parseInt(variantId),
                            name: product.name,
                            price: variant.price,
                            quantity: quantity,
                            imageUrl: product.images?.[0]?.url || ''
                        });
                    }
                }
            } else {
                toast.error(response.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            toast.error('Có lỗi xảy ra khi thêm sản phẩm');
        }
    };

    const handleViewDetails = (productId: string) => {
        router.push(`/product/${productId}`);
    };

    const resetFilters = () => {
        setSelectedCategory('all');
        setSelectedBrands([]);
        setPriceRange([0, 50000000]);
        setSearchQuery('');
        setSortBy('newest');
    };

    // Danh sách hãng dài (vài chục tới hàng trăm hãng), chỉ hiện 12 hãng đầu
    // rồi mới mở rộng, tránh một sidebar dài lê thê.
    const BRAND_COLLAPSED = 12;
    const [showAllBrands, setShowAllBrands] = useState(false);

    /**
     * Hãng đang chọn phải luôn hiện được, kể cả khi tìm kiếm/đổi danh mục làm
     * nó biến khỏi `brands` (count = 0). Nếu không, lựa chọn của khách biến
     * mất im lặng: gõ tìm kiếm không ra hãng đó rồi xoá tìm kiếm thì cũng mất
     * luôn, dù lúc nãy khách vừa bấm chọn.
     */
    const brandOptions: { brand: string; count: number }[] = useMemo(() => {
        const known = new Map(brands.map((b) => [b.brand, b.count]));
        for (const b of selectedBrands) {
            if (!known.has(b)) known.set(b, 0);
        }
        return [...known.entries()]
            .map(([brand, count]) => ({ brand, count }))
            .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
    }, [brands, selectedBrands]);

    const visibleBrands = showAllBrands
        ? brandOptions
        : brandOptions.slice(0, BRAND_COLLAPSED);

    // totalPages/totalItems do server trả về; products đã đúng là trang hiện tại.
    const currentProducts = products;

    // KHÔNG đổi lại thành component (`const FilterPanel = () => ...`): hàm đó được
    // tạo mới ở mỗi lần render, React coi là component khác nên huỷ rồi dựng lại cả
    // cây con -> ô <Input> mất focus sau đúng 1 ký tự, không gõ nổi từ khoá nào.
    // Để là một biến JSX thì nó chỉ là element, React giữ nguyên DOM.
    const filterPanel = (
        <div className="space-y-6">
            {/* Search */}
            <div>
                <Label className="text-sm font-semibold mb-2 block">Tìm kiếm</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Tìm sản phẩm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Category Filter */}
            <div>
                <Label className="text-sm font-semibold mb-3 block">Danh mục</Label>
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            console.log('🔘 Selected: All categories');
                            setSelectedCategory('all');
                        }}
                        className={`w-full text-left px-4 py-2 rounded-xl transition-colors ${selectedCategory === 'all'
                                ? 'bg-[#fc4c00]/10 text-[#af3200] font-medium'
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                    >
                        Tất cả sản phẩm
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => {
                                console.log('🔘 Selected category:', category.name, '| ID:', category.id);
                                setSelectedCategory(category.id);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-xl transition-colors ${selectedCategory === category.id
                                    ? 'bg-[#fc4c00]/10 text-[#af3200] font-medium'
                                    : 'hover:bg-slate-50 text-slate-600'
                                }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Brand Filter */}
            {brandOptions.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-semibold">Hãng</Label>
                        {selectedBrands.length > 0 && (
                            <button
                                onClick={() => setSelectedBrands([])}
                                className="text-xs text-[#af3200] hover:underline"
                            >
                                Bỏ chọn
                            </button>
                        )}
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {visibleBrands.map(({ brand, count }) => {
                            const checked = selectedBrands.includes(brand);
                            return (
                                <label
                                    key={brand}
                                    className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleBrand(brand)}
                                        className="w-4 h-4 rounded border-slate-300 text-[#fc4c00] focus:ring-[#fc4c00]/30 cursor-pointer"
                                    />
                                    <span className={`text-sm flex-1 truncate ${checked
                                        ? 'text-[#af3200] font-medium'
                                        : 'text-slate-600'}`}>
                                        {brand === 'other' ? 'Khác' : brand}
                                    </span>
                                    <span className="text-xs text-slate-400 tabular-nums">
                                        {count.toLocaleString('vi-VN')}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {brandOptions.length > BRAND_COLLAPSED && (
                        <button
                            onClick={() => setShowAllBrands((v) => !v)}
                            className="mt-2 text-xs font-medium text-[#af3200] hover:underline"
                        >
                            {showAllBrands
                                ? 'Thu gọn'
                                : `Xem tất cả ${brandOptions.length} hãng`}
                        </button>
                    )}
                </div>
            )}

            {/* Price Range */}
            <div>
                <Label className="text-sm font-semibold mb-3 block">Khoảng giá</Label>
                <div className="px-2">
                    <Slider
                        min={0}
                        max={50000000}
                        step={100000}
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                        className="mb-4"
                    />
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>{(priceRange[0] / 1000000).toFixed(1)}M</span>
                        <span>{(priceRange[1] / 1000000).toFixed(1)}M</span>
                    </div>
                </div>
            </div>

            {/* Reset Button */}
            <Button variant="outline" onClick={resetFilters} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Xóa bộ lọc
            </Button>
        </div>
    );

    return (
        <div className="py-8 dark:bg-gray-950">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Tất cả sản phẩm</h1>
                    {/* <div> (Skeleton) không được nằm trong <p> - HTML không cho phép,
                        trình duyệt tự đóng thẻ <p> lại và gây hydration error. */}
                    <div className="text-slate-600 dark:text-gray-400">
                        {loading ? (
                            <Skeleton className="h-5 w-64 inline-block" />
                        ) : (
                            `Khám phá ${totalItems.toLocaleString('vi-VN')} sản phẩm chất lượng cao`
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Desktop Filters */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <SlidersHorizontal className="w-5 h-5 text-[#af3200] dark:text-[#ff571a]" />
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bộ lọc</h2>
                            </div>
                            {filterPanel}
                        </div>
                    </aside>

                    {/* Products Area */}
                    <div className="lg:col-span-3">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div className="flex items-center gap-2">
                                {/* Mobile Filter */}
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" className="lg:hidden">
                                            <Filter className="w-4 h-4 mr-2" />
                                            Lọc
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-80">
                                        <SheetHeader>
                                            <SheetTitle>Bộ lọc</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6">
                                            {filterPanel}
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                {/* View Mode Toggle */}
                                <div className="hidden sm:flex gap-1 border border-slate-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded-xl ${viewMode === 'grid'
                                                ? 'bg-[#fc4c00]/10 text-[#af3200]'
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <Grid3x3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-xl ${viewMode === 'list'
                                                ? 'bg-[#fc4c00]/10 text-[#af3200]'
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Sort */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Sắp xếp" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Mới nhất</SelectItem>
                                    <SelectItem value="price-asc">Giá thấp → cao</SelectItem>
                                    <SelectItem value="price-desc">Giá cao → thấp</SelectItem>
                                    <SelectItem value="name-asc">Tên A → Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Active Filters */}
                        {(selectedCategory !== 'all' || searchQuery) && (
                            <div className="flex flex-wrap gap-2 mb-6">
                                {selectedCategory !== 'all' && (
                                    <Badge variant="secondary" className="px-3 py-1.5">
                                        {categories.find((c) => c.id === selectedCategory)?.name}
                                        <button
                                            onClick={() => setSelectedCategory('all')}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                                {searchQuery && (
                                    <Badge variant="secondary" className="px-3 py-1.5">
                                        Tìm kiếm: &ldquo;{searchQuery}&rdquo;
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="ml-2 hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Loading */}
                        {loading && (
                            <ProductsGridSkeleton count={8} className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-6" />
                        )}

                        {/* No Results */}
                        {!loading && products.length === 0 && (
                            <div className="text-center py-20">
                                <div className="w-24 h-24 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Package className="w-12 h-12 text-slate-400 dark:text-gray-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    Không tìm thấy sản phẩm
                                </h3>
                                <p className="text-slate-600 dark:text-gray-400 mb-6">
                                    Thử điều chỉnh bộ lọc hoặc tìm kiếm khác
                                </p>
                                <Button onClick={resetFilters} variant="outline">
                                    Xóa bộ lọc
                                </Button>
                            </div>
                        )}

                        {/* Products Grid */}
                        {!loading && products.length > 0 && (
                            <>
                                <div
                                    className={
                                        viewMode === 'grid'
                                            ? 'grid grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-6'
                                            : 'space-y-4'
                                    }
                                >
                                    {currentProducts.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                        />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Trước
                                        </Button>
                                        {pageNumbers.map((page, idx) =>
                                            page === 'gap' ? (
                                                <span key={`gap-${idx}`} className="px-2 text-muted-foreground select-none">
                                                    …
                                                </span>
                                            ) : (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    onClick={() => setCurrentPage(page as number)}
                                                    className={
                                                        currentPage === page
                                                            ? 'bg-[#fc4c00] hover:bg-[#af3200] text-white rounded-full shadow-md'
                                                            : ''
                                                    }
                                                >
                                                    {page}
                                                </Button>
                                            ),
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Sau
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
