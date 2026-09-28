import axiosClient from "./axiosClient";

export interface VoucherValidateResult {
  voucher: any;
  discount: number;
}

export interface AssignedVoucher {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: "FIXED" | "PERCENT" | "FREESHIP" | string;
  value: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  usageLimit?: number | null;
  usagePerUser?: number | null;
  usedCount: number;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  createdAt: string;
  usages?: Array<{
    id: string;
    usedAt: string;
    orderId?: string | null;
    order?: { id: string; code: string; status: string; total: number | string } | null;
  }>;
  _count?: { usages: number };
}

export const validateVoucher = async (code: string, subtotal: number, userId?: string) => {
  const res = await axiosClient.get(`/vouchers/${encodeURIComponent(code)}/validate`, {
    params: { subtotal, userId },
  });
  return (res as any)?.data || res;
};

export const getAssignedVouchers = async (userId: string): Promise<AssignedVoucher[]> => {
  const res: any = await axiosClient.get(`/vouchers/assigned/${userId}`);
  return res?.data ?? res ?? [];
};

export const getMyAvailableVouchers = async (): Promise<AssignedVoucher[]> => {
  const [myRes, pubRes] = await Promise.allSettled([
    axiosClient.get('/vouchers/my-vouchers'),
    axiosClient.get('/vouchers/public'),
  ]);

  const myList: AssignedVoucher[] = myRes.status === 'fulfilled' ? ((myRes.value as any)?.data ?? myRes.value ?? []) : [];
  const pubList: AssignedVoucher[] = pubRes.status === 'fulfilled' ? ((pubRes.value as any)?.data ?? pubRes.value ?? []) : [];

  // Hợp nhất danh sách voucher cá nhân và voucher công khai, loại trừ trùng code
  const map = new Map<string, AssignedVoucher>();
  for (const v of myList) {
    if (v && v.code) map.set(v.code, v);
  }
  for (const v of pubList) {
    if (v && v.code && !map.has(v.code)) {
      map.set(v.code, v);
    }
  }

  return Array.from(map.values());
};

export const getPublicVouchers = async (): Promise<AssignedVoucher[]> => {
  const res: any = await axiosClient.get('/vouchers/public');
  return res?.data ?? res ?? [];
};
