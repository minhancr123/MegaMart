import axiosClient from './axiosClient';

export interface WalletTransactionItem {
  id: string;
  type: string;
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  orderId?: string | null;
  refundRequestId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface WalletMe {
  id: string;
  userId: string;
  balance: number | string;
  currency: string;
  status: string;
  transactions: WalletTransactionItem[];
}

export const getMyWallet = async (): Promise<WalletMe> => {
  const res: any = await axiosClient.get('/wallet/me');
  return (res?.data ?? res) as WalletMe;
};

export const refundChannelName = (channel?: string | null) => {
  switch (String(channel || '').toUpperCase()) {
    case 'WALLET':
      return 'Ví nội bộ';
    case 'SEPAY':
      return 'SePay tự động';
    case 'MANUAL':
      return 'Thủ công';
    default:
      return channel || '—';
  }
};
