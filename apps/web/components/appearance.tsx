"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Appearance = "light" | "dark" | "system";
// Keep the alternate themes available internally without exposing a user switch.
export const appearanceSelectionEnabled = false;
const storageKey = "screenly:appearance";
const AppearanceContext = createContext<{
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
  saveError: boolean;
}>({ appearance: "dark", setAppearance: () => {}, saveError: false });

export const appearanceScript = appearanceSelectionEnabled
  ? `(function(){try{var p=localStorage.getItem('${storageKey}')||'dark';document.documentElement.classList.toggle('dark',p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));}catch{document.documentElement.classList.add('dark');}})();`
  : "document.documentElement.classList.add('dark');";

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appearance, updateAppearance] = useState<Appearance>("dark");
  const [saveError, setSaveError] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!appearanceSelectionEnabled) {
      document.documentElement.classList.add("dark");
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "dark" || saved === "system" || saved === "light")
        updateAppearance(saved);
    } catch {
      setSaveError(true);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        appearance === "dark" || (appearance === "system" && system.matches),
      );
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [appearance, ready]);
  function setAppearance(value: Appearance) {
    if (!appearanceSelectionEnabled) return;
    updateAppearance(value);
    try {
      localStorage.setItem(storageKey, value);
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  return (
    <AppearanceContext.Provider
      value={{ appearance, setAppearance, saveError }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => useContext(AppearanceContext);
