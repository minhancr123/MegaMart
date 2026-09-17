import axiosClient from './axiosClient';

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'ADJUST';
  description: string;
  orderId?: string | null;
  createdAt: string;
}

export interface RedeemedVoucher {
  id: string;
  userId: string;
  voucherId: string;
  rewardTemplateId: string;
  pointsCost: number;
  code: string;
  status: string;
  createdAt: string;
  isUsed: boolean;
  voucher: any;
}

export interface LoyaltySummary {
  totalPoints: number;
  lifetimePoints: number;
  transactions: PointTransaction[];
  redeemedVouchers: RedeemedVoucher[];
}

export const getMyLoyalty = async (): Promise<LoyaltySummary> => {
  const res: any = await axiosClient.get('/loyalty/me');
  return (res?.data ?? res) as LoyaltySummary;
};

export const redeemLoyaltyVoucher = async (templateId: string): Promise<{ success: boolean; code: string; message: string }> => {
  const res: any = await axiosClient.post('/loyalty/redeem', { templateId });
  return (res?.data ?? res) as any;
};
