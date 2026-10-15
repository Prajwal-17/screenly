import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create<{
  navigationOpen: boolean;
  setNavigationOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  signingOut: boolean;
  setSigningOut: (value: boolean) => void;
}>()(
  persist(
    (set) => ({
      navigationOpen: false,
      setNavigationOpen: (navigationOpen) => set({ navigationOpen }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      searchOpen: false,
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      signingOut: false,
      setSigningOut: (signingOut) => set({ signingOut }),
    }),
    {
      name: "screenly-workspace-ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      skipHydration: true,
    },
  ),
);
