"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, AudioLines, Check } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { InlineAlert } from "@/components/common";
import { Brand } from "@/components/workspace";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
type Fields = { name: string; email: string; password: string };
export default function SignIn() {
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [social, setSocial] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const form = useForm<Fields>();
  useEffect(() => {
    if (!isPending && session) router.replace("/dashboard");
  }, [isPending, session, router]);
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const result = signup
        ? await authClient.signUp.email({
            name: values.name,
            email: values.email,
            password: values.password,
          })
        : await authClient.signIn.email({
            email: values.email,
            password: values.password,
          });
      if (result.error) {
        setError(result.error.message ?? "Could not sign in. Try again.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  });
  return (
    <div className="min-h-dvh">
      <header className="flex h-20 items-center border-b px-6 sm:px-10">
        <Brand />
      </header>
      <main className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-24 lg:px-10">
        <section className="hidden self-stretch flex-col justify-center py-8 lg:flex">
          <div className="mb-8 grid size-14 place-items-center rounded-2xl bg-accent text-primary">
            <AudioLines
              className="size-7"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <h2 className="max-w-[12ch] text-[46px] leading-[1.12] tracking-[-0.04em]">
            Find your words.
            <br />
            <span className="text-primary">Build your confidence.</span>
          </h2>
          <p className="mt-6 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
            A space to think out loud, work through technical questions, and
            learn from every answer.
          </p>
          <ul className="mt-10 space-y-4 text-[13px] text-ink-secondary">
            {[
              "Practice for the role you want",
              "Speak naturally with your interviewer",
              "Get feedback grounded in your answers",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Check className="size-4 text-primary" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <div className="mx-auto w-full max-w-[420px] rounded-xl border bg-card p-6 sm:p-8">
          <h1 className="text-[26px] sm:text-[28px]">
            {signup ? "Create an account" : "Sign in"}
          </h1>
          <p className="mt-2 mb-7 text-sm text-muted-foreground">
            {signup
              ? "Your next interview starts with a little practice."
              : "Welcome back. Let’s keep practicing."}
          </p>
          {capabilities.data?.google && (
            <>
              <Button
                variant="outline"
                className="w-full"
                loading={social}
                onClick={async () => {
                  setSocial(true);
                  setError("");
                  try {
                    const result = await authClient.signIn.social({
                      provider: "google",
                      callbackURL: `${window.location.origin}/dashboard`,
                    });
                    if (result.error)
                      setError(
                        result.error.message ?? "Google sign-in failed.",
                      );
                  } catch {
                    setError("Google sign-in is unavailable.");
                  } finally {
                    setSocial(false);
                  }
                }}
              >
                <FcGoogle className="size-4" aria-hidden="true" />
                Continue with Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                or
                <Separator className="flex-1" />
              </div>
            </>
          )}
          <form onSubmit={submit}>
            <FieldGroup>
              {signup && (
                <Field>
                  <FieldLabel htmlFor="name">Your name</FieldLabel>
                  <Input
                    id="name"
                    required
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Your name"
                    {...form.register("name", {
                      required: signup,
                      maxLength: 80,
                    })}
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input
                  id="email"
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...form.register("email", { required: true })}
                />
              </Field>
              <Field data-invalid={!!form.formState.errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  required
                  type="password"
                  minLength={signup ? 8 : 1}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={
                    form.formState.errors.password
                      ? "password-error"
                      : undefined
                  }
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder={
                    signup ? "At least 8 characters" : "Your password"
                  }
                  {...form.register("password", {
                    required: true,
                    minLength: signup ? 8 : 1,
                  })}
                />
                {form.formState.errors.password && (
                  <FieldError id="password-error">
                    Use at least {signup ? 8 : 1} characters.
                  </FieldError>
                )}
              </Field>
              {error && <InlineAlert>{error}</InlineAlert>}
              <Button loading={form.formState.isSubmitting}>
                <ArrowRight aria-hidden="true" />
                {signup ? "Create account" : "Sign in"}
              </Button>
            </FieldGroup>
          </form>
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            {signup ? "Already have an account?" : "New to Screenly?"}{" "}
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setSignup(!signup);
                setError("");
                form.clearErrors();
              }}
            >
              {signup ? "Sign in" : "Create an account"}
            </Button>
          </p>
        </div>
      </main>
    </div>
  );
}
