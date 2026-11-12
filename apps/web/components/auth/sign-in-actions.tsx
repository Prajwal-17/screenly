"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";

// Next.js removes this branch and the local sign-in chunk from production builds.
const DevelopmentLogin =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("@/app/auth/sign-in/dev-login"))
    : null;

const subscribe = () => () => {};

export function SignInActions({
  redirectSignedIn = false,
}: {
  redirectSignedIn?: boolean;
}) {
  const [error, setError] = useState("");
  const [social, setSocial] = useState(false);
  const [localPending, setLocalPending] = useState(false);
  const router = useRouter();
  const {
    data: session,
    isPending,
    error: sessionError,
    refetch,
  } = authClient.useSession();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  useEffect(() => {
    if (redirectSignedIn && !isPending && session)
      router.replace("/interviews/new");
  }, [redirectSignedIn, isPending, session, router]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) {
      setError("Google sign-in was not completed. Please try again.");
    }
  }, []);

  async function signIn() {
    if (social || localPending) return;
    setSocial(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/interviews/new`,
        newUserCallbackURL: `${window.location.origin}/onboarding`,
        errorCallbackURL: `${window.location.origin}/auth/sign-in?error=oauth`,
      });
      if (result.error) {
        setError("Google sign-in failed. Please try again.");
        setSocial(false);
      }
    } catch {
      setError("Could not reach Google sign-in. Please try again.");
      setSocial(false);
    }
  }

  if (!hydrated || isPending || (session && redirectSignedIn)) {
    return (
      <div
        role="status"
        aria-label="Checking sign-in status"
        className="flex min-h-12 items-center gap-3 rounded-md bg-muted px-5 type-ui text-muted-foreground"
      >
        <span
          className="size-4 rounded-full bg-input motion-safe:animate-pulse"
          aria-hidden="true"
        />
        Checking your session…
      </div>
    );
  }
  if (session) {
    return (
      <Button asChild variant="outline" className="min-h-12 w-full">
        <Link href="/interviews/new">
          Go to app <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    );
  }
  if (sessionError) {
    return (
      <InlineAlert
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      >
        Could not check your session. Please try again.
      </InlineAlert>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-4" aria-label="Google sign-in">
        {error && <InlineAlert>{error}</InlineAlert>}
        {!capabilities.data &&
        (capabilities.isError ||
          capabilities.errorUpdatedAt > 0 ||
          capabilities.fetchStatus === "paused") ? (
          <InlineAlert
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => void capabilities.refetch()}
                loading={capabilities.isFetching}
                loadingLabel="Checking availability…"
                aria-label="Try again"
              >
                Try again
              </Button>
            }
          >
            {capabilities.fetchStatus === "paused"
              ? "You’re offline. Reconnect to sign in."
              : "Could not check sign-in availability."}
          </InlineAlert>
        ) : capabilities.data && !capabilities.data.google ? (
          <InlineAlert>
            Google sign-in is unavailable. Please try again later.
          </InlineAlert>
        ) : null}
        <Button
          variant="outline"
          className="min-h-12 w-full gap-3 px-5"
          loading={
            social ||
            (capabilities.isPending && capabilities.errorUpdatedAt === 0) ||
            isPending
          }
          aria-label="Continue with Google"
          loadingLabel={
            social
              ? "Opening Google…"
              : isPending
                ? "Checking your session…"
                : "Checking availability…"
          }
          disabled={!capabilities.data?.google || !!session || localPending}
          onClick={signIn}
        >
          <span className="inline-flex items-center gap-3">
            <FcGoogle className="size-5" aria-hidden="true" />
            Continue with Google
          </span>
        </Button>
      </div>

      {DevelopmentLogin && capabilities.data?.devLogin && (
        <DevelopmentLogin
          disabled={social || isPending || !!session}
          onPendingChange={setLocalPending}
        />
      )}
    </>
  );
}
