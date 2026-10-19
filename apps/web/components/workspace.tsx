"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AudioLines,
  Loader2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties } from "react";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { useUserProfile } from "@/lib/profile";
import { InlineAlert } from "@/components/common";
import { WorkspaceSearch } from "@/components/workspace-search";
import { workspaceDestinations } from "@/lib/workspace-navigation";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-md text-xl font-semibold tracking-[-0.04em]"
      aria-label="Screenly home"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <AudioLines className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      Screenly
    </Link>
  );
}

export function Workspace({
  children,
  title,
  actions,
  voice = false,
  interviewActive = false,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  voice?: boolean;
  interviewActive?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const profile = useUserProfile();
  const needsOnboarding =
    profile.data?.status === "new" || profile.data?.status === "draft";
  const path = usePathname();
  const {
    navigationOpen,
    setNavigationOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    signingOut,
  } = useUIStore();
  const [focusExpanded, setFocusExpanded] = useState(false);
  const reducedMotion = useReducedMotion();
  const focusMode = voice && interviewActive;
  const collapsed = focusMode ? !focusExpanded : sidebarCollapsed;
  const toggleSidebar = () => {
    if (focusMode) setFocusExpanded((value) => !value);
    else setSidebarCollapsed(!sidebarCollapsed);
  };
  useEffect(() => {
    if (!isPending && !session && !signingOut) router.replace("/auth/sign-in");
  }, [isPending, session, signingOut, router]);
  useEffect(() => {
    if (session && needsOnboarding) router.replace("/onboarding");
  }, [session, needsOnboarding, router]);
  useEffect(() => {
    if (session && !needsOnboarding)
      document.getElementById("workspace-content")?.focus();
  }, [path, session, needsOnboarding, profile.isPending]);
  const context =
    title ??
    workspaceDestinations.find((item) => item.href === path)?.label ??
    (path === "/dashboard"
      ? "Overview"
      : path === "/history"
        ? "History"
        : path === "/interviews/new"
          ? "New interview"
          : path.endsWith("/feedback")
            ? "Feedback"
            : "Interview");
  if (isPending || !session || profile.isPending || needsOnboarding)
    return (
      <div
        className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" />
        Loading your workspace…
      </div>
    );
  if (profile.isError)
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Brand />
        <div className="mt-10">
          <InlineAlert>
            Could not load your profile.{" "}
            <Button variant="link" onClick={() => void profile.refetch()}>
              Try again
            </Button>
          </InlineAlert>
        </div>
      </div>
    );
  return (
    <motion.div
      className="min-h-dvh"
      initial={false}
      style={
        { "--sidebar-width": collapsed ? "64px" : "256px" } as CSSProperties
      }
      animate={{ "--sidebar-width": collapsed ? "64px" : "256px" }}
      transition={{
        duration: reducedMotion ? 0 : 0.24,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <a
        href="#workspace-content"
        className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-md border bg-card px-4 py-2 text-sm focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside
        id="workspace-sidebar"
        className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col overflow-hidden border-r bg-sidebar md:flex"
        aria-label="Screenly workspace"
        data-state={collapsed ? "collapsed" : "expanded"}
        data-focus-mode={focusMode}
      >
        <WorkspaceSidebar
          name={profile.data?.details.name || session.user.name}
          email={session.user.email}
          collapsed={collapsed}
        />
      </aside>
      <div className="min-w-0 md:ml-[var(--sidebar-width)]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-2 mr-1 hidden md:inline-flex"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              aria-controls="workspace-sidebar"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-[18px]" strokeWidth={1.7} />
              ) : (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.7} />
              )}
            </Button>
            <Sheet
              showHeader={false}
              open={navigationOpen}
              onOpenChange={setNavigationOpen}
              side="left"
              title="Navigation"
              description="Your Screenly workspace"
              className="w-[min(280px,85vw)] bg-sidebar"
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              }
            >
              <WorkspaceSidebar
                name={profile.data?.details.name || session.user.name}
                email={session.user.email}
                onNavigate={() => setNavigationOpen(false)}
              />
            </Sheet>
            <h1
              id="workspace-title"
              className="truncate text-sm leading-normal font-medium tracking-normal"
            >
              {context}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">{actions}</div>
        </header>
        <main
          id="workspace-content"
          aria-labelledby="workspace-title"
          tabIndex={-1}
          className={cn(
            "min-w-0 outline-none",
            voice
              ? "px-4 pb-4 sm:px-8"
              : "px-4 py-7 sm:px-6 sm:py-9 lg:px-8 xl:px-10",
          )}
        >
          <div
            className={cn(
              "mx-auto",
              voice ? "max-w-[1280px]" : "max-w-[1160px]",
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <WorkspaceSearch />
    </motion.div>
  );
}
