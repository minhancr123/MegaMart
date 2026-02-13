import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PointTransactionType = "earn" | "redeem" | "bonus" | "expire";

export interface PointTransaction {
  id: string;
  type: PointTransactionType;
  amount: number;
  description: string;
  orderId?: string;
  createdAt: number;
}

export interface LoyaltyTier {
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  color: string;
  icon: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: "Thành viên",
    minPoints: 0,
    maxPoints: 999,
    benefits: ["Tích 1 điểm/10.000đ", "Voucher sinh nhật"],
    color: "from-gray-400 to-gray-500",
    icon: "🥉",
  },
  {
    name: "Bạc",
    minPoints: 1000,
    maxPoints: 4999,
    benefits: ["Tích 1.5 điểm/10.000đ", "Voucher sinh nhật", "Freeship 2 lần/tháng"],
    color: "from-slate-400 to-slate-500",
    icon: "🥈",
  },
  {
    name: "Vàng",
    minPoints: 5000,
    maxPoints: 19999,
    benefits: ["Tích 2 điểm/10.000đ", "Voucher sinh nhật", "Freeship không giới hạn", "Ưu đãi riêng"],
    color: "from-yellow-400 to-amber-500",
    icon: "🥇",
  },
  {
    name: "Kim Cương",
    minPoints: 20000,
    maxPoints: Infinity,
    benefits: ["Tích 3 điểm/10.000đ", "Voucher sinh nhật VIP", "Freeship không giới hạn", "Ưu đãi độc quyền", "CSKH ưu tiên"],
    color: "from-cyan-400 to-blue-500",
    icon: "💎",
  },
];

export const REDEEMABLE_VOUCHERS = [
  { id: "v1", name: "Giảm 20.000đ", pointsCost: 200, code: "POINT20K", description: "Áp dụng cho đơn từ 200K" },
  { id: "v2", name: "Giảm 50.000đ", pointsCost: 450, code: "POINT50K", description: "Áp dụng cho đơn từ 500K" },
  { id: "v3", name: "Giảm 100.000đ", pointsCost: 850, code: "POINT100K", description: "Áp dụng cho đơn từ 1 triệu" },
  { id: "v4", name: "Giảm 200.000đ", pointsCost: 1600, code: "POINT200K", description: "Áp dụng cho đơn từ 2 triệu" },
  { id: "v5", name: "Freeship", pointsCost: 100, code: "POINTSHIP", description: "Miễn phí vận chuyển toàn quốc" },
];

interface LoyaltyState {
  totalPoints: number;
  lifetimePoints: number;
  transactions: PointTransaction[];
  redeemedVouchers: string[];
  
  // Actions
  earnPoints: (amount: number, description: string, orderId?: string) => void;
  redeemPoints: (amount: number, description: string) => boolean;
  addBonusPoints: (amount: number, description: string) => void;
  getCurrentTier: () => LoyaltyTier;
  getNextTier: () => LoyaltyTier | null;
  getProgressToNextTier: () => number;
  redeemVoucher: (voucherId: string) => { success: boolean; code?: string; message: string };
}

export const useLoyaltyStore = create<LoyaltyState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      lifetimePoints: 0,
      transactions: [],
      redeemedVouchers: [],

      earnPoints: (amount, description, orderId) => {
        const transaction: PointTransaction = {
          id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "earn",
          amount,
          description,
          orderId,
          createdAt: Date.now(),
        };
        set((state) => ({
          totalPoints: state.totalPoints + amount,
          lifetimePoints: state.lifetimePoints + amount,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        }));
      },

      redeemPoints: (amount, description) => {
        const state = get();
        if (state.totalPoints < amount) return false;
        
        const transaction: PointTransaction = {
          id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "redeem",
          amount: -amount,
          description,
          createdAt: Date.now(),
        };
        set({
          totalPoints: state.totalPoints - amount,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        });
        return true;
      },

      addBonusPoints: (amount, description) => {
        const transaction: PointTransaction = {
          id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "bonus",
          amount,
          description,
          createdAt: Date.now(),
        };
        set((state) => ({
          totalPoints: state.totalPoints + amount,
          lifetimePoints: state.lifetimePoints + amount,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        }));
      },

      getCurrentTier: () => {
        const { lifetimePoints } = get();
        return LOYALTY_TIERS.reduce((current, tier) => {
          if (lifetimePoints >= tier.minPoints) return tier;
          return current;
        }, LOYALTY_TIERS[0]);
      },

      getNextTier: () => {
        const { lifetimePoints } = get();
        return LOYALTY_TIERS.find((tier) => lifetimePoints < tier.minPoints) || null;
      },

      getProgressToNextTier: () => {
        const { lifetimePoints } = get();
        const currentTier = get().getCurrentTier();
        const nextTier = get().getNextTier();
        if (!nextTier) return 100;
        const range = nextTier.minPoints - currentTier.minPoints;
        const progress = lifetimePoints - currentTier.minPoints;
        return Math.min(100, Math.round((progress / range) * 100));
      },

      redeemVoucher: (voucherId) => {
        const voucher = REDEEMABLE_VOUCHERS.find((v) => v.id === voucherId);
        if (!voucher) return { success: false, message: "Voucher không tồn tại" };
        
        const state = get();
        if (state.totalPoints < voucher.pointsCost) {
          return { success: false, message: "Không đủ điểm" };
        }

        const redeemed = get().redeemPoints(voucher.pointsCost, `Đổi voucher: ${voucher.name}`);
        if (redeemed) {
          set((state) => ({
            redeemedVouchers: [...state.redeemedVouchers, voucher.code],
          }));
          return { success: true, code: voucher.code, message: `Đã đổi thành công! Mã voucher: ${voucher.code}` };
        }
        return { success: false, message: "Không thể đổi voucher" };
      },
    }),
    { name: "loyalty-storage" }
  )
);

// Helper: generate demo points for new users  
export function generateDemoPoints() {
  const store = useLoyaltyStore.getState();
  if (store.transactions.length > 0) return;

  store.addBonusPoints(100, "🎁 Điểm chào mừng thành viên mới!");
  store.earnPoints(50, "Mua đơn hàng #MG-1001", "MG-1001");
  store.earnPoints(120, "Mua đơn hàng #MG-1023", "MG-1023");
  store.addBonusPoints(50, "🎂 Bonus sinh nhật tháng 2!");
}
