import axiosClient from "./axiosClient";

export interface NurtureQueueRow {
  id: string;
  segment: string;
  message: string;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  voucher: {
    id: string;
    code: string;
    value: number;
    minOrderValue: number | null;
    endDate: string | null;
    active: boolean;
  } | null;
}

export interface GovProposal {
  auditId: string;
  code: string;
  action: "extend" | "add_quota" | "lower_min" | "close_proposal";
  params: Record<string, number>;
  reason: string;
  createdAt: string;
  applied: boolean;
}

const unwrap = <T,>(res: any, fallback: T): T => {
  if (Array.isArray(res)) return res as unknown as T;
  if (Array.isArray(res?.data)) return res.data;
  return fallback;
};

/** Hàng chờ loyalty do agent tạo — admin duyệt trước khi gửi khách. */
export const loyaltyNurtureApi = {
  async list(status?: string): Promise<NurtureQueueRow[]> {
    const res: any = await axiosClient.get("/admin/loyalty-nurture/queue", {
      params: status && status !== "all" ? { status } : {},
    });
    return unwrap(res, []);
  },
  async approve(id: string): Promise<{ mailed: boolean; voucherCode?: string }> {
    const res: any = await axiosClient.post(
      `/admin/loyalty-nurture/queue/${id}/approve`,
    );
    return res?.data ?? res;
  },
  async reject(id: string, note?: string): Promise<unknown> {
    const res: any = await axiosClient.post(
      `/admin/loyalty-nurture/queue/${id}/reject`,
      note ? { note } : {},
    );
    return res?.data ?? res;
  },
};

/** Đề xuất governance voucher do agent ghi vào audit — admin bấm áp dụng. */
export const voucherGovernanceApi = {
  async proposals(): Promise<GovProposal[]> {
    const res: any = await axiosClient.get(
      "/admin/vouchers/governance/proposals",
    );
    return unwrap(res, []);
  },
  async apply(auditId: string): Promise<{ applied: boolean; reason?: string }> {
    const res: any = await axiosClient.post(
      `/admin/vouchers/governance/proposals/${auditId}/apply`,
    );
    return res?.data ?? res;
  },
};

export interface AgentJobRow {
  id: string;
  name: string;
  description: string;
  cron: string;
  envKey: string;
  envOn: boolean;
  enabled: boolean;
  effectiveOn: boolean;
  batchLabel: string | null;
  batchSize: number;
  defaultBatch: number;
  updatedAt: string | null;
}

/** Runtime agent jobs: bật/tắt + batch, hiệu lực kỳ cron tới, không restart. */
export const agentJobsApi = {
  async list(): Promise<AgentJobRow[]> {
    const res: any = await axiosClient.get("/admin/agent-jobs");
    return unwrap(res, []);
  },
  async update(
    jobId: string,
    dto: { enabled?: boolean; batchSize?: number },
  ): Promise<AgentJobRow> {
    const res: any = await axiosClient.patch(
      `/admin/agent-jobs/${jobId}`,
      dto,
    );
    return res?.data ?? res;
  },
};

export { getErrorMessage as apiErrorMessage } from "./utils";
