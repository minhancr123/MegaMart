import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CartItem {
    id : number;
    name : string;
    price : number;
    quantity : number;
    imageUrl : string;
}
interface CartState {
    items : CartItem[];
    addItem : (item : CartItem) => void;
    removeItem : (id : number) => void;
    updateQuantity : (id : number, quantity : number) => void;
    clearCart : () => void;
    getTotalItems : () => number;
    getTotalPrice : () => number;
}

export const useCartStore = create<CartState>() (
    persist((set ,get ) => ({
        items : [], 
        addItem  : (item) =>{
            const existingItem = get().items.find(i => i.id === item.id);

            if (existingItem) {
                get().updateQuantity(item.id, existingItem.quantity + item.quantity);
            }
            else{
                const newitems = [...get().items, item];
                set({items : newitems});
            }

           return get().items;
        },
        removeItem: (id) => {
            set((state) => ({
                items: state.items.filter(item => item.id !== id)
            }))
      },

      
      updateQuantity: (id, quantity) => {
        set((state) => ({
            items : state.items.map(item => item.id === id ? {...item , quantity} : item)
        }))
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotalItems: () => {
        const items = get().items;
        return items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        const items = get().items;
        return items.reduce((total, item) => total + item.price * item.quantity, 0);
      }
    }) , { name : "cart-storage" },
))