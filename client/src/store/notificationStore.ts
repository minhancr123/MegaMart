import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotificationType = "order" | "promo" | "flash_sale" | "system" | "points";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  link?: string;
  icon?: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotif: NotificationItem = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          read: false,
          createdAt: Date.now(),
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications].slice(0, 50),
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id);
          if (!notif || notif.read) return state;
          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notif = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notif && !notif.read ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    { name: "notification-storage" }
  )
);

// Helper to generate demo notifications
export function generateWelcomeNotifications() {
  const store = useNotificationStore.getState();
  if (store.notifications.length > 0) return; // Only generate once

  const demoNotifications: Omit<NotificationItem, "id" | "read" | "createdAt">[] = [
    {
      type: "promo",
      title: "🎉 Chào mừng bạn đến MegaMart!",
      message: "Nhận ngay voucher giảm 50K cho đơn hàng đầu tiên. Mã: WELCOME50K",
      link: "/products",
    },
    {
      type: "flash_sale",
      title: "⚡ Flash Sale đang diễn ra!",
      message: "Giảm đến 50% cho hàng trăm sản phẩm. Nhanh tay kẻo hết!",
      link: "/products?sort=discount",
    },
    {
      type: "system",
      title: "🛡️ Bảo mật tài khoản",
      message: "Hãy cập nhật mật khẩu và thêm số điện thoại để bảo vệ tài khoản.",
      link: "/profile",
    },
  ];

  demoNotifications.forEach((notif) => {
    store.addNotification(notif);
  });
}
