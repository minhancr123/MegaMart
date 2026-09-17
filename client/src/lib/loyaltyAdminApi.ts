import axiosClient from './axiosClient';

export interface LoyaltyNurtureQueueItem {
  id: string;
  segment: string;
  message: string;
  status: 'PENDING' | 'APPROVED' | 'SENT' | 'REJECTED';
  approvedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  voucher: {
    id: string;
    code: string;
    value: number;
    minOrderValue: number | null;
    endDate: string | null;
    active: boolean;
  };
}

export const fetchLoyaltyNurtureQueue = async (status?: string): Promise<LoyaltyNurtureQueueItem[]> => {
  const qs = status ? `?status=${status}` : '';
  const res: any = await axiosClient.get(`/admin/loyalty-nurture/queue${qs}`);
  return (res?.data ?? res) as LoyaltyNurtureQueueItem[];
};

export const approveLoyaltyNurture = async (id: string) => {
  const res: any = await axiosClient.post(`/admin/loyalty-nurture/queue/${id}/approve`);
  return res?.data ?? res;
};

export const rejectLoyaltyNurture = async (id: string, note?: string) => {
  const res: any = await axiosClient.post(`/admin/loyalty-nurture/queue/${id}/reject`, { note });
  return res?.data ?? res;
};
