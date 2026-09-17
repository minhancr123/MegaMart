/**
 * Get primary image from product images array
 * @param images - Array of image URLs or image objects
 * @returns Primary image URL or first image URL as fallback
 */
export const getPrimaryImageUrl = (
  images?: any
): string => {
  if (!images) {
    return '';
  }

  // Nếu vô tình truyền cả object product { images: [...] } vào
  const list = Array.isArray(images)
    ? images
    : Array.isArray(images?.images)
      ? images.images
      : [];

  if (list.length === 0) {
    return typeof images === 'object' && typeof images?.imageUrl === 'string' ? images.imageUrl : '';
  }

  // Find primary image
  const primaryImage = list.find((img: any) =>
    typeof img === 'object' && img?.isPrimary === true
  );

  if (primaryImage) {
    return typeof primaryImage === 'object' ? (primaryImage.url || '') : primaryImage;
  }

  // Fallback to first image
  const firstImage = list[0];
  return typeof firstImage === 'object' ? (firstImage?.url || '') : firstImage;
};

/**
 * Get all image URLs from product images array
 * @param images - Array of image URLs or image objects
 * @returns Array of image URLs
 */
export const getImageUrls = (
  images?: (string | { url: string; isPrimary?: boolean })[]
): string[] => {
  if (!images || images.length === 0) return [];

  return images.map((img) =>
    typeof img === 'object' ? img.url : img
  );
};

/**
 * Ảnh thay thế khi sản phẩm không có ảnh, hoặc khi URL ảnh chết.
 * Đường dẫn này phải khớp file thật trong public/ - trước đây vài nơi trỏ tới
 * "/placeholder-product.png", "/placeholder.png", "/placeholder.svg" và cả ba
 * đều 404, nên sản phẩm thiếu ảnh hiện ra icon ảnh vỡ.
 */
export const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';

/**
 * Gắn vào onError của <img>: đổi sang ảnh thay thế khi URL gốc tải hỏng.
 * Phần lớn ảnh gallery vẫn hotlink sang CDN của hai sàn nguồn, nếu họ chặn
 * hotlink hoặc đổi URL thì không có cái này sẽ ra ảnh vỡ.
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement>,
): void => {
  const img = event.currentTarget;
  // Chặn vòng lặp vô hạn nếu chính ảnh thay thế cũng tải hỏng.
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = 'true';
  img.src = PLACEHOLDER_IMAGE;
};
