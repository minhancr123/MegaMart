import axiosClient from './axiosClient';
import { VariantAttributes, PaginationMeta } from '@/interfaces/product';

// ============== TYPES ==============

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventories: number;
    stockMovements: number;
  };
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface PurchaseOrderItem {
  id: string;
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice?: number | null;
  notes?: string;
  variant?: {
    id: string;
    sku: string;
    price?: number;
    product?: { id: string; name: string; images?: Array<{ url: string }> };
  };
}

export interface PurchaseOrder {
  id: string;
  code: string;
  supplierId: string;
  supplier?: Supplier;
  warehouseId: string;
  warehouse?: Warehouse;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  notes?: string;
  totalAmount?: number;
  createdBy: string;
  createdAt: string;
  confirmedAt?: string;
  confirmedNote?: string;
  shipmentStatus?: string;
  shipmentProgress?: number;
  shipmentUpdatedAt?: string;
  items: PurchaseOrderItem[];
  movements?: Array<{
    id: string;
    code: string;
    type: string;
    status: string;
    qcStatus?: string;
    createdAt: string;
  }>;
  _count?: { items: number; movements: number };
}

export interface PalletBoxDetail {
  id: string;
  boxCode: string;
  level: number;
  slotIndex?: number | null;
  variantId?: string | null;
  quantity: number;
  notes?: string | null;
  tareWeight?: number | null;
  netWeight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  volume?: number | null;
  barcode?: string | null;
  poNumber?: string | null;
  exportPurpose?: string | null;
  exportTicketCode?: string | null;
  sealedBy?: string | null;
  sealedAt?: string | null;
  variant?: {
    id: string;
    sku: string;
    product?: { id: string; name: string; images?: Array<{ url: string }> };
  } | null;
}

export interface PalletStats {
  boxCount: number;
  totalWeight: number;
  weightPercent: number;
  totalVolume: number;
  volumePercent: number;
  levelsUsed: number;
  maxLevels: number;
  skuCount: number;
}

export interface Pallet {
  id: string;
  code: string;
  warehouseId: string;
  warehouse?: Warehouse;
  location?: string;
  status: string;
  notes?: string;
  maxLevels?: number;
  maxWeight?: number | null;
  maxVolume?: number | null;
  qcStatus?: string | null;
  qcNote?: string | null;
  stats?: PalletStats;
  boxes?: Array<{
    id: string;
    boxCode: string;
    level: number;
    variantId?: string | null;
    quantity: number;
    notes?: string | null;
    variant?: {
      id: string;
      sku: string;
      product?: { id: string; name: string; images?: Array<{ url: string }> };
    } | null;
  }>;
  _count?: { movementItems: number; inventories: number; boxes?: number };
}

export interface Lot {
  id: string;
  code: string;
  variantId: string;
  variant?: {
    id: string;
    sku: string;
    product?: { id: string; name: string; images?: Array<{ url: string }> };
  };
  warehouseId?: string;
  warehouse?: { id: string; name: string; code: string };
  supplierId?: string;
  supplier?: { id: string; name: string; code: string };
  quantity: number;
  initialQty: number;
  mfgDate?: string;
  expiryDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
  serials?: SerialNumber[];
  _count?: { serials: number };
}

export interface SerialNumber {
  id: string;
  serial: string;
  variantId: string;
  variant?: {
    id: string;
    sku: string;
    product?: { id: string; name: string };
  };
  lotId?: string;
  lot?: { id: string; code: string };
  status: string;
  orderId?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  contactName?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stockMovements: number;
  };
}

export interface WarehouseInventory {
  id: string;
  warehouseId: string;
  variantId: string;
  quantity: number;
  minQuantity: number;
  maxQuantity?: number;
  location?: string;
  pallet?: { id: string; code: string; location?: string } | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  variant?: {
    id: string;
    sku: string;
    price: number;
    attributes?: VariantAttributes;
    product?: {
      id: string;
      name: string;
      images?: Array<{ url: string }>;
    };
  };
}

export enum StockMovementType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  DAMAGE = 'DAMAGE',
  SALE = 'SALE',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
}

