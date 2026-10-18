"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/common";
import { Brand } from "@/components/workspace";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import voiceStyles from "@/components/voice-visual.module.css";
import styles from "./sign-in.module.css";

// Next.js removes this branch and the local sign-in chunk from production builds.
const DevelopmentLogin =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./dev-login"))
    : null;

export default function SignIn() {
  const [error, setError] = useState("");
  const [social, setSocial] = useState(false);
  const [localPending, setLocalPending] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  useEffect(() => {
    if (!isPending && session) router.replace("/dashboard");
  }, [isPending, session, router]);
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
        callbackURL: `${window.location.origin}/dashboard`,
        errorCallbackURL: `${window.location.origin}/auth/sign-in?error=oauth`,
      });
      if (result.error) {
        setError(
          result.error.message ?? "Google sign-in failed. Please try again.",
        );
        setSocial(false);
      }
    } catch {
      setError("Could not reach Google sign-in. Please try again.");
      setSocial(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
        <Brand />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:py-16">
        <div className="w-full max-w-[520px]">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[46px] leading-[1.02] tracking-[-0.04em] sm:text-[72px]">
              Think
              <br />
              <span className="text-primary">out loud.</span>
            </h1>
            <div
              className={`${voiceStyles.visual} ${styles.presence}`}
              data-state="ready"
              data-animated="false"
              aria-hidden="true"
            >
              <div className={voiceStyles.outline} />
              <div className={voiceStyles.reactive}>
                <div className={voiceStyles.orb}>
                  <div className={voiceStyles.surface} />
                  <div className={voiceStyles.ribbons} />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-base text-muted-foreground">
            Sign in to your practice space.
          </p>
          <div className="mt-8 flex flex-col gap-4" aria-label="Google sign-in">
            {error && <InlineAlert>{error}</InlineAlert>}
            {capabilities.isError ? (
              <InlineAlert>
                Could not check sign-in availability.
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => void capabilities.refetch()}
                >
                  Try again
                </Button>
              </InlineAlert>
            ) : capabilities.data && !capabilities.data.google ? (
              <InlineAlert>
                Google sign-in is unavailable. Please try again later.
              </InlineAlert>
            ) : null}
            <Button
              variant="outline"
              className="min-h-[52px] w-full justify-between px-5"
              loading={social || capabilities.isPending || isPending}
              disabled={!capabilities.data?.google || !!session || localPending}
              onClick={signIn}
            >
              <span className="inline-flex items-center gap-3">
                <FcGoogle className="size-5" aria-hidden="true" />
                Continue with Google
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </Button>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
            New here? Google creates your account automatically.
          </p>
          {DevelopmentLogin && capabilities.data?.devLogin && (
            <DevelopmentLogin
              disabled={social || isPending || !!session}
              onPendingChange={setLocalPending}
            />
          )}
        </div>
      </main>
    </div>
  );
}
