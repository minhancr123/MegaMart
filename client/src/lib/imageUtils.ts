/**
 * Get primary image from product images array
 * @param images - Array of image URLs or image objects
 * @returns Primary image URL or first image URL as fallback
 */
export const getPrimaryImageUrl = (
  images?: (string | { url: string; isPrimary?: boolean })[]
): string => {
  if (!images || images.length === 0) {
    return '';
  }

  // Find primary image
  const primaryImage = images.find((img) =>
    typeof img === 'object' && img.isPrimary === true
  );

  if (primaryImage) {
    return typeof primaryImage === 'object' ? primaryImage.url : primaryImage;
  }

  // Fallback to first image
  const firstImage = images[0];
  return typeof firstImage === 'object' ? firstImage.url : firstImage;
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
