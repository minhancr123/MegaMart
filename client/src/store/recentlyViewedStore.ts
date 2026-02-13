import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  categorySlug?: string;
  categoryName?: string;
  viewedAt: number;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  addItem: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clearAll: () => void;
  getItems: (limit?: number) => RecentlyViewedItem[];
}

const MAX_ITEMS = 20;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          // Remove if already exists
          const filtered = state.items.filter((i) => i.id !== item.id);
          // Add to front with timestamp
          const newItems = [{ ...item, viewedAt: Date.now() }, ...filtered];
          // Keep max items
          return { items: newItems.slice(0, MAX_ITEMS) };
        });
      },

      clearAll: () => set({ items: [] }),

      getItems: (limit = 10) => {
        return get().items.slice(0, limit);
      },
    }),
    { name: "recently-viewed-storage" }
  )
);
