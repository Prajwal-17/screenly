import { create } from "zustand";

export const useUIStore = create<{
  navigationOpen: boolean;
  setNavigationOpen: (open: boolean) => void;
}>((set) => ({
  navigationOpen: false,
  setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
}));
