import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/interfaces/product";

export interface CompareItem {
  id: string; // product id
  product: Product;
}

interface CompareState {
  items: CompareItem[];
  toggle: (product: Product) => void;
  remove: (productId: string) => void;
  clear: () => void;
  exists: (productId: string) => boolean;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const exists = get().items.some((i) => i.id === product.id);
        if (exists) {
          set((state) => ({ items: state.items.filter((i) => i.id !== product.id) }));
        } else {
          set((state) => ({ items: [...state.items, { id: product.id, product }] }));
        }
      },
      remove: (productId) => set((state) => ({ items: state.items.filter((i) => i.id !== productId) })),
      clear: () => set({ items: [] }),
      exists: (productId) => get().items.some((i) => i.id === productId),
    }),
    { name: "compare-storage" }
  )
);
