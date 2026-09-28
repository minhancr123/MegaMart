import axiosClient from "@/lib/axiosClient";

export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type CampaignType = "VOUCHER" | "LOYALTY_POINTS" | "NOTIFICATION";
export type CampaignTrigger = "MANUAL" | "ON_SIGNUP" | "HEALTH_DROP" | "BIRTHDAY" | "ABANDONED_CART";

export interface MarketingCampaign {
  id: string;
  name: string;
  description?: string | null;
  type: CampaignType;
  trigger: CampaignTrigger;
  status: CampaignStatus;
  targetSegment?: string | null;
  minHealthScore?: number | null;
  rewardValue?: number | null;
  rewardType?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { history: number };
}

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  VOUCHER: "Mã giảm giá",
  LOYALTY_POINTS: "Điểm thưởng",
  NOTIFICATION: "Thông báo",
};

export const CAMPAIGN_TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "Chạy thủ công",
  ON_SIGNUP: "Khi đăng ký",
  HEALTH_DROP: "Khi sức khỏe giảm",
  BIRTHDAY: "Sinh nhật",
  ABANDONED_CART: "Bỏ quên giỏ hàng",
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  ACTIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  COMPLETED: "Đã hoàn tất",
};

export const campaignApi = {
  list: async (): Promise<MarketingCampaign[]> => {
    const res: any = await axiosClient.get("/admin/marketing/campaigns");
    return res?.data ?? res ?? [];
  },
  create: async (payload: Partial<MarketingCampaign>) => {
    const res: any = await axiosClient.post("/admin/marketing/campaigns", payload);
    return res?.data ?? res;
  },
  execute: async (id: string) => {
    const res: any = await axiosClient.post(`/admin/marketing/campaigns/${id}/execute`);
    return res?.data ?? res;
  },
  updateStatus: async (id: string, status: CampaignStatus) => {
    const res: any = await axiosClient.patch(`/admin/marketing/campaigns/${id}/status`, { status });
    return res?.data ?? res;
  },
  runHealthDropCron: async () => {
    const res: any = await axiosClient.post("/admin/marketing/campaigns/cron/health-drop");
    return res?.data ?? res;
  },
};
