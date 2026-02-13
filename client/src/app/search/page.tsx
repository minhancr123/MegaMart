'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { searchProducts } from '@/lib/productApi';
import { Search, Loader2, Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { addToCart } from '@/lib/cartApi';
import { toast } from 'sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const cartStore = useCartStore();
  const query = searchParams.get('query') || '';
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('relevance');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();

  useEffect(() => {
    if (query) {
      fetchSearchResults();
    } else {
      setLoading(false);
    }
  }, [query, sortBy, minPrice, maxPrice]);

  const fetchSearchResults = async () => {
    setLoading(true);
    try {
      const params: any = {
        search: query,
        limit: 50,
      };

      // Add sorting
      if (sortBy === 'price-asc') params.sort = 'price:asc';
      if (sortBy === 'price-desc') params.sort = 'price:desc';
      if (sortBy === 'name') params.sort = 'name:asc';

      // Add price filters
      if (minPrice !== undefined) params.minPrice = minPrice;
      if (maxPrice !== undefined) params.maxPrice = maxPrice;

      const response: any = await searchProducts(params);
      const productsData = Array.isArray(response) ? response : (response?.data || []);
      setProducts(productsData);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Không thể tìm kiếm sản phẩm');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (variantId: string, quantity: number) => {
    if (!user?.id) {
      router.push('/auth');
      return;
    }

    try {
      const response: any = await addToCart(user.id, variantId, quantity);
      if (response?.success) {
        toast.success(response.message || 'Đã thêm sản phẩm vào giỏ hàng');
        
        // Cập nhật cartStore
        const product = products.find(p => p.variants?.some((v: any) => v.id === variantId));
        if (product) {
          const variant = product.variants?.find((v: any) => v.id === variantId);
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
        toast.error(response?.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng');
    }
  };

  const handleViewDetails = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const priceRanges = [
    { label: 'Dưới 1 triệu', min: 0, max: 1000000 },
    { label: '1 - 5 triệu', min: 1000000, max: 5000000 },
    { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
    { label: '10 - 20 triệu', min: 10000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <main className="pt-[100px] md:pt-[120px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Kết quả tìm kiếm
            </h1>
          </div>
          
          {query && (
            <p className="text-gray-600 dark:text-gray-400">
              Tìm kiếm cho: <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{query}&rdquo;</span>
              {!loading && (
                <span className="ml-2">
                  ({products.length} sản phẩm)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
          {/* Sort */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              <SortAsc className="w-4 h-4 inline mr-2" />
              Sắp xếp
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="relevance">Liên quan nhất</SelectItem>
                <SelectItem value="price-asc">Giá: Thấp đến cao</SelectItem>
                <SelectItem value="price-desc">Giá: Cao đến thấp</SelectItem>
                <SelectItem value="name">Tên A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              <Filter className="w-4 h-4 inline mr-2" />
              Khoảng giá
            </label>
            <Select
              value={minPrice !== undefined ? `${minPrice}-${maxPrice}` : 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  setMinPrice(undefined);
                  setMaxPrice(undefined);
                } else {
                  const [min, max] = value.split('-');
                  setMinPrice(Number(min));
                  setMaxPrice(max === 'undefined' ? undefined : Number(max));
                }
              }}
            >
              <SelectTrigger className="w-full dark:bg-gray-800 dark:border-gray-700">
                <SelectValue placeholder="Chọn khoảng giá" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="all">Tất cả</SelectItem>
                {priceRanges.map((range, idx) => (
                  <SelectItem key={idx} value={`${range.min}-${range.max}`}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Đang tìm kiếm...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Không tìm thấy sản phẩm nào
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {query
                ? `Không có kết quả cho "${query}". Vui lòng thử từ khóa khác.`
                : 'Nhập từ khóa để tìm kiếm sản phẩm'}
            </p>
            <Button onClick={() => router.push('/products')} variant="outline">
              Xem tất cả sản phẩm
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Main export with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-gray-600 dark:text-gray-400">Đang tải...</span>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
