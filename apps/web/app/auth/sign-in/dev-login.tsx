"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/common";
import { request } from "@/lib/api";

export default function DevelopmentLogin({
  disabled,
  onPendingChange,
}: {
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || disabled) return;
    setPending(true);
    onPendingChange(true);
    setError("");
    try {
      await request("/auth/sign-in/development", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      // A new document fetches the cookie-backed session before entering the workspace.
      window.location.assign("/dashboard");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start the local session. Try again.",
      );
      setPending(false);
      onPendingChange(false);
    }
  }
  return (
    <section
      className="mt-8 border-t border-dashed pt-6"
      aria-labelledby="local-login-heading"
    >
      <h2
        id="local-login-heading"
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Code2 className="size-4 text-muted-foreground" aria-hidden="true" />
        Local development
      </h2>
      <p
        id="local-login-help"
        className="mt-2 text-[13px] leading-relaxed text-muted-foreground"
      >
        Email-only access to this local workspace.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="local-email">
          Development email
        </label>
        <Input
          id="local-email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending || disabled}
          aria-describedby={`local-login-help${error ? " local-login-error" : ""}`}
          aria-invalid={!!error}
        />
        {error && (
          <div id="local-login-error">
            <InlineAlert>{error}</InlineAlert>
          </div>
        )}
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          loading={pending}
          disabled={disabled}
        >
          Enter local workspace <ArrowRight aria-hidden="true" />
        </Button>
      </form>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Disabled in production.
      </p>
    </section>
  );
}
