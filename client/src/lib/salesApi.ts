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

export interface PriceCalculation {
  originalPrice: string;
  finalPrice: string;
  discountPercent: number;
  savedAmount: string;
  discountType: 'FLASH_SALE' | 'REGULAR_SALE' | 'NONE';
}

export const salesApi = {
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
