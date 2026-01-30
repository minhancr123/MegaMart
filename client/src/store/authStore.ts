import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Cookie helper functions
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: () => void;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      isAuthenticated: false,
      setHasHydrated: () => set({ hasHydrated: true }),
      login: (user: User, token: string) => {
        // Save token to cookie for middleware to access
        setCookie('token', token, 7);
        // Dev-only: log token length and small snippet (do NOT log full token)
        try {
          console.log('authStore.login: token set, len=', token?.length, 'head=', token?.slice(0,8), 'tail=', token?.slice(-8));
        } catch (e) {}
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        // Remove token cookie
        deleteCookie('token');
        console.log('authStore.logout: token cookie deleted');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated();
          // Sync token to cookie on rehydration
          if (state.token) {
            setCookie('token', state.token, 7);
          }
        }
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
