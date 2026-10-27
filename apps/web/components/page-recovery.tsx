/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation recovers from a failed route/router. */
import { CircleAlert } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";

// Provider-independent so route failures can still offer a safe way out.
export function PageRecovery({
  title,
  children,
  retry,
}: {
  title: string;
  children: React.ReactNode;
  retry?: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b px-5 py-4 sm:px-8">
        <a href="/" className="inline-flex min-h-11 items-center rounded-md">
          <Wordmark />
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <CircleAlert
          className="mb-5 size-6 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {children}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {retry && <Button onClick={retry}>Try again</Button>}
          <Button asChild variant={retry ? "outline" : "default"}>
            <a href="/dashboard">Go to overview</a>
          </Button>
          <Button asChild variant="ghost">
            <a href="/">Screenly home</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
