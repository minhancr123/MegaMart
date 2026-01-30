import axiosClient from './axiosClient';

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
  warehouse?: {
    id: string;
    name: string;
    code: string;
  };
  variant?: {
    id: string;
    sku: string;
    price: number;
    attributes?: any;
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
  unitPrice?: number;
  notes?: string;
  variant?: {
    id: string;
    sku: string;
    product?: {
      id: string;
      name: string;
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
  notes?: string;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice?: number;
    notes?: string;
  }>;
}

export interface InventoryQueryParams {
  warehouseId?: string;
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
    return axiosClient.get<{ data: WarehouseInventory[]; meta: any }>(
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
    return axiosClient.get<{ data: StockMovement[]; meta: any }>(
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
      attributes: any;
    }>>(`/inventory/variants/search?q=${encodeURIComponent(query)}`),

  createMovement: (data: CreateStockMovementDto) =>
    axiosClient.post<StockMovement>('/inventory/movements', data),

  completeMovement: (id: string) =>
    axiosClient.put<StockMovement>(`/inventory/movements/${id}/complete`),

  cancelMovement: (id: string) =>
    axiosClient.put<StockMovement>(`/inventory/movements/${id}/cancel`),
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
};

export const stockMovementStatusLabels: Record<StockMovementStatus, string> = {
  [StockMovementStatus.PENDING]: 'Chờ xử lý',
  [StockMovementStatus.COMPLETED]: 'Hoàn thành',
  [StockMovementStatus.CANCELLED]: 'Đã hủy',
};
