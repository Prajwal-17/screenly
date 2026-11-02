"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

export function AccountActions({
  placement,
}: {
  placement: "header" | "footer";
}) {
  const { data: session, isPending } = authClient.useSession();
  // The shared session can resolve before the footer's server HTML hydrates.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!hydrated || (isPending && !session)) {
    return (
      <span
        role="status"
        aria-label="Checking sign-in status"
        className="inline-flex min-h-11 items-center"
      >
        <span
          aria-hidden="true"
          className={`rounded-md bg-muted motion-safe:animate-pulse ${
            placement === "header" ? "h-9 w-30" : "h-4 w-16"
          }`}
        />
      </span>
    );
  }

  if (placement === "footer") {
    return (
      <Link
        href={session ? "/interviews/new" : "/auth/sign-in"}
        className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
      >
        {session ? "Go to app" : "Sign in"}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {!session && (
        <Link
          href="/auth/sign-in"
          className="inline-flex min-h-11 items-center text-sm underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      )}
      <Button asChild size="sm">
        <Link href="/interviews/new">
          {session ? "Go to app" : "Get started"}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
