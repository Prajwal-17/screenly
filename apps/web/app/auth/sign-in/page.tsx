"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AudioLines } from "lucide-react";
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
    <div className="auth-shell">
      <aside className="auth-story">
        <Brand />
        <div className="auth-story-copy">
          <span className="tag green">
            <AudioLines size={13} />A little practice goes a long way
          </span>
          <h1>
            Show up as
            <br />
            your best self.
          </h1>
          <p>
            A space to think out loud, find your footing, and turn preparation
            into confidence.
          </p>
          <div className="divider" />
          <div className="eyebrow">
            Your next opportunity deserves a little preparation.
          </div>
        </div>
        <small>Forma · Thoughtful technical interview practice</small>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="eyebrow accent">
            {signup ? "Your next chapter" : "Welcome back"}
          </div>
          <h2>{signup ? "Make space to grow." : "Keep moving forward."}</h2>
          <p>
            {signup
              ? "Create your personal practice workspace."
              : "Sign in and pick up where you left off."}
          </p>
          {capabilities.data?.google && (
            <>
              <button
                className="button secondary"
                disabled={social}
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
                {social ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <span style={{ fontWeight: 700 }}>G</span>
                )}
                Continue with Google
              </button>
              <div className="auth-or">or continue with email</div>
            </>
          )}
          <form onSubmit={submit}>
            {signup && (
              <div className="field">
                <label htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="input"
                  autoComplete="name"
                  placeholder="Your name"
                  {...form.register("name", {
                    required: signup,
                    maxLength: 80,
                  })}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...form.register("email", { required: true })}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={signup ? "At least 8 characters" : "Your password"}
                {...form.register("password", {
                  required: true,
                  minLength: signup ? 8 : 1,
                })}
              />
              {form.formState.errors.password && (
                <small role="alert">
                  Use at least {signup ? 8 : 1} characters.
                </small>
              )}
            </div>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <button className="button" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <ArrowRight size={16} />
              )}{" "}
              {signup ? "Create my workspace" : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already have a workspace?" : "New to Forma?"}{" "}
            <button
              onClick={() => {
                setSignup(!signup);
                setError("");
                form.clearErrors();
              }}
            >
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p style={{ textAlign: "center", fontSize: 11, marginTop: 30 }}>
            A personal space for practice and progress.
          </p>
        </div>
      </main>
    </div>
  );
}
