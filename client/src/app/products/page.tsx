'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { fetchProductsPaged, fetchCategoriesList } from '@/lib/productApi';
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
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Pagination (do server quyết định, client chỉ giữ trang hiện tại)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const itemsPerPage = 12;

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

    // Đổi điều kiện lọc thì quay về trang 1, nếu không sẽ rơi vào trang trống
    useEffect(() => {
        // Việc đồng bộ trang hiện tại với bộ lọc là chủ ý; dữ liệu trang được tải ở effect kế tiếp.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [selectedCategory, debouncedSearch, debouncedPrice, sortBy]);

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
    }, [currentPage, debouncedSearch, debouncedPrice, selectedCategory, sortBy]);

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
        setPriceRange([0, 50000000]);
        setSearchQuery('');
        setSortBy('newest');
    };

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
                                    <div className="flex justify-center items-center gap-2 mt-12">
                                        <Button
                                            variant="outline"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Trước
                                        </Button>
                                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? 'default' : 'outline'}
                                                onClick={() => setCurrentPage(page)}
                                                className={
                                                    currentPage === page
                                                        ? 'bg-[#fc4c00] hover:bg-[#af3200] text-white rounded-full shadow-md'
                                                        : ''
                                                }
                                            >
                                                {page}
                                            </Button>
                                        ))}
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
