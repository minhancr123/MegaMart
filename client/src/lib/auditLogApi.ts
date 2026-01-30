import axiosClient from './axiosClient';

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLogQueryParams {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogStats {
  topActions: Array<{
    action: string;
    count: number;
  }>;
  dailyActivity: Array<{
    date: string;
    count: number;
  }>;
}

export const auditLogApi = {
  // Get all audit logs with pagination
  getAll: (params?: AuditLogQueryParams) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    return axiosClient.get<AuditLogResponse>(`/audit-logs?${queryParams.toString()}`);
  },

  // Get stats
  getStats: (days = 30) => 
    axiosClient.get<AuditLogStats>(`/audit-logs/stats?days=${days}`),

  // Get logs for specific entity
  getByEntity: (entity: string, entityId: string) => 
    axiosClient.get<AuditLog[]>(`/audit-logs/entity/${entity}/${entityId}`),

  // Get logs for specific user
  getByUser: (userId: string, limit = 50) => 
    axiosClient.get<AuditLog[]>(`/audit-logs/user/${userId}?limit=${limit}`),

  // Cleanup old logs
  cleanup: (days = 90) => 
    axiosClient.delete<{ deleted: number }>(`/audit-logs/cleanup?days=${days}`),
};

// Audit action labels for display
export const auditActionLabels: Record<string, string> = {
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  USER_CREATE: 'Tạo người dùng',
  USER_UPDATE: 'Cập nhật người dùng',
  USER_DELETE: 'Xóa người dùng',
  PRODUCT_CREATE: 'Tạo sản phẩm',
  PRODUCT_UPDATE: 'Cập nhật sản phẩm',
  PRODUCT_DELETE: 'Xóa sản phẩm',
  ORDER_CREATE: 'Tạo đơn hàng',
  ORDER_UPDATE: 'Cập nhật đơn hàng',
  ORDER_STATUS_CHANGE: 'Thay đổi trạng thái đơn',
  ORDER_CANCEL: 'Hủy đơn hàng',
  CATEGORY_CREATE: 'Tạo danh mục',
  CATEGORY_UPDATE: 'Cập nhật danh mục',
  CATEGORY_DELETE: 'Xóa danh mục',
  BANNER_CREATE: 'Tạo banner',
  BANNER_UPDATE: 'Cập nhật banner',
  BANNER_DELETE: 'Xóa banner',
  FLASHSALE_CREATE: 'Tạo flash sale',
  FLASHSALE_UPDATE: 'Cập nhật flash sale',
  FLASHSALE_DELETE: 'Xóa flash sale',
  POST_CREATE: 'Tạo bài viết',
  POST_UPDATE: 'Cập nhật bài viết',
  POST_DELETE: 'Xóa bài viết',
  POST_PUBLISH: 'Xuất bản bài viết',
  SETTINGS_UPDATE: 'Cập nhật cài đặt',
};

// Audit entity labels for display
export const auditEntityLabels: Record<string, string> = {
  USER: 'Người dùng',
  PRODUCT: 'Sản phẩm',
  ORDER: 'Đơn hàng',
  CATEGORY: 'Danh mục',
  BANNER: 'Banner',
  FLASHSALE: 'Flash Sale',
  POST: 'Bài viết',
  SETTINGS: 'Cài đặt',
  AUTH: 'Xác thực',
};
