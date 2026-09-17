import axiosClient from './axiosClient';

// ============== BANNER API ==============

export type BannerPosition = 'HOME_SLIDER' | 'CATEGORY' | 'POPUP';
export type BannerTemplate = 'STATIC' | 'AUTO' | 'TEMPLATE_1' | 'TEMPLATE_2' | 'TEMPLATE_3';
export type BannerDisplayStatus = 'active' | 'scheduled' | 'expired' | 'paused';

export interface FeaturedProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  salePrice: number | null;
}

export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  displayOrder: number;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  position?: string;
  template?: string;
  ctaText?: string;
  badgeText?: string;
  featuredProductIds?: string[];
  featuredProducts?: FeaturedProduct[];
  impressions?: number;
  clicks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerDto {
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  displayOrder?: number;
  active?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  position?: string;
  template?: string;
  ctaText?: string;
  badgeText?: string;
  featuredProductIds?: string[];
  impressions?: number;
  clicks?: number;
}

export interface UpdateBannerDto extends Partial<CreateBannerDto> {}

export const bannerApi = {
  // Get all banners (admin)
  getAll: (includeInactive = true) => 
    axiosClient.get<Banner[]>(`/banners/all?includeInactive=${includeInactive}`),

  // Get active banners (public)
  getActive: () => 
    axiosClient.get<Banner[]>('/banners'),

  // Get single banner
  getById: (id: string) => 
    axiosClient.get<Banner>(`/banners/${id}`),

  // Create banner
  create: (data: CreateBannerDto) => 
    axiosClient.post<Banner>('/banners', data),

  // Update banner
  update: (id: string, data: UpdateBannerDto) => 
    axiosClient.put<Banner>(`/banners/${id}`, data),

  // Reorder banners
  reorder: (bannerIds: string[]) =>
    axiosClient.put('/banners/reorder', { bannerIds }),

  // Thống kê KPI cho trang quản trị
  getStats: async (): Promise<{
    active: number;
    scheduled: number;
    expired: number;
    totalClicks: number;
    totalImpressions: number;
  }> => {
    const res: any = await axiosClient.get('/banners/stats');
    return (res?.data ?? res) as any;
  },

  // Toggle active status
  toggleActive: (id: string) => 
    axiosClient.put<Banner>(`/banners/${id}/toggle`),

  // Delete banner
  delete: (id: string) => 
    axiosClient.delete(`/banners/${id}`),
};

// ============== FLASH SALE API ==============

export interface FlashSaleItem {
  id: string;
  variantId: string;
  salePrice: number;
  quantity: number;
  soldCount: number;
  variant?: {
    id: string;
    name: string;
    price: number;
    product?: {
      id: string;
      name: string;
      images: string[];
    };
  };
}

export interface FlashSale {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  active: boolean;
  items?: FlashSaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FlashSaleItemDto {
  variantId: string;
  salePrice: number;
  quantity: number;
}

export interface CreateFlashSaleDto {
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  active?: boolean;
  items?: FlashSaleItemDto[];
}

export interface UpdateFlashSaleDto extends Partial<CreateFlashSaleDto> {}

export const flashSaleApi = {
  // Get all flash sales (admin)
  getAll: (status?: 'active' | 'upcoming' | 'ended' | 'all') => 
    axiosClient.get<FlashSale[]>(`/flash-sales${status ? `?status=${status}` : ''}`),

  // Get active flash sales (public)
  getActive: () => 
    axiosClient.get<FlashSale[]>('/flash-sales/active'),

  // Get single flash sale
  getById: (id: string) => 
    axiosClient.get<FlashSale>(`/flash-sales/${id}`),

  // Create flash sale
  create: (data: CreateFlashSaleDto) => 
    axiosClient.post<FlashSale>('/flash-sales', data),

  // Update flash sale
  update: (id: string, data: UpdateFlashSaleDto) => 
    axiosClient.put<FlashSale>(`/flash-sales/${id}`, data),

  // Add items to flash sale
  addItems: (id: string, items: FlashSaleItemDto[]) => 
    axiosClient.post<FlashSale>(`/flash-sales/${id}/items`, { items }),

  // Remove item from flash sale
  removeItem: (id: string, itemId: string) => 
    axiosClient.delete(`/flash-sales/${id}/items/${itemId}`),

  // Update item in flash sale
  updateItem: (id: string, itemId: string, data: { salePrice?: number; quantity?: number }) => 
    axiosClient.put<FlashSale>(`/flash-sales/${id}/items/${itemId}`, data),

  // Toggle active status
  toggleActive: (id: string) => 
    axiosClient.put<FlashSale>(`/flash-sales/${id}/toggle`),

  // Delete flash sale
  delete: (id: string) => 
    axiosClient.delete(`/flash-sales/${id}`),
};
