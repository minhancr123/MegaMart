import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/interfaces/product";

export interface WishlistItem {
  id: string; // product id
  product: Product;
}

interface WishlistState {
  items: WishlistItem[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  toggle: (product: Product) => void;
  clear: () => void;
  exists: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product) => {
        const exists = get().items.some((i) => i.id === product.id);
        if (exists) return;
        set((state) => ({ items: [...state.items, { id: product.id, product }] }));
      },
      remove: (productId) => {
        set((state) => ({ items: state.items.filter((i) => i.id !== productId) }));
      },
      toggle: (product) => {
        const exists = get().items.some((i) => i.id === product.id);
        if (exists) {
          get().remove(product.id);
        } else {
          get().add(product);
        }
      },
      clear: () => set({ items: [] }),
      exists: (productId) => get().items.some((i) => i.id === productId),
    }),
    { name: "wishlist-storage" }
  )
);
