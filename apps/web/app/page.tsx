import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Mic,
  Check,
  CornerDownRight,
} from "lucide-react";
import { Brand } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 sm:px-10 lg:px-14">
      <nav
        className="flex h-20 items-center justify-between border-b"
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
      <main>
        <div className="grid items-center gap-12 py-14 sm:py-20 lg:min-h-[640px] lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <section>
            <h1 className="max-w-[9ch] text-[46px] leading-[1.06] font-semibold tracking-[-0.04em] sm:text-[64px]">
              Good answers take <span className="text-primary">practice.</span>
            </h1>
            <p className="mt-6 max-w-[41ch] text-base leading-relaxed text-muted-foreground">
              Think out loud. Follow the conversation. Practice technical
              interviews with questions that adapt to your answers.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/interviews/new">
                Start practicing
                <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Mic className="size-3.5" aria-hidden="true" />
              Voice-first practice, at your own pace.
            </p>
          </section>
          <section
            className="overflow-hidden rounded-xl border bg-card"
            aria-label="Example interview"
          >
            <div className="flex items-center justify-between gap-3 border-b bg-muted/60 px-5 py-3">
              <span className="flex items-center gap-2 text-xs font-medium">
                <AudioLines
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                Frontend · React
              </span>
              <Badge variant="outline" className="bg-card">
                Example
              </Badge>
            </div>
            <div className="space-y-6 p-5 sm:p-7">
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
                  <AudioLines className="size-4" aria-hidden="true" />
                  Interviewer
                </p>
                <h2 className="text-[23px] leading-[1.4] font-medium tracking-[-0.025em]">
                  When would you reach for server-side rendering?
                </h2>
              </div>
              <div className="rounded-lg bg-candidate-surface/60 p-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-candidate">
                  <Mic className="size-3.5" aria-hidden="true" />
                  Candidate
                </p>
                <p className="text-sm leading-relaxed">
                  I’d start with what the page needs: discoverability, fresh
                  data, and how quickly users need to interact.
                </p>
              </div>
              <div className="flex items-start gap-3 border-t pt-5">
                <CornerDownRight
                  className="mt-1 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="mb-2 text-xs font-medium text-primary">
                    Follow-up
                  </p>
                  <p className="text-sm leading-relaxed text-ink-secondary">
                    How would you handle a page with both static content and
                    personalized data?
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
        <section
          className="grid gap-7 border-t py-8 sm:grid-cols-3 sm:gap-8"
          aria-label="How practice works"
        >
          {[
            {
              title: "Choose your focus",
              description: "Your role, experience, topics, and time.",
            },
            {
              title: "Speak it through",
              description: "A conversation that follows your thinking.",
            },
            {
              title: "Learn from each answer",
              description: "A saved transcript and specific feedback.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Check className="size-4 text-primary" aria-hidden="true" />
                {item.title}
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </section>
      </main>
      <footer className="flex flex-wrap justify-between gap-3 border-t py-5 text-[11px] text-muted-foreground">
        <span>Screenly · Technical interview practice</span>
        <span>Make room for your next good answer.</span>
      </footer>
    </div>
  );
}
