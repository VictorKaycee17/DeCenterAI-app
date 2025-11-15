"use client";

import { create } from "zustand";

interface TopUpModalState {
  isOpen: boolean;
  toggleModal: () => void;
}

export const useTopUpModalState = create<TopUpModalState>((set) => ({
  isOpen: false,
  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
