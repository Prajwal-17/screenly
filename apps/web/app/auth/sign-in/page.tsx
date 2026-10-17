"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
    <div className="min-h-dvh px-6 py-8 md:px-16">
      <Brand />
      <main className="grid min-h-[calc(100dvh-8rem)] place-items-center py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="mb-8 text-3xl">
            {signup ? "Create an account" : "Sign in"}
          </h1>
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
                <span className="font-medium" aria-hidden="true">
                  G
                </span>
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
