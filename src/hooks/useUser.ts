import { create } from "zustand";

interface UserState {
  userId: number | null;
  email: string | null;
  wallet: string | null;
  username: string | null;
  profile_image: string | null;
  isAuthenticated: boolean;
  setUser: (
    userId: number,
    email: string,
    wallet: string,
    username?: string | null,
    profile_image?: string | null
  ) => void;
  updateProfile: (
    updates: Partial<Pick<UserState, "username" | "profile_image">>
  ) => void;
  clearUser: () => void;
}

export const useUser = create<UserState>((set) => ({
  userId: null,
  email: null,
  wallet: null,
  username: null,
  profile_image: null,
  isAuthenticated: false,
  setUser(userId, email, wallet, username = null, profile_image = null) {
    set({
      userId,
      email,
      wallet,
      username,
      profile_image,
      isAuthenticated: true,
    });
  },
  updateProfile(updates) {
    set((state) => ({
      ...state,
      ...updates,
    }));
  },
  clearUser() {
    set({
      userId: null,
      email: null,
      wallet: null,
      username: null,
      profile_image: null,
      isAuthenticated: false,
    });
  },
}));
