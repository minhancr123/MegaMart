"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Product } from "@/interfaces/product";
import { fetchProductById } from "@/lib/productApi";
import { addToCart } from "@/lib/cartApi";
import { fetchReviewsByProduct, createReview } from "@/lib/reviewApi";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useRecentlyViewedStore } from "@/store/recentlyViewedStore";
import ProductRecommendations from "@/components/product/ProductRecommendations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Package, Star, CheckCircle2, RefreshCw, ChevronRight, ShieldCheck, RotateCcw, Truck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ProductVariants } from "@/components/product/ProductVariants";
import { Label } from "@/components/ui/label";
import { TechSpecs } from "@/components/product/TechSpecs";

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const { user } = useAuthStore();
  const cartStore = useCartStore();
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData = await fetchProductById(params.id as string);
        setProduct(productData);
        await loadReviews(productData.id);

        // Lưu vào danh sách đã xem gần đây
        if (productData?.id && productData?.name) {
          const primaryImage = productData.images?.find((img: any) => img.isPrimary);
          const price = productData.variants?.[0]?.price ?? productData.price ?? 0;
          addRecentlyViewed({
            id: productData.id,
            name: productData.name,
            price,
            imageUrl: primaryImage?.url || productData.imageUrl || "",
            categorySlug: productData.category?.slug,
            categoryName: productData.category?.name,
          });
        }
      } catch (err) {
        setError("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const handleAddToCart = async (variantId: string, quantity: number) => {
    if (!user?.id) {
      toast.error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }

    try {
      const response = await addToCart(user.id, variantId, quantity);
      if (response.success) {
        toast.success(response.message || "Đã thêm sản phẩm vào giỏ hàng");
        
        // Cập nhật cartStore để badge hiển thị đúng
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
        toast.error(response.message || "Có lỗi xảy ra khi thêm sản phẩm");
      }
    } catch (error: any) {
      console.error("Failed to add to cart:", error);
      toast.error("Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng");
    }
  };

  const loadReviews = async (productId: string) => {
    try {
      setLoadingReviews(true);
      const data = await fetchReviewsByProduct(productId);
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setReviewCount(data.count || 0);
    } catch (err) {
      console.error("Failed to load reviews", err);
      toast.error("Không thể tải đánh giá sản phẩm");
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user?.id) {
      toast.error("Bạn cần đăng nhập để đánh giá");
      return;
    }

    if (!product) return;

    try {
      setSubmittingReview(true);
      await createReview({
        productId: product.id,
        rating,
        comment: comment.trim(),
        userId: user.id,
      });
      toast.success("Đã gửi đánh giá của bạn");
      setComment("");
      setRating(5);
      await loadReviews(product.id);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Không thể gửi đánh giá";
      toast.error(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const ratingLabel = useMemo(() => {
    if (rating >= 5) return "Tuyệt vời";
    if (rating >= 4) return "Hài lòng";
    if (rating >= 3) return "Bình thường";
    if (rating >= 2) return "Chưa tốt";
    return "Tệ";
  }, [rating]);

  const renderStars = (value: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => {
          const filled = value >= index + 1;
          const half = !filled && value >= index + 0.5;
          return (
            <Star
              key={index}
              className={`h-4 w-4 ${filled ? "fill-yellow-400 text-yellow-400" : half ? "text-yellow-300" : "text-gray-300"}`}
            />
          );
        })}
      </div>
    );
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return "";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toLocaleDateString("vi-VN");
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin dark:text-blue-400" />
          <span className="ml-2 dark:text-gray-300">Đang tải thông tin sản phẩm...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || "Không tìm thấy sản phẩm"}</p>
            <Link href="/">
              <Button variant="outline" className="dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay về trang chủ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">Trang chủ</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">Sản phẩm</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Images, Content, Reviews */}
        <div className="lg:col-span-7 space-y-8">
          {/* Image Gallery (Placeholder for now - using main image) */}
          {/* <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-h-[400px] flex items-center justify-center overflow-hidden relative group">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="max-h-[400px] w-auto object-contain transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="text-gray-300 flex flex-col items-center">
                <Package className="h-24 w-24 mb-4" />
                <span>Chưa có hình ảnh</span>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              ))}
            </div>
          </div> */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 min-h-[400px] flex items-center justify-center overflow-hidden relative group">
            {product.images?.map((image) => {
              return image.isPrimary ? (
                <img src={image.url} alt={image.alt || product.name} className="max-h-[400px] w-auto object-contain transition-transform duration-500 group-hover:scale-105" />
              ) : null
            })}
          </div>

          {/* Article Content (Mock) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Đặc điểm nổi bật</h2>
            <div className="prose max-w-none text-gray-600 dark:text-gray-400 space-y-4">
              <p><strong className="dark:text-gray-200">{product.name}</strong> sở hữu thiết kế hiện đại, sang trọng cùng hiệu năng mạnh mẽ, đáp ứng mọi nhu cầu sử dụng từ công việc đến giải trí.</p>
              <p>Sản phẩm được trang bị công nghệ mới nhất, mang lại trải nghiệm mượt mà và ổn định. Màn hình sắc nét, màu sắc trung thực giúp bạn đắm chìm trong không gian giải trí sống động.</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Ưu điểm nổi bật:</h3>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Thiết kế thời thượng, mỏng nhẹ.</li>
                  <li>Hiệu năng vượt trội trong tầm giá.</li>
                  <li>Thời lượng pin ấn tượng.</li>
                  <li>Camera chất lượng cao.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div id="reviews" className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Đánh giá & Nhận xét</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Rating Summary */}
              <div className="md:col-span-1 text-center border-r border-gray-100 dark:border-gray-800 pr-4">
                <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{averageRating.toFixed(1)}/5</div>
                <div className="flex justify-center mb-2">{renderStars(Math.round(averageRating * 2) / 2)}</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{reviewCount} đánh giá</p>
              </div>

              {/* Rating Progress (Mock) */}
              <div className="md:col-span-2 flex flex-col justify-center gap-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 text-sm">
                    <span className="w-3 dark:text-gray-400">{star}</span> <Star className="w-3 h-3 text-gray-400" />
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 dark:bg-blue-600 rounded-full" style={{ width: star === 5 ? '70%' : star === 4 ? '20%' : '5%' }}></div>
                    </div>
                    <span className="w-8 text-right text-gray-400">{star === 5 ? '70%' : star === 4 ? '20%' : '5%'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Form */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mb-8">
              <h3 className="font-semibold mb-4 dark:text-white">Gửi đánh giá của bạn</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium dark:text-gray-300">Bạn cảm thấy thế nào về sản phẩm?</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 cursor-pointer transition-colors ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                        onClick={() => setRating(star)}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{ratingLabel}</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Mời bạn chia sẻ cảm nhận..."
                    className="flex-1 min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none resize-none text-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSubmitReview} disabled={submittingReview} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                    {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gửi đánh giá
                  </Button>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 && !loadingReviews ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 dark:border-gray-800 pb-6 last:border-0 last:pb-0">
                    <div className="flex gap-3 mb-3">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                        {review.user?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white">{review.user?.name || "Người dùng ẩn danh"}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="w-3 h-3" /> 
                            Đã mua hàng
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {renderStars(review.rating)}
                          <span>•</span>
                          <span>{formatDate(review.createdAt)}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Info, Actions, Specs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Product Info & Actions */}
          <ProductVariants
            product={product}
            onAddToCart={handleAddToCart}
          />

          {/* Installment Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 h-14 flex flex-col items-center justify-center rounded-lg shadow-sm transition-transform active:scale-95">
              <span className="font-bold text-sm uppercase">TRẢ GÓP 0%</span>
              <span className="text-[10px] font-normal opacity-90">Duyệt hồ sơ trong 5 phút</span>
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 h-14 flex flex-col items-center justify-center rounded-lg shadow-sm transition-transform active:scale-95">
              <span className="font-bold text-sm uppercase">TRẢ GÓP QUA THẺ</span>
              <span className="text-[10px] font-normal opacity-90">Visa, Mastercard, JCB</span>
            </Button>
          </div>

          {/* Trade-in Banner */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center text-white">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-orange-800 dark:text-orange-300 block text-sm">THU CŨ ĐỔI MỚI</span>
                <span className="text-xs text-orange-700 dark:text-orange-400">Trợ giá lên đến 2 triệu đồng</span>
              </div>
            </div>
            <ChevronRight className="text-orange-500 dark:text-orange-400 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Tech Specs */}
          <TechSpecs />

          {/* Policies */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Bảo hành chính hãng 12 tháng</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lỗi là đổi mới trong 1 tháng tại hơn 1000 siêu thị toàn quốc</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Đổi trả dễ dàng</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Xem chính sách đổi trả</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Giao hàng tận nơi</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Miễn phí vận chuyển toàn quốc</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sản phẩm gợi ý */}
      <ProductRecommendations 
        currentProductId={product.id} 
        categoryName={product.category?.name} 
      />
    </div>
  );
}