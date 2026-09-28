import axiosClient from "@/lib/axiosClient";

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string | null;
}

export interface CustomerNote {
  id: string;
  userId: string;
  authorId?: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name?: string | null; email: string } | null;
}

export interface TimelineItem {
  id: string;
  type: "ORDER" | "WALLET" | "LOYALTY" | "NOTE" | string;
  title: string;
  description: string;
  timestamp: string;
  linkUrl?: string;
  meta?: Record<string, unknown>;
}

export interface CrmCustomer {
  id: string;
  email: string;
  name?: string | null;
  healthScore: number;
  segment: string;
  totalSpent: number;
  orderCount: number;
  walletBalance: number;
  loyaltyPoints: number;
  tags: CustomerTag[];
}

export interface CrmProfile {
  healthScore: number;
  segment: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number;
  cancelledCount: number;
}

export const CRM_SEGMENT_LABELS: Record<string, string> = {
  ALL: "Tất cả phân khúc",
  NEW: "Khách mới",
  POTENTIAL: "Có tiềm năng",
  LOYAL: "Khách thân thiết",
  CHAMPION: "Khách VIP",
  AT_RISK: "Có nguy cơ rời bỏ",
  DORMANT: "Ngủ đông",
};

export const CRM_TIMELINE_TYPE_LABELS: Record<string, string> = {
  ORDER: "Đơn hàng",
  WALLET: "Ví tiền",
  LOYALTY: "Điểm thưởng",
  NOTE: "Ghi chú CSKH",
};

export const getCrmSegmentLabel = (segment?: string | null) => CRM_SEGMENT_LABELS[segment || ""] || "Chưa phân loại";
export const getCrmTimelineTypeLabel = (type?: string | null) => CRM_TIMELINE_TYPE_LABELS[type || ""] || "Hoạt động";

export const crmApi = {
  listCustomers: async (params?: { page?: number; limit?: number; search?: string; segment?: string; tagId?: string }): Promise<{ items: CrmCustomer[]; total: number; page: number; limit: number; totalPages: number }> => {
    const res: any = await axiosClient.get("/admin/crm/customers", { params });
    return res?.data ?? res;
  },
  bulkTag: async (payload: { userIds: string[]; tagId: string }) => {
    const res: any = await axiosClient.post("/admin/crm/bulk/tags", payload);
    return res?.data ?? res;
  },
  bulkPoints: async (payload: { userIds: string[]; amount: number; reason?: string }) => {
    const res: any = await axiosClient.post("/admin/crm/bulk/points", payload);
    return res?.data ?? res;
  },
  issuePersonalVouchers: async (payload: { userIds: string[]; title: string; type: string; value: number; minOrderValue?: number }) => {
    const res: any = await axiosClient.post("/admin/crm/bulk/vouchers", payload);
    return res?.data ?? res;
  },
  getTags: async (): Promise<CustomerTag[]> => {
    const res: any = await axiosClient.get("/admin/crm/tags");
    return res?.data ?? res ?? [];
  },
  createTag: async (payload: { name: string; color?: string; description?: string }): Promise<CustomerTag> => {
    const res: any = await axiosClient.post("/admin/crm/tags", payload);
    return res?.data ?? res;
  },
  assignTag: async (userId: string, tagId: string) => {
    const res: any = await axiosClient.post(`/admin/crm/customers/${userId}/tags`, { tagId });
    return res?.data ?? res;
  },
  removeTag: async (userId: string, tagId: string) => {
    const res: any = await axiosClient.delete(`/admin/crm/customers/${userId}/tags/${tagId}`);
    return res?.data ?? res;
  },
  getNotes: async (userId: string): Promise<CustomerNote[]> => {
    const res: any = await axiosClient.get(`/admin/crm/customers/${userId}/notes`);
    return res?.data ?? res ?? [];
  },
  createNote: async (userId: string, payload: { content: string; isPinned?: boolean }): Promise<CustomerNote> => {
    const res: any = await axiosClient.post(`/admin/crm/customers/${userId}/notes`, payload);
    return res?.data ?? res;
  },
  pinNote: async (id: string, isPinned: boolean) => {
    const res: any = await axiosClient.patch(`/admin/crm/notes/${id}/pin`, { isPinned });
    return res?.data ?? res;
  },
  deleteNote: async (id: string) => {
    const res: any = await axiosClient.delete(`/admin/crm/notes/${id}`);
    return res?.data ?? res;
  },
  getTimeline: async (userId: string): Promise<TimelineItem[]> => {
    const res: any = await axiosClient.get(`/admin/crm/customers/${userId}/timeline`);
    return res?.data ?? res ?? [];
  },
  getProfile: async (userId: string): Promise<CrmProfile> => {
    const res: any = await axiosClient.get(`/admin/crm/customers/${userId}/profile`);
    return res?.data ?? res;
  },
  dashboard: async () => {
    const res: any = await axiosClient.get("/admin/crm/dashboard");
    return res?.data ?? res;
  },
};
