import { create } from "zustand";

interface UserState {
  email: string | null;
  wallet: string | null;
  isAuthenticated: boolean;
  setUser: (email: string, wallet: string) => void;
  clearUser: () => void;
}

export const useUser = create<UserState>((set) => ({
  email: null,
  wallet: null,
  isAuthenticated: false,
  setUser(email, wallet) {
    set({ email, wallet, isAuthenticated: true });
  },
  clearUser() {
    set({ email: null, wallet: null, isAuthenticated: false });
  },
}));
