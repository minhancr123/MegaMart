import axiosClient from './axiosClient';

export interface SaleVariant {
  id: string;
  sku: string;
  productId: string;
  productName: string;
  productSlug: string;
  image?: string;
  originalPrice: string;
  salePrice?: string;
  discountPercent?: number;
  savedAmount: string;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  isActive?: boolean;
}

export interface ApplySaleRequest {
  variantIds: string[];
  discountPercent: number;
  saleStartDate?: string;
  saleEndDate?: string;
}

export interface UpdateSaleRequest {
  discountPercent?: number;
  saleStartDate?: string;
  saleEndDate?: string;
}

export interface CampaignVariantSearchResult {
  id: string;
  sku: string;
  productId: string;
  productName: string;
  image?: string | null;
  price: number;
  stock: number;
  activeCampaign?: { id: string; name: string; status: string } | null;
}

export interface SuggestedCampaignVariant extends CampaignVariantSearchResult {
  availableStock: number;
  soldCount: number;
  reason: string;
}

export interface SuggestedVariantsQuery {
  limit?: number;
  minStock?: number;
  days?: number;
  maxSales?: number;
}

export interface SaleCampaign {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | string;
  defaultDiscount?: number | null;
  itemCount?: number;
}

export interface CreateSaleCampaignRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  defaultDiscount: number;
  variantIds: string[];
}

export interface SaleCampaignDetailItem {
  id: string;
  variantId: string;
  discountPercent: number;
  salePrice: string | number;
  variant?: {
    id: string;
    sku: string;
    price: string | number;
    salePrice?: string | number | null;
    discountPercent?: number | null;
    stock?: number;
    product?: { id: string; name: string; images?: { url: string }[] } | null;
  } | null;
}

export interface SaleCampaignDetail extends SaleCampaign {
  items: SaleCampaignDetailItem[];
}

export interface SaleTimingSuggestion {
  id: string;
  type: "DATA_DRIVEN" | "CALENDAR" | string;
  badge: string;
  title: string;
  reason: string;
  template: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    defaultDiscount: number;
  };
}

export interface SaleTimingResponse {
  orderSampleSize: number;
  dayOfWeekStats: { day: number; label: string; orders: number; revenue: number }[];
  suggestions: SaleTimingSuggestion[];
}

export interface PriceCalculation {
  originalPrice: string;
  finalPrice: string;
  discountPercent: number;
  savedAmount: string;
  discountType: 'FLASH_SALE' | 'REGULAR_SALE' | 'NONE';
}

export const salesApi = {
  searchVariantsForCampaign: async (query = '', limit = 30): Promise<CampaignVariantSearchResult[]> => {
    const res: any = await axiosClient.get('/sales/variants/search', { params: { q: query, limit } });
    return res?.data ?? res ?? [];
  },
  getSuggestedVariants: async (params: SuggestedVariantsQuery = {}): Promise<SuggestedCampaignVariant[]> => {
    const res: any = await axiosClient.get('/sales/suggested-variants', { params });
    return res?.data ?? res ?? [];
  },
  getCampaigns: async (): Promise<SaleCampaign[]> => {
    const res: any = await axiosClient.get('/sales/campaigns');
    return res?.data ?? res ?? [];
  },
  getCampaign: async (id: string): Promise<SaleCampaignDetail> => {
    const res: any = await axiosClient.get(`/sales/campaigns/${id}`);
    return res?.data ?? res;
  },
  getTimingSuggestions: async (): Promise<SaleTimingResponse> => {
    const res: any = await axiosClient.get('/sales/timing-suggestions');
    return res?.data ?? res;
  },
  createCampaign: async (data: CreateSaleCampaignRequest) => {
    const res: any = await axiosClient.post('/sales/campaigns', data);
    return res?.data ?? res;
  },
  applyCampaign: async (id: string) => {
    const res: any = await axiosClient.post(`/sales/campaigns/${id}/apply`);
    return res?.data ?? res;
  },
  deactivateCampaign: async (id: string) => {
    const res: any = await axiosClient.post(`/sales/campaigns/${id}/deactivate`);
    return res?.data ?? res;
  },
  endCampaign: async (id: string) => {
    const res: any = await axiosClient.post(`/sales/campaigns/${id}/end`);
    return res?.data ?? res;
  },
  deleteCampaign: async (id: string) => {
    const res: any = await axiosClient.delete(`/sales/campaigns/${id}`);
    return res?.data ?? res;
  },

  // Get all active sales
  getActiveSales: () =>
    axiosClient.get<SaleVariant[]>('/sales/active'),

  // Get sale info for a variant
  getVariantSale: (variantId: string) =>
    axiosClient.get<SaleVariant>(`/sales/variant/${variantId}`),

  // Calculate final price
  calculatePrice: (variantId: string) =>
    axiosClient.get<PriceCalculation>(`/sales/variant/${variantId}/price`),

  // Apply sale to variants (admin)
  applySale: (data: ApplySaleRequest) =>
    axiosClient.post('/sales/apply', data),

  // Update variant sale (admin)
  updateVariantSale: (variantId: string, data: UpdateSaleRequest) =>
    axiosClient.put(`/sales/variant/${variantId}`, data),

  // Remove sale from variants (admin)
  removeSale: (variantIds: string[]) =>
    axiosClient.delete('/sales/remove', { data: { variantIds } }),
};
