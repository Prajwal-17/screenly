import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/workspace";
import { SignInActions } from "@/components/auth/sign-in-actions";

export default function SignIn() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
        <Brand />
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 type-ui text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10 sm:py-16">
        <div className="w-full max-w-[400px] rounded-2xl border bg-card p-6 sm:p-8">
          <h1 className="type-page-title">Sign in</h1>
          <p className="mt-2 mb-7 type-ui text-muted-foreground">
            Continue to your practice workspace.
          </p>
          <SignInActions redirectSignedIn />
        </div>
      </main>
    </div>
  );
}
