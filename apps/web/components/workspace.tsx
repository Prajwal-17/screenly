"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
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
      className="inline-flex min-h-11 items-center rounded-md"
      aria-label="Screenly home"
    >
      <Wordmark />
    </Link>
  );
}

export function Workspace({
  children,
  title,
  actions,
  voice = false,
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
  const { navigationOpen, setNavigationOpen, signingOut, setSigningOut } =
    useUIStore();
  const [signOutError, setSignOutError] = useState("");
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
  useEffect(() => {
    document.title = `${context} · Screenly`;
  }, [context]);
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
  return (
    <SidebarProvider
      open
      openMobile={navigationOpen}
      onOpenMobileChange={setNavigationOpen}
      forceMobile={immersive}
      className={cn(
        "bg-sidebar",
        immersive && "h-dvh min-h-0 overflow-hidden p-2",
      )}
    >
      <a
        href="#workspace-content"
        className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-md border bg-card px-4 py-2 text-sm focus:translate-y-0"
      >
        Skip to content
      </a>
      <WorkspaceSidebar
        name={profile.data?.details.name || session.user.name}
        email={session.user.email}
        onSignOut={signOut}
        signOutError={signOutError}
      />
      <SidebarInset
        className={cn(
          "min-w-0 overflow-clip border border-border shadow-none!",
          immersive
            ? "m-0! h-full rounded-xl"
            : "min-h-dvh md:min-h-[calc(100dvh-1rem)]",
        )}
      >
        {immersive ? (
          <SidebarTrigger
            className="absolute top-2 left-3 z-20 sm:left-6"
            aria-label="Open navigation"
          />
        ) : (
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
            <h1
              id="workspace-title"
              className="min-w-0 flex-1 truncate text-sm leading-normal font-medium tracking-normal"
            >
              {context}
            </h1>
            {actions && (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
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
                : "flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-10",
          )}
        >
          {immersive && (
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
      </SidebarInset>
      <WorkspaceSearch beforeNavigate={beforeNavigate} />
    </SidebarProvider>
  );
}