export enum StockMovementStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface StockMovementItem {
  id: string;
  variantId: string;
  quantity: number;
  orderedQty?: number | null;
  qcPassedQty?: number | null;
  qcFailedQty?: number;
  qcNote?: string | null;
  putawayLocation?: string | null;
  palletId?: string | null;
  pallet?: { id: string; code: string; location?: string } | null;
  unitPrice?: number;
  notes?: string;
  variant?: {
    id: string;
    sku: string;
    price: bigint;
    attributes?: VariantAttributes;
    product?: {
      id: string;
      name: string;
      images?: Array<{
        id: string;
        url: string;
        alt?: string;
        isPrimary: boolean;
        displayOrder: number;
      }>;
    };
  };
}

export interface StockMovement {
  id: string;
  code: string;
  type: StockMovementType;
  warehouseId: string;
  supplierId?: string;
  toWarehouseId?: string;
  orderId?: string;
  notes?: string;
  status: StockMovementStatus;
  qcStatus?: string;
  purchaseOrderId?: string | null;
  purchaseOrder?: { id: string; code: string; status: string } | null;
  totalAmount?: number;
  createdBy: string;
  completedAt?: string;
  createdAt: string;
  warehouse?: Warehouse;
  supplier?: Supplier;
  items: StockMovementItem[];
}

// ============== DTOs ==============

export interface CreateWarehouseDto {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export interface CreateSupplierDto {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  contactName?: string;
  notes?: string;
}

export interface CreateStockMovementDto {
  type: StockMovementType;
  warehouseId: string;
  supplierId?: string;
  toWarehouseId?: string;
  purchaseOrderId?: string;
  notes?: string;
  items: Array<{
    variantId: string;
    quantity: number;
    orderedQty?: number;
    unitPrice?: number;
    notes?: string;
  }>;
}

export interface InventoryQueryParams {
  warehouseId?: string;
  variantId?: string;
  productId?: string;
  lowStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface StockMovementQueryParams {
  type?: StockMovementType;
  warehouseId?: string;
  supplierId?: string;
  status?: StockMovementStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============== API ==============

export const inventoryApi = {
  // Warehouses
  getWarehouses: (includeInactive = false) =>
    axiosClient.get<Warehouse[]>(`/inventory/warehouses?includeInactive=${includeInactive}`),
  
  getWarehouse: (id: string) =>
    axiosClient.get<Warehouse>(`/inventory/warehouses/${id}`),
  
  createWarehouse: (data: CreateWarehouseDto) =>
    axiosClient.post<Warehouse>('/inventory/warehouses', data),
  
  updateWarehouse: (id: string, data: Partial<CreateWarehouseDto>) =>
    axiosClient.put<Warehouse>(`/inventory/warehouses/${id}`, data),
  
  deleteWarehouse: (id: string) =>
    axiosClient.delete(`/inventory/warehouses/${id}`),

  // Suppliers
  getSuppliers: (includeInactive = false) =>
    axiosClient.get<Supplier[]>(`/inventory/suppliers?includeInactive=${includeInactive}`),
  
  getSupplier: (id: string) =>
    axiosClient.get<Supplier>(`/inventory/suppliers/${id}`),
  
  createSupplier: (data: CreateSupplierDto) =>
    axiosClient.post<Supplier>('/inventory/suppliers', data),
  
  updateSupplier: (id: string, data: Partial<CreateSupplierDto>) =>
    axiosClient.put<Supplier>(`/inventory/suppliers/${id}`, data),
  
  deleteSupplier: (id: string) =>
    axiosClient.delete(`/inventory/suppliers/${id}`),

  // Inventory
  getInventory: (params?: InventoryQueryParams) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    return axiosClient.get<{ data: WarehouseInventory[]; meta: PaginationMeta }>(
      `/inventory/stock?${queryParams.toString()}`
    );
  },

  getLowStock: (warehouseId?: string) =>
    axiosClient.get<WarehouseInventory[]>(
      `/inventory/stock/low${warehouseId ? `?warehouseId=${warehouseId}` : ''}`
    ),

  getStats: (warehouseId?: string) =>
    axiosClient.get<{ totalItems: number; lowStockCount: number; totalValue: number }>(
      `/inventory/stock/stats${warehouseId ? `?warehouseId=${warehouseId}` : ''}`
    ),

  updateInventory: (warehouseId: string, variantId: string, data: { quantity: number; minQuantity?: number; location?: string }) =>
    axiosClient.put<WarehouseInventory>(`/inventory/stock/${warehouseId}/${variantId}`, data),

  // Stock Movements
  getMovements: (params?: StockMovementQueryParams) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    return axiosClient.get<{ data: StockMovement[]; meta: PaginationMeta }>(
      `/inventory/movements?${queryParams.toString()}`
    );
  },

