import * as analytics from './analytics';

let sessionId: string | null = null;

// Generate or get session ID
export const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  if (!sessionId) {
    sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36)}`;
      localStorage.setItem('sessionId', sessionId);
    }
  }
  return sessionId;
};

// Track event to both GA4 and backend
export const trackEvent = async (
  eventType: string,
  eventName: string,
  metadata?: Record<string, any>
) => {
  const sid = getSessionId();
  if (!sid) return;
  
  // Track to Google Analytics
  analytics.event({
    action: eventName,
    category: eventType,
    label: metadata?.label,
    value: metadata?.value,
  });

  // Track to backend database
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/analytics/track-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        eventName,
        sessionId: sid,
        metadata,
        pageUrl: window.location.href,
        referrer: document.referrer,
      }),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Convenient tracking functions
export const track = {
  pageView: (url: string) => {
    analytics.pageview(url);
    trackEvent('PAGE_VIEW', 'page_view', { url });
  },

  productView: (productId: string, productName: string, price: number) => {
    analytics.trackViewItem({ id: productId, name: productName, price });
    trackEvent('PRODUCT_VIEW', 'view_product', { productId, productName, price });
  },

  addToCart: (productId: string, productName: string, price: number, quantity: number) => {
    analytics.trackAddToCart({ id: productId, name: productName, price, quantity });
    trackEvent('ADD_TO_CART', 'add_to_cart', { productId, productName, price, quantity });
  },

  removeFromCart: (productId: string, productName: string) => {
    trackEvent('REMOVE_FROM_CART', 'remove_from_cart', { productId, productName });
  },

  addToWishlist: (productId: string, productName: string) => {
    trackEvent('ADD_TO_WISHLIST', 'add_to_wishlist', { productId, productName });
  },

  search: (searchTerm: string, resultCount?: number) => {
    analytics.trackSearch(searchTerm);
    trackEvent('SEARCH', 'search', { searchTerm, resultCount });
  },

  checkoutStart: (cartValue: number, itemCount: number) => {
    trackEvent('CHECKOUT_START', 'checkout_start', { cartValue, itemCount });
  },

  purchase: (orderId: string, total: number, items: any[]) => {
    analytics.trackPurchase(orderId, total, items);
    trackEvent('PAYMENT_SUCCESS', 'purchase', { orderId, total, itemCount: items.length });
  },

  paymentFailed: (reason: string, amount: number) => {
    trackEvent('PAYMENT_FAILED', 'payment_failed', { reason, amount });
  },

  clickBanner: (bannerId: string, bannerName: string, position: number) => {
    trackEvent('CLICK_BANNER', 'click_banner', { bannerId, bannerName, position });
  },

  clickFlashSale: (flashSaleId: string, flashSaleName: string) => {
    trackEvent('CLICK_FLASH_SALE', 'click_flash_sale', { flashSaleId, flashSaleName });
  },

  applyVoucher: (voucherCode: string, discountAmount: number) => {
    trackEvent('APPLY_VOUCHER', 'apply_voucher', { voucherCode, discountAmount });
  },

  submitReview: (productId: string, rating: number) => {
    trackEvent('REVIEW_SUBMIT', 'submit_review', { productId, rating });
  },

  shareProduct: (productId: string, platform: string) => {
    trackEvent('SHARE_PRODUCT', 'share_product', { productId, platform });
  },

  filterProducts: (filters: Record<string, any>) => {
    trackEvent('FILTER_PRODUCTS', 'filter_products', { filters });
  },

  sortProducts: (sortBy: string) => {
    trackEvent('SORT_PRODUCTS', 'sort_products', { sortBy });
  },

  categoryView: (categoryId: string, categoryName: string) => {
    trackEvent('CATEGORY_VIEW', 'view_category', { categoryId, categoryName });
  },
};
