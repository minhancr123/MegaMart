import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Image skeleton */}
        <Skeleton className="w-full h-48" />
        
        <div className="p-4 space-y-3">
          {/* Title skeleton */}
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          
          {/* Price skeleton */}
          <Skeleton className="h-6 w-1/2" />
          
          {/* Button skeleton */}
          <Skeleton className="h-10 w-full mt-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
