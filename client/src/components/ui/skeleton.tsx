import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted",
        className
      )}
    />
  );
}

// Product Card Skeleton — khớp cấu trúc card gọn (ảnh + tên 2 dòng + rating + giá + cam kết)
export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Image */}
      <Skeleton className="aspect-square w-full rounded-none" />

      {/* Content */}
      <div className="p-4 space-y-0">
        {/* Title 2 dòng */}
        <Skeleton className="h-4 w-full" />
        <div className="h-1.5" />
        <Skeleton className="h-4 w-3/4" />

        {/* Rating */}
        <div className="h-2" />
        <Skeleton className="h-3.5 w-24" />

        {/* Price */}
        <div className="h-1.5" />
        <Skeleton className="h-6 w-28" />

        {/* Cam kết */}
        <div className="h-1.5" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  );
}

// Products Grid Skeleton — truyền className lưới đúng của từng trang để không giật layout
export function ProductsGridSkeleton({
  count = 6,
  className = "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {[...Array(count)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Banner Skeleton
export function BannerSkeleton() {
  return (
    <div className="relative rounded-3xl overflow-hidden">
      <Skeleton className="aspect-[16/6] w-full" />
      <div className="absolute bottom-8 left-8 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-12 w-32 rounded-full" />
      </div>
    </div>
  );
}

// Category Card Skeleton
export function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="w-20 h-20 rounded-2xl" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// Categories Grid Skeleton
export function CategoriesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
      {[...Array(count)].map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-border">
      {[...Array(columns)].map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

// Text Skeleton
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Avatar Skeleton
export function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

// Button Skeleton
export function ButtonSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-28',
    lg: 'h-12 w-36',
  };

  return <Skeleton className={cn("rounded-xl", sizeClasses[size])} />;
}

// Flash Sale Card Skeleton
export function FlashSaleCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

// News Card Skeleton
export function NewsCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
