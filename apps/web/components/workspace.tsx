"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { useUserProfile } from "@/lib/profile";
import { ErrorState } from "@/components/common";
import { ApiError } from "@/lib/api";
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
  immersive = false,
  beforeNavigate,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  voice?: boolean;
  interviewActive?: boolean;
  immersive?: boolean;
  beforeNavigate?: () => Promise<boolean>;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const client = useQueryClient();
  const profile = useUserProfile();
  const sessionExpired =
    profile.error instanceof ApiError && profile.error.status === 401;
  // A cold retry returns the query to pending. Keep its recovery panel mounted
  // until data arrives so the action can show progress without a layout flash.
  const profileUnavailable =
    !profile.data && (profile.isError || profile.errorUpdatedAt > 0);
  const profileOffline = !profile.data && profile.fetchStatus === "paused";
  const profileReady = !!profile.data && !sessionExpired;
  const needsOnboarding =
    profile.data?.status === "new" || profile.data?.status === "draft";
  const path = usePathname();
  const {
    navigationOpen,
    setNavigationOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    signingOut,
    setSigningOut,
  } = useUIStore();
  const [focusExpanded, setFocusExpanded] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const reducedMotion = useReducedMotion();
  const focusMode = voice && interviewActive;
  const collapsed = focusMode ? !focusExpanded : sidebarCollapsed;
  const toggleSidebar = useCallback(() => {
    if (immersive) setNavigationOpen(!navigationOpen);
    else if (focusMode) setFocusExpanded((value) => !value);
    else setSidebarCollapsed(!sidebarCollapsed);
  }, [
    immersive,
    navigationOpen,
    setNavigationOpen,
    focusMode,
    setSidebarCollapsed,
    sidebarCollapsed,
  ]);
  useEffect(() => {
    if (signingOut || !session || needsOnboarding) return;
    const shortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "b" ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
          ))
      )
        return;
      event.preventDefault();
      if (window.matchMedia("(min-width: 768px)").matches) toggleSidebar();
      else setNavigationOpen(!useUIStore.getState().navigationOpen);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [signingOut, session, needsOnboarding, toggleSidebar, setNavigationOpen]);
  useEffect(() => {
    router.prefetch("/");
  }, [router]);
  async function signOut() {
    if (signingOut) return;
    if (beforeNavigate && !(await beforeNavigate())) return;
    setSigningOut(true);
    setSignOutError("");
    setNavigationOpen(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      client.clear();
      router.replace("/");
    } catch {
      setSigningOut(false);
      setSignOutError("Could not sign out. Try again.");
    }
  }
  useEffect(() => {
    if (!isPending && !session && !signingOut) router.replace("/auth/sign-in");
  }, [isPending, session, signingOut, router]);
  useEffect(() => {
    if (session && needsOnboarding) router.replace("/onboarding");
  }, [session, needsOnboarding, router]);
  useEffect(() => {
    if (session && !needsOnboarding)
      document
        .getElementById("workspace-content")
        ?.focus({ preventScroll: true });
  }, [path, session, needsOnboarding, profile.isPending, profileReady]);
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
  if (signingOut || isPending || !session || needsOnboarding)
    return (
      <div
        className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {signingOut ? "Signing out…" : "Loading your workspace…"}
      </div>
    );
  const navigation = (
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
          className={
            immersive
              ? "absolute top-2 left-3 z-20 sm:left-6"
              : "-ml-2 md:hidden"
          }
          aria-label="Open navigation"
          aria-keyshortcuts="Control+B Meta+B"
        >
          <Menu />
        </Button>
      }
    >
      <WorkspaceSidebar
        name={profile.data?.details.name || session.user.name}
        email={session.user.email}
        onNavigate={() => setNavigationOpen(false)}
        onSignOut={signOut}
        signOutError={signOutError}
      />
    </Sheet>
  );
  return (
    <motion.div
      className={immersive ? "h-dvh overflow-hidden" : "min-h-dvh"}
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
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col overflow-hidden border-r bg-sidebar",
          !immersive && "md:flex",
        )}
        aria-label="Screenly workspace"
        data-state={collapsed ? "collapsed" : "expanded"}
        data-focus-mode={focusMode}
      >
        <WorkspaceSidebar
          name={profile.data?.details.name || session.user.name}
          email={session.user.email}
          collapsed={collapsed}
          onSignOut={signOut}
          signOutError={signOutError}
        />
      </aside>
      <div
        className={cn(
          "min-w-0",
          immersive ? "relative h-full" : "md:ml-[var(--sidebar-width)]",
        )}
      >
        {immersive && navigation}
        {!immersive && (
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <Button
                variant="ghost"
                size="icon-sm"
                className="-ml-2 mr-1 hidden md:inline-flex"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-keyshortcuts="Control+B Meta+B"
                title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
                aria-expanded={!collapsed}
                aria-controls="workspace-sidebar"
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-[18px]" strokeWidth={1.7} />
                ) : (
                  <PanelLeftClose className="size-[18px]" strokeWidth={1.7} />
                )}
              </Button>
              {navigation}
              <div
                id="workspace-context"
                className="truncate text-sm leading-normal font-medium tracking-normal"
              >
                {context}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">{actions}</div>
          </header>
        )}
        <main
          id="workspace-content"
          aria-labelledby="workspace-title"
          tabIndex={-1}
          className={cn(
            "min-w-0 outline-none",
            immersive
              ? "h-full min-h-0 px-3 sm:px-6 lg:px-8"
              : voice
                ? "px-4 pb-4 sm:px-8"
                : "px-5 py-8 sm:px-8 sm:py-10 lg:px-10 xl:px-14",
          )}
        >
          {(immersive || voice) && (
            <h1 id="workspace-title" className="sr-only">
              {context}
            </h1>
          )}
          <div
            className={cn(
              "mx-auto",
              immersive
                ? "h-full min-h-0"
                : voice
                  ? "max-w-[1280px]"
                  : "max-w-[1080px]",
            )}
          >
            {!voice && !immersive && (
              <h1
                id="workspace-title"
                className="mb-3 text-[30px] font-semibold tracking-[-0.035em] sm:text-[36px]"
              >
                {context}
              </h1>
            )}
            {sessionExpired ? (
              <div className="max-w-xl py-6 sm:py-8">
                <ErrorState
                  title="Sign in to continue"
                  message="Your session needs to be refreshed before we can load your workspace."
                  action={
                    <Button asChild>
                      <a href="/auth/sign-in">Sign in again</a>
                    </Button>
                  }
                />
              </div>
            ) : profileUnavailable || profileOffline ? (
              <div className="max-w-xl py-6 sm:py-8">
                <ErrorState
                  title={
                    profileOffline
                      ? "You’re offline"
                      : "We couldn’t load your profile"
                  }
                  message={
                    profileOffline
                      ? "Reconnect to load your profile. We’ll try again automatically when you’re back online."
                      : "We couldn’t retrieve your workspace details. Try loading them again in a moment."
                  }
                  retry={
                    profileOffline ? undefined : () => void profile.refetch()
                  }
                  retryLabel="Retry loading profile"
                  retrying={profile.isFetching}
                  action={
                    path !== "/dashboard" && (
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href="/dashboard">Go to overview</Link>
                      </Button>
                    )
                  }
                />
              </div>
            ) : !profile.data && profile.isPending ? (
              <div
                className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
                role="status"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Loading your profile…
              </div>
            ) : (
              <>
                {profile.isError && !immersive && (
                  <div
                    role="status"
                    className="mb-6 flex flex-col gap-3 border-b pb-5 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-muted-foreground">
                      Your profile couldn’t refresh. Using your last loaded
                      details.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={profile.isFetching}
                      onClick={() => void profile.refetch()}
                    >
                      Retry profile
                    </Button>
                  </div>
                )}
                {children}
              </>
            )}
          </div>
        </main>
      </div>
      <WorkspaceSearch beforeNavigate={beforeNavigate} />
    </motion.div>
  );
}
