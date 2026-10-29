import { create } from "zustand";

export const useUIStore = create<{
  navigationOpen: boolean;
  setNavigationOpen: (open: boolean) => void;
  signingOut: boolean;
  setSigningOut: (value: boolean) => void;
}>()((set) => ({
  navigationOpen: false,
  setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
  signingOut: false,
  setSigningOut: (signingOut) => set({ signingOut }),
}));