  getMovementById: (id: string) =>
    axiosClient.get<StockMovement>(`/inventory/movements/${id}`),

  searchVariants: (query: string) =>
    axiosClient.get<Array<{
      variantId: string;
      sku: string;
      productId: string;
      productName: string;
      price: number;
      stock: number;
      imageUrl?: string;
      attributes: VariantAttributes;
    }>>(`/inventory/variants/search?q=${encodeURIComponent(query)}`),

  createMovement: (data: CreateStockMovementDto) =>
    axiosClient.post<StockMovement>('/inventory/movements', data),

  completeMovement: (id: string) =>
    axiosClient.put<StockMovement>(`/inventory/movements/${id}/complete`),

  cancelMovement: (id: string) =>
    axiosClient.put<StockMovement>(`/inventory/movements/${id}/cancel`),

  // QC phiếu nhập: đạt/lỗi từng dòng + vị trí kệ + pallet
  updateMovementQc: (
    id: string,
    data: {
      items: Array<{
        variantId: string;
        qcPassedQty: number;
        qcFailedQty?: number;
        qcNote?: string;
        putawayLocation?: string;
        palletId?: string;
      }>;
    }
  ) => axiosClient.patch<StockMovement>(`/inventory/movements/${id}/qc`, data),

  // Purchase Order
  getPurchaseOrders: (params?: {
    status?: string;
    supplierId?: string;
    warehouseId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    return axiosClient.get<{ data: PurchaseOrder[]; meta: PaginationMeta }>(
      `/inventory/purchase-orders?${queryParams.toString()}`
    );
  },

  getPurchaseOrder: (id: string) =>
    axiosClient.get<PurchaseOrder>(`/inventory/purchase-orders/${id}`),

  createPurchaseOrder: (data: {
    supplierId: string;
    warehouseId: string;
    expectedDate?: string;
    notes?: string;
    items: Array<{ variantId: string; orderedQty: number; unitPrice?: number; notes?: string }>;
  }) => axiosClient.post<PurchaseOrder>('/inventory/purchase-orders', data),

  sendPurchaseOrder: (id: string) =>
    axiosClient.put<PurchaseOrder>(`/inventory/purchase-orders/${id}/send`),

  cancelPurchaseOrder: (id: string) =>
    axiosClient.put<PurchaseOrder>(`/inventory/purchase-orders/${id}/cancel`),

  sendPurchaseOrderEmail: (id: string) =>
    axiosClient.post<{ success: boolean; to: string; code: string }>(
      `/inventory/purchase-orders/${id}/send-email`
    ),

  updateShipment: (id: string, progress: number) =>
    axiosClient.put(`/inventory/purchase-orders/${id}/shipment`, { progress }),

  // Pallet
  getPallets: (warehouseId?: string) =>
    axiosClient.get<Pallet[]>(`/inventory/pallets${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),

  createPallet: (data: { code: string; warehouseId: string; location?: string; notes?: string }) =>
    axiosClient.post<Pallet>('/inventory/pallets', data),

  updatePallet: (id: string, data: { location?: string | null; status?: string; notes?: string | null }) =>
    axiosClient.put<Pallet>(`/inventory/pallets/${id}`, data),

  // Lot
  getLots: (params?: { variantId?: string; warehouseId?: string; status?: string; expiry?: string; search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    return axiosClient.get<{ data: Lot[]; meta: PaginationMeta }>(
      `/inventory/lots?${queryParams.toString()}`
    );
  },

  getLot: (id: string) => axiosClient.get<Lot>(`/inventory/lots/${id}`),

  createLot: (data: { code?: string; variantId: string; warehouseId?: string; supplierId?: string; quantity: number; mfgDate?: string; expiryDate?: string; notes?: string }) =>
    axiosClient.post<Lot>('/inventory/lots', data),

  updateLot: (id: string, data: { quantity?: number; mfgDate?: string; expiryDate?: string; status?: string; notes?: string }) =>
    axiosClient.put<Lot>(`/inventory/lots/${id}`, data),

  getExpiryAlerts: () =>
    axiosClient.get<{ expiredCount: number; expiringCount: number; expired: any[]; expiring: any[] }>(
      '/inventory/lots/expiry-alerts'
    ),

  // Serial
  getSerials: (params?: { variantId?: string; lotId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    return axiosClient.get<{ data: SerialNumber[]; meta: PaginationMeta }>(
      `/inventory/serials?${queryParams.toString()}`
    );
  },

  createSerials: (data: { variantId: string; lotId?: string; serials: string[]; notes?: string }) =>
    axiosClient.post<{ created: number; skipped: number }>('/inventory/serials', data),

  updateSerial: (id: string, data: { status?: string; orderId?: string; notes?: string }) =>
    axiosClient.put(`/inventory/serials/${id}`, data),

  getPallet: (id: string) => axiosClient.get<Pallet>(`/inventory/pallets/${id}`),

  getPalletHistory: (id: string, limit = 20) =>
    axiosClient.get(`/inventory/pallets/${id}/history?limit=${limit}`),

  transferPalletBox: (data: { boxId: string; toPalletId: string; targetLevel: number }) =>
    axiosClient.post(`/inventory/pallets/transfer-box`, data),

  createPalletBox: (
    palletId: string,
    data: {
      boxCode?: string; level: number; variantId?: string; quantity?: number; notes?: string;
      tareWeight?: number | null; netWeight?: number | null;
      length?: number | null; width?: number | null; height?: number | null; volume?: number | null;
      barcode?: string | null; poNumber?: string | null; exportPurpose?: string | null;
      exportTicketCode?: string | null; sealedBy?: string | null; slotIndex?: number | null;
    }
  ) => axiosClient.post(`/inventory/pallets/${palletId}/boxes`, data),

  updatePalletBox: (
    palletId: string,
    boxId: string,
    data: {
      level?: number; variantId?: string | null; quantity?: number; notes?: string | null;
      tareWeight?: number | null; netWeight?: number | null;
      length?: number | null; width?: number | null; height?: number | null; volume?: number | null;
      barcode?: string | null; poNumber?: string | null; exportPurpose?: string | null;
      exportTicketCode?: string | null; sealedBy?: string | null; slotIndex?: number | null;
    }
  ) => axiosClient.put(`/inventory/pallets/${palletId}/boxes/${boxId}`, data),

  deletePalletBox: (palletId: string, boxId: string) =>
    axiosClient.delete(`/inventory/pallets/${palletId}/boxes/${boxId}`),
};

// Labels for display
export const stockMovementTypeLabels: Record<StockMovementType, string> = {
  [StockMovementType.IMPORT]: 'Nhập kho',
  [StockMovementType.EXPORT]: 'Xuất kho',
  [StockMovementType.TRANSFER_IN]: 'Chuyển kho đến',
  [StockMovementType.TRANSFER_OUT]: 'Chuyển kho đi',
  [StockMovementType.ADJUSTMENT]: 'Điều chỉnh',
  [StockMovementType.RETURN]: 'Trả hàng',
  [StockMovementType.DAMAGE]: 'Hư hỏng',
  [StockMovementType.SALE]: 'Bán hàng',
  [StockMovementType.RESERVE]: 'Giữ hàng',
  [StockMovementType.RELEASE]: 'Giải phóng hàng giữ',
};

export const stockMovementStatusLabels: Record<StockMovementStatus, string> = {
  [StockMovementStatus.PENDING]: 'Chờ xử lý',
  [StockMovementStatus.COMPLETED]: 'Hoàn thành',
  [StockMovementStatus.CANCELLED]: 'Đã hủy',
};
