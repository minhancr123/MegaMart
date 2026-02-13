/**
 * Performance optimization utilities
 * Simple, lightweight animations and transitions
 */

// Use CSS transitions instead of heavy JS animations
export const transitions = {
  fast: 'transition-all duration-150 ease-out',
  normal: 'transition-all duration-200 ease-out',
  slow: 'transition-all duration-300 ease-out',
};

// Simple hover effects
export const hoverEffects = {
  scale: 'hover:scale-[1.02] active:scale-[0.98]',
  scaleSmall: 'hover:scale-[1.01] active:scale-[0.99]',
  lift: 'hover:-translate-y-0.5',
  shadow: 'hover:shadow-md',
  glow: 'hover:shadow-lg hover:shadow-blue-500/20',
};

// Combine for common patterns
export const cardHover = `${transitions.normal} ${hoverEffects.lift} ${hoverEffects.shadow}`;
export const buttonHover = `${transitions.fast} ${hoverEffects.scale}`;

/**
 * Lazy load images with intersection observer
 * Lighter than framer-motion animations
 */
export const useLazyLoad = () => {
  if (typeof window === 'undefined') return;
  
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            imageObserver.unobserve(img);
          }
        }
      });
    });
    
    images.forEach((img) => imageObserver.observe(img));
  }
};

/**
 * Debounce for search and input
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle for scroll events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
