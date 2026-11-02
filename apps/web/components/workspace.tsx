"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import {
  Loading,
  WorkspacePlaceholder,
  routeLoading,
} from "@/components/loading-state";
import { ErrorState, RefreshNotice } from "@/components/common";
import { ApiError } from "@/lib/api";
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
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch: refetchSession,
  } = authClient.useSession();
  const [retryingSession, setRetryingSession] = useState(false);
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
    if (
      !isPending &&
      !session &&
      !sessionError &&
      !retryingSession &&
      !signingOut
    )
      router.replace("/auth/sign-in");
  }, [isPending, session, sessionError, retryingSession, signingOut, router]);
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
    (path === "/history"
      ? "History"
      : path === "/interviews/new"
        ? "New interview"
        : path.endsWith("/feedback")
          ? "Interview review"
          : "Interview");
  useEffect(() => {
    document.title = `${context} · Screenly`;
  }, [context]);
  const loading = routeLoading(path);
  if (signingOut || !session || needsOnboarding)
    return (
      <WorkspacePlaceholder title={context}>
        {!session && !signingOut && (sessionError || retryingSession) ? (
          <ErrorState
            title="We couldn’t check your session"
            message="We couldn’t reach your account. Try connecting again to open your workspace."
            retry={() => {
              setRetryingSession(true);
              void refetchSession()
                .catch(() => {})
                .finally(() => setRetryingSession(false));
            }}
            retryLabel="Retry session"
            retrying={retryingSession}
          />
        ) : (
          <Loading
            {...loading}
            label={
              signingOut
                ? "Signing out…"
                : needsOnboarding
                  ? "Opening your profile…"
                  : loading.label
            }
          />
        )}
      </WorkspacePlaceholder>
    );
  return (
    <SidebarProvider
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
            title="Open navigation"
          />
        ) : (
          <header className="sticky top-0 z-20 flex h-[52px] shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
            <SidebarTrigger
              aria-label="Toggle navigation"
              title="Toggle navigation"
            />
            <h1
              id="workspace-title"
              className="min-w-0 flex-1 truncate type-label"
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
                : "flex-1 px-5 py-7 sm:px-8 sm:py-8",
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
                    path !== "/interviews/new" && (
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <Link href="/interviews/new">New interview</Link>
                      </Button>
                    )
                  }
                />
              </div>
            ) : !profile.data && profile.isPending ? (
              <Loading {...loading} />
            ) : (
              <>
                {profile.isError && !immersive && (
                  <RefreshNotice
                    message="Your profile couldn’t refresh. Using your last loaded details."
                    retry={() => void profile.refetch()}
                    retrying={profile.isFetching}
                  />
                )}
                {children}
              </>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
