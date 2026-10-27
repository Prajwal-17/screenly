import Link from "next/link";
import { ArrowRight, AudioLines, Mic } from "lucide-react";
import { Brand } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-dvh bg-sidebar">
      <nav
        className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6 sm:px-10"
        aria-label="Main navigation"
      >
        <Brand />
        <Button asChild variant="outline" size="sm">
          <Link href="/auth/sign-in">
            Sign in
            <ArrowRight />
          </Link>
        </Button>
      </nav>
      <main className="mx-3 rounded-2xl border bg-card px-5 py-14 sm:mx-5 sm:px-10 sm:py-20">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-[36px] leading-[1.12] font-semibold tracking-[-0.035em] sm:text-[52px]">
            Practice technical interviews.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Answer aloud. Get follow-up questions and feedback grounded in your
            answers.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/interviews/new">
              Start an interview
              <ArrowRight />
            </Link>
          </Button>
        </section>
        <section
          className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-xl border sm:mt-16"
          aria-label="Example interview"
        >
          <header className="flex items-center justify-between gap-3 border-b bg-muted/50 px-5 py-4 sm:px-7">
            <span className="flex items-center gap-2 text-sm font-medium">
              <AudioLines className="size-4" aria-hidden="true" />
              Frontend · React
            </span>
            <Badge variant="outline" className="bg-card">
              Example
            </Badge>
          </header>
          <div className="space-y-7 p-6 sm:p-9">
            <div>
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Interviewer
              </p>
              <h2 className="max-w-xl text-xl leading-relaxed font-medium tracking-[-0.02em] sm:text-2xl">
                When would you use server-side rendering instead of client-side
                rendering?
              </h2>
            </div>
            <div className="ml-5 rounded-xl bg-muted p-5 sm:ml-16">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Mic className="size-3.5" aria-hidden="true" />
                You
              </p>
              <p className="text-sm leading-relaxed">
                I’d start with what the page needs: discoverability, fresh data,
                and how quickly users need to interact.
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Interviewer
              </p>
              <p className="text-sm leading-relaxed">
                How would you handle a page with both static content and
                personalized data?
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground sm:px-10">
        Screenly · Technical interview practice
      </footer>
    </div>
  );
}
