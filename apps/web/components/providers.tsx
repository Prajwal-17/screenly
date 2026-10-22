"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { usePathname } from "next/navigation";
import { ApiError } from "@/lib/api";
export function Providers({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    if (path === "/") useUIStore.setState({ signingOut: false });
  }, [path]);
  useEffect(() => {
    void useUIStore.persist.rehydrate();
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
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
