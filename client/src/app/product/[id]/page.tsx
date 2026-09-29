"use client";

import { useState, useEffect } from "react";
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
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { track } from "@/lib/eventTracker";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductSpecsSidebar } from "@/components/product/ProductSpecsSidebar";
import { ProductTabs, ReviewItem } from "@/components/product/ProductTabs";

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
  // Index biến thể đang chọn - đồng bộ badge giảm giá trên gallery
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData: any = await fetchProductById(params.id as string);
        if (!productData?.id) {
          setError("Không tìm thấy sản phẩm");
          return;
        }
        setProduct(productData as Product);
        // Điểm rating/số lượt đánh giá cào từ sàn nguồn nằm trong attributes
        // của biến thể — dùng làm giá trị hiển thị ban đầu thay vì số mock.
        const crawled = (productData.variants ?? [])
          .map((v: any) => v?.attributes)
          .find((a: any) => a && (a.rating != null || a.reviewCount != null));
        if (crawled) {
          if (crawled.rating != null) setAverageRating(Number(crawled.rating) || 0);
          if (crawled.reviewCount != null) setReviewCount(Number(crawled.reviewCount) || 0);
        } else {
          setAverageRating(0);
          setReviewCount(0);
        }
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

          // Track analytics event
          track.productView(productData.id, productData.name, price);
        }
      } catch (err) {
        setError("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      // Về đầu trang mỗi khi mở/sang sản phẩm khác - tránh giữ vị trí cuộn
      // cũ khiến nội dung chui xuống dưới header fixed
      window.scrollTo({ top: 0 });
      loadProduct();
    }
  }, [params.id]);

  // Reset biến thể đang chọn mỗi khi sang sản phẩm khác
  useEffect(() => {
    setSelectedVariantIndex(0);
  }, [product?.id]);

  const handleAddToCart = async (variantId: string, quantity: number) => {
    if (!user?.id) {
      toast.error("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }

    try {
      const response: any = await addToCart(user.id, variantId, quantity);
      if (response.success) {
        toast.success(response.message || "Đã thêm sản phẩm vào giỏ hàng");

        if (product) {
          const variant = product.variants?.find((v) => v.id === variantId);
          const price = Number(variant?.salePrice || variant?.price || product.price || 0);

          // Track ADD_TO_CART event for Analytics Funnel
          track.addToCart(product.id, product.name, price, quantity);

          if (variant) {
            cartStore.addItem({
              id: parseInt(variantId) || 1,
              name: product.name,
              price: price,
              quantity: quantity,
              imageUrl: product.images?.[0]?.url || "",
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
      if (data.reviews && data.reviews.length > 0) {
        setReviews(data.reviews);
        if (data.averageRating != null) setAverageRating(data.averageRating);
        if (data.count != null) setReviewCount(data.count);
      }
    } catch (err) {
      console.error("Failed to load reviews", err);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <span className="text-muted-foreground font-medium text-sm animate-pulse">Đang tải thông tin sản phẩm...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive font-semibold mb-4">{error || "Không tìm thấy sản phẩm"}</p>
            <Link href="/">
              <Button variant="outline" className="rounded-full px-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay về trang chủ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // % giảm giá của biến thể đang chọn - hiện badge trên ảnh gallery
  const activeVariant = product.variants?.[selectedVariantIndex] ?? product.variants?.[0];

  const activeOriginal = activeVariant?.salePrice ? Number(activeVariant.price) : null;
  const activeCurrent = Number(
    activeVariant?.salePrice != null
      ? activeVariant.salePrice
      : activeVariant?.price ?? product.price ?? 0,
  );
  const activeDiscount =
    activeVariant?.discountPercent ||
    (activeOriginal != null && activeOriginal > activeCurrent
      ? Math.round(((activeOriginal - activeCurrent) / activeOriginal) * 100)
      : null);

  return (
    <div className="min-h-screen bg-muted/10 pt-5 sm:pt-7 pb-28 md:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation chuẩn Stitch */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          {product.category?.slug ? (
            <Link
              href={`/category/${product.category.slug}`}
              className="hover:text-primary transition-colors"
            >
              {product.category.name}
            </Link>
          ) : (
            <span>Tivi</span>
          )}
          {product.brand && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <Link
                href={`/search?query=${encodeURIComponent(product.brand)}`}
                className="hover:text-primary transition-colors"
              >
                {product.brand}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <span className="text-foreground font-semibold truncate max-w-[250px]">
            {product.name}
          </span>
        </div>

        {/* PHẦN TRÊN: GIAO DIỆN 2 CỘT 6-6 CHUẨN STITCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Cột Trái (6 span): Gallery Ảnh */}
            <div className="lg:col-span-6 w-full">
              <ProductGallery
                images={product.images}
                productName={product.name}
                discountPercent={activeDiscount}
                variantId={activeVariant?.id ?? null}
              />
            </div>

          {/* Cột Phải (6 span): Chi tiết sản phẩm & Thao tác */}
          <div className="lg:col-span-6 w-full">
            <ProductInfo
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              averageRating={averageRating}
              reviewCount={reviewCount}
              onVariantChange={setSelectedVariantIndex}
            />
          </div>
        </div>

        {/* PHẦN GIỮA: TABS (MÔ TẢ / ĐÁNH GIÁ / HỎI ĐÁP) + SIDEBAR THÔNG SỐ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start pt-4">
          <div className="lg:col-span-8 w-full min-w-0">
            <ProductTabs
              product={product}
              reviews={reviews}
              averageRating={averageRating}
              reviewCount={reviewCount}
              rating={rating}
              setRating={setRating}
              comment={comment}
              setComment={setComment}
              handleSubmitReview={handleSubmitReview}
              loadingReviews={loadingReviews}
              submittingReview={submittingReview}
            />
          </div>
          <div className="lg:col-span-4 w-full lg:sticky lg:top-24">
            <ProductSpecsSidebar product={product} />
          </div>
        </div>

        {/* PHẦN DƯỚI CÙNG: SẢN PHẨM TƯƠNG TỰ */}
        <div className="pt-6 border-t border-border">
          <ProductRecommendations
            currentProductId={product.id}
            categoryName={product.category?.name}
          />
        </div>
      </div>
    </div>
  );
}
