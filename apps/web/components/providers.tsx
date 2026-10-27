"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { usePathname } from "next/navigation";
import { ApiError } from "@/lib/api";
import { Wordmark } from "@/components/wordmark";
export function Providers({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    if (path === "/") useUIStore.setState({ signingOut: false });
  }, [path]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    let frame = 0;
    const dismissOverlays = () => {
      if (desktop.matches) return;
      // Dismiss transient layers in stack order so their focus traps and
      // aria-hidden state do not obscure the wider-window guidance. This does
      // not unmount the page or end an active interview.
      let attempts = 0;
      const dismiss = () => {
        if (
          desktop.matches ||
          attempts++ >= 8 ||
          !document.querySelector(
            '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]',
          )
        )
          return;
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        frame = requestAnimationFrame(dismiss);
      };
      dismiss();
    };
    desktop.addEventListener("change", dismissOverlays);
    return () => {
      desktop.removeEventListener("change", dismissOverlays);
      cancelAnimationFrame(frame);
    };
  }, []);
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15000,
            retry: (count, error) =>
              !(error instanceof ApiError && error.status === 401) && count < 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        <div className="max-[1024px]:hidden">{children}</div>
        <main className="fixed inset-0 z-[100] hidden items-center justify-center bg-background px-8 max-[1024px]:flex">
          <div className="max-w-md">
            <Wordmark />
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Use a wider window
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Screenly needs a desktop or laptop window at least 1024 pixels
              wide. If an interview is in progress, it remains open while you
              resize.
            </p>
          </div>
        </main>
      </MotionConfig>
    </QueryClientProvider>
  );
}
