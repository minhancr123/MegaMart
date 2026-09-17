import axiosClient from "./axiosClient";

export interface SupplierProfile {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  contactName?: string;
  openPurchaseOrders: number;
  totalPurchaseOrders: number;
}

export interface SupplierPurchaseOrder {
  id: string;
  code: string;
  status: string;
  warehouseId: string;
  warehouse?: { id: string; name: string; code: string };
  supplier?: { id: string; name: string; code: string; address?: string };
  expectedDate?: string;
  notes?: string;
  totalAmount?: number;
  confirmedAt?: string;
  confirmedNote?: string;
  shipmentStatus?: string;
  shipmentProgress?: number;
  shipmentUpdatedAt?: string;
  createdAt: string;
  _count?: { items: number };
  items: Array<{
    id: string;
    variantId: string;
    orderedQty: number;
    receivedQty: number;
    unitPrice?: number | null;
    variant?: {
      id: string;
      sku: string;
      product?: { id: string; name: string; images?: Array<{ url: string }> };
    };
  }>;
}

const unwrapList = (res: any) => {
  const payload = res?.data ?? res;
  return {
    items: payload?.data ?? (Array.isArray(payload) ? payload : []),
    meta: payload?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
  };
};

export const supplierApi = {
  getProfile: async (): Promise<SupplierProfile> => {
    const res: any = await axiosClient.get("/supplier/profile");
    return res?.data ?? res;
  },

  getPurchaseOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res: any = await axiosClient.get(`/supplier/purchase-orders${qs}`);
    return unwrapList(res);
  },

  getPurchaseOrder: async (id: string): Promise<SupplierPurchaseOrder> => {
    const res: any = await axiosClient.get(`/supplier/purchase-orders/${id}`);
    return res?.data ?? res;
  },

  confirmPurchaseOrder: async (id: string, data?: { expectedDate?: string; note?: string }) => {
    const res: any = await axiosClient.put(`/supplier/purchase-orders/${id}/confirm`, data || {});
    return res?.data ?? res;
  },

  updateShipment: async (id: string, progress: number) => {
    const res: any = await axiosClient.patch(`/supplier/purchase-orders/${id}/shipment`, { progress });
    return res?.data ?? res;
  },
};
