'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/product/ProductCard';
import { fetchAllProducts, fetchCategoriesList } from '@/lib/productApi';
import { useRouter } from 'next/navigation';
import { Product, Category } from '@/interfaces/product';
import { addToCart } from '@/lib/cartApi';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import {
    Filter,
    SlidersHorizontal,
    X,
    Grid3x3,
    List,
    Package,
    Search,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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

    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000000]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [productsData, categoriesData] = await Promise.all([
                    fetchAllProducts(),
                    fetchCategoriesList(),
                ]);
                console.log('✅ Products loaded:', productsData);
                console.log('✅ Products count:', productsData?.length);
                console.log('✅ Categories loaded:', categoriesData);
                console.log('✅ Categories count:', categoriesData?.length);
                
                // Debug: Log category structure with parent info
                if (categoriesData?.length > 0) {
                    console.log('🏷️ Category structure:', categoriesData.map(c => ({
                        id: c.id,
                        name: c.name,
                        parentId: c.parentId,
                        slug: c.slug
                    })));
                }
                
                setProducts(productsData || []);
                setCategories(categoriesData || []);
            } catch (error) {
                console.error('❌ Error fetching data:', error);
                toast.error('Không thể tải sản phẩm');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Apply filters
    useEffect(() => {
        console.log('🔍 Starting filter with:', {
            totalProducts: products.length,
            selectedCategory,
            priceRange,
            searchQuery
        });
        
        let result = [...products];

        // Debug: Log first product structure (only once when products change)
        if (products.length > 0 && selectedCategory === 'all') {
            console.log('📦 Sample product structure:', {
                id: products[0].id,
                name: products[0].name,
                category: products[0].category,
                categoryId: products[0].categoryId,
                price: products[0].price
            });
        }

        // Category filter
        if (selectedCategory !== 'all') {
            console.log('🏷️ Filtering by category:', selectedCategory);
            console.log('🏷️ Available categories:', categories.length);
            const beforeCount = result.length;
            
            // Get child category IDs from the category object
            const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
            
            // Backend returns children array instead of parentId
            const childCategoryIds = (selectedCategoryObj as any)?.children?.map((child: any) => child.id) || [];
            
            console.log('🏷️ Selected category:', selectedCategoryObj);
            console.log('🏷️ Child categories found:', childCategoryIds.length);
            console.log('🏷️ Child category IDs:', childCategoryIds);
            
            result = result.filter((p) => {
                const productCategoryId = p.categoryId || p.category?.id;
                const matchDirectly = productCategoryId === selectedCategory;
                const matchViaChild = childCategoryIds.length > 0 && childCategoryIds.includes(productCategoryId || '');
                
                const matches = matchDirectly || matchViaChild;
                if (!matches) {
                    console.log(`❌ Product: ${p.name} | categoryId: ${productCategoryId} | Direct: ${matchDirectly} | Child: ${matchViaChild}`);
                }
                
                return matches;
            });
            console.log(`✅ Category filter: ${beforeCount} → ${result.length} products`);
        }

        // Price filter
        result = result.filter((p) => {
            const price = p.price || 0;
            return price >= priceRange[0] && price <= priceRange[1];
        });

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.description?.toLowerCase().includes(query)
            );
        }

        // Sort
        switch (sortBy) {
            case 'price-asc':
                result.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price-desc':
                result.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'name-asc':
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
            default:
                result.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
        }

        setFilteredProducts(result);
        setCurrentPage(1);
    }, [products, selectedCategory, priceRange, searchQuery, sortBy]);

    const handleAddToCart = async (variantId: string, quantity: number) => {
        if (!user?.id) {
            router.push('/auth');
            return;
        }

        try {
            const response = await addToCart(user.id, variantId, quantity);
            if (response.success) {
                toast.success(response.message || 'Đã thêm sản phẩm vào giỏ hàng');
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

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, endIndex);

    const FilterPanel = () => (
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
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedCategory === 'all'
                                ? 'bg-indigo-50 text-indigo-600 font-medium'
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
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedCategory === category.id
                                    ? 'bg-indigo-50 text-indigo-600 font-medium'
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
                    <p className="text-slate-600 dark:text-gray-400">
                        {loading ? 'Đang tải...' : `Khám phá ${filteredProducts.length} sản phẩm chất lượng cao`}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Desktop Filters */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bộ lọc</h2>
                            </div>
                            <FilterPanel />
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
                                            <FilterPanel />
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                {/* View Mode Toggle */}
                                <div className="hidden sm:flex gap-1 border border-slate-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 rounded ${viewMode === 'grid'
                                                ? 'bg-indigo-50 text-indigo-600'
                                                : 'text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        <Grid3x3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded ${viewMode === 'list'
                                                ? 'bg-indigo-50 text-indigo-600'
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
                                        Tìm kiếm: "{searchQuery}"
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
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                        )}

                        {/* No Results */}
                        {!loading && filteredProducts.length === 0 && (
                            <div className="text-center py-20">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Package className="w-12 h-12 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                    Không tìm thấy sản phẩm
                                </h3>
                                <p className="text-slate-600 mb-6">
                                    Thử điều chỉnh bộ lọc hoặc tìm kiếm khác
                                </p>
                                <Button onClick={resetFilters} variant="outline">
                                    Xóa bộ lọc
                                </Button>
                            </div>
                        )}

                        {/* Products Grid */}
                        {!loading && filteredProducts.length > 0 && (
                            <>
                                <div
                                    className={
                                        viewMode === 'grid'
                                            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                                            : 'space-y-4'
                                    }
                                >
                                    {currentProducts.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onAddToCart={handleAddToCart}
                                            onViewDetails={handleViewDetails}
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
                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
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