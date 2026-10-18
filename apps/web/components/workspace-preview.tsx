"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  ChartNoAxesCombined,
  Check,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { PageIntro } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { authClient } from "@/lib/auth-client";
import { useUIStore } from "@/store/uiStore";

const questions = [
  {
    topic: "React",
    role: "Frontend",
    title: "Where should this state live?",
    prompt:
      "A React feature shares state across several components. How would you decide which component should own it, and when would you introduce a shared store?",
  },
  {
    topic: "React",
    role: "Frontend",
    title: "Make asynchronous tests reliable",
    prompt:
      "How would you test a component that fetches data, including loading, failure, and retry, without relying on arbitrary delays?",
  },
  {
    topic: "APIs",
    role: "Backend",
    title: "Design an API that is safe to retry",
    prompt:
      "A client retries a request after a timeout. How would you prevent a duplicate operation while giving the client a useful response?",
  },
  {
    topic: "System design",
    role: "Full-stack",
    title: "Keep the cache honest",
    prompt:
      "How would you choose a caching strategy for frequently read data that changes throughout the day? Talk through invalidation and consistency.",
  },
  {
    topic: "APIs",
    role: "Backend",
    title: "Find the slow request",
    prompt:
      "An endpoint becomes slower under load. How would you investigate the bottleneck and decide what to change first?",
  },
  {
    topic: "System design",
    role: "Full-stack",
    title: "Ship a resilient background job",
    prompt:
      "How would you design a background job that can be retried, monitored, and recovered after a worker stops unexpectedly?",
  },
];
const intros = {
  library: "Good questions make room for better answers.",
  plans: "A little structure for your next step.",
  progress: "See the bigger picture of your practice.",
  saved: "Keep the ideas you want to come back to.",
  settings: "A workspace that feels like yours.",
  help: "A few things to help you get settled.",
};
export function WorkspacePreview({
  section,
}: {
  section: keyof typeof intros;
}) {
  const [topic, setTopic] = useState("All topics");
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState<(typeof questions)[number] | null>(
    null,
  );
  const { data: session } = authClient.useSession();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const preview = ["library", "plans", "progress", "saved"].includes(section);
  return (
    <Workspace>
      <PageIntro
        description={intros[section]}
        action={preview ? <Badge variant="outline">Preview</Badge> : undefined}
      />

      {section === "library" && (
        <>
          <div className="mb-6 flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-1">
              {["All topics", "React", "APIs", "System design"].map((label) => (
                <Button
                  key={label}
                  variant={topic === label ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTopic(label)}
                  aria-pressed={topic === label}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="relative sm:w-60">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search questions"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a question…"
                className="pl-9 text-xs"
              />
            </div>
          </div>
          <div className="mb-3 flex justify-between text-[11px] text-muted-foreground">
            <span>Sample question collection</span>
            <span>Explore a prompt to get started</span>
          </div>
          <div className="divide-y border-y">
            {questions
              .filter(
                (item) =>
                  (topic === "All topics" || item.topic === topic) &&
                  `${item.title} ${item.prompt}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              )
              .map((item) => (
                <button
                  key={item.title}
                  onClick={() => setQuestion(item)}
                  className="group flex w-full items-center justify-between gap-5 px-1 py-5 text-left outline-none transition-colors hover:bg-card/60 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.role} · {item.topic}
                    </span>
                  </span>
                  <ArrowUpRight className="mr-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              ))}
          </div>
          {questions.filter(
            (item) =>
              (topic === "All topics" || item.topic === topic) &&
              `${item.title} ${item.prompt}`
                .toLowerCase()
                .includes(query.toLowerCase()),
          ).length === 0 && (
            <p
              role="status"
              className="py-12 text-center text-sm text-muted-foreground"
            >
              No questions match your search.
            </p>
          )}
          <Dialog
            open={!!question}
            onOpenChange={(open) => {
              if (!open) setQuestion(null);
            }}
            title={question?.title ?? "Question"}
            description={`${question?.role ?? ""} · ${question?.topic ?? ""}`}
          >
            <div className="border-t px-5 pt-5 pb-6">
              <p className="text-sm leading-relaxed text-ink-secondary">
                {question?.prompt}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Think out loud. Make your assumptions clear, and explore the
                trade-offs.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/interviews/new?role=${question?.role}`}>
                  Practice this role
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </Dialog>
        </>
      )}

      {section === "plans" && (
        <div className="divide-y border-y">
          {[
            {
              role: "Frontend",
              title: "Build an answer from the interface inward.",
              topics: "React · JavaScript · Testing",
              detail:
                "Explore state, component behavior, and the choices behind a useful interface.",
            },
            {
              role: "Backend",
              title: "Explain the decisions behind the system.",
              topics: "APIs · Databases · Reliability",
              detail:
                "Talk through data, failures, and the boundaries of a dependable service.",
            },
            {
              role: "Full-stack",
              title: "Connect the experience to the architecture.",
              topics: "System design · APIs · Trade-offs",
              detail:
                "Follow a feature from the first interaction to the systems that support it.",
            },
          ].map((plan) => (
            <article
              key={plan.role}
              className="grid items-center gap-5 py-8 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <h2 className="text-lg">{plan.title}</h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {plan.detail}
                </p>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  {plan.role} · {plan.topics}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/interviews/new?role=${plan.role}`}>
                  Configure session
                  <ArrowUpRight />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}

      {(section === "progress" || section === "saved") && (
        <section className="flex min-h-[440px] flex-col items-center justify-center border-y px-5 py-16 text-center">
          {section === "progress" ? (
            <ChartNoAxesCombined
              className="mb-5 size-8 text-primary"
              strokeWidth={1.3}
            />
          ) : (
            <Bookmark className="mb-5 size-8 text-primary" strokeWidth={1.3} />
          )}
          <h2 className="max-w-md text-2xl">
            {section === "progress"
              ? "Every conversation is a step forward."
              : "An answer worth coming back to."}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {section === "progress"
              ? "A dedicated view of your progress is in preview. Your real session statistics and feedback are available in Overview and History."
              : "Saved answer collections are in preview. For now, every saved conversation and its feedback is available in your interview history."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={section === "progress" ? "/dashboard" : "/history"}>
                {section === "progress" ? "View overview" : "Browse history"}
                <ArrowRight />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/interviews/new">Start a session</Link>
            </Button>
          </div>
        </section>
      )}

      {section === "settings" && (
        <div className="max-w-3xl">
          <section className="border-y py-6">
            <h2 className="text-base">Your account</h2>
            <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="mt-1.5">{session?.user.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-1.5 break-all">{session?.user.email}</dd>
              </div>
            </dl>
          </section>
          <section className="border-b py-6">
            <h2 className="text-base">Workspace preferences</h2>
            <label className="mt-5 flex cursor-pointer items-center justify-between gap-6">
              <span>
                <span className="block text-sm font-medium">
                  Keep sidebar collapsed
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Use the compact icon rail by default on this device.
                </span>
              </span>
              <Checkbox
                checked={sidebarCollapsed}
                onCheckedChange={(value) => setSidebarCollapsed(value === true)}
              />
            </label>
            <div className="mt-6 flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium">Interview focus</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The sidebar folds away when your interview starts and restores
                  your preference afterward.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                <Check className="size-3.5" />
                On
              </span>
            </div>
          </section>
          <section className="flex items-start justify-between gap-5 border-b py-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base">Team workspaces</h2>
                <Badge variant="outline">Preview</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                A shared place to practice together. Coming soon.
              </p>
            </div>
            <SlidersHorizontal
              className="mt-1 size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
          </section>
        </div>
      )}

      {section === "help" && (
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="border-y">
            {[
              [
                "How do I start an interview?",
                "Choose New interview, select your role, topics, and duration, then continue to the audio check. Allow microphone access and start when you are ready. The clock starts when the interview begins.",
              ],
              [
                "Can I interrupt the interviewer?",
                "Yes. Speak when you are ready, or use Interrupt. You can mute your microphone at any time.",
              ],
              [
                "Where can I find the conversation?",
                "Open Transcript from the interview's top bar to read along. Finished sessions, saved conversations, and feedback are available in History.",
              ],
              [
                "What if my connection drops?",
                "Your saved conversation is retained. Reconnect, check your microphone, and resume within the interview's original time budget.",
              ],
              [
                "How do I collapse the sidebar?",
                "Use the panel button beside the page title. Your preference is remembered on this device. During a live interview, the sidebar automatically becomes a compact icon rail.",
              ],
            ].map(([title, description]) => (
              <AccordionItem key={title} value={title!} className="py-3">
                <AccordionTrigger>{title}</AccordionTrigger>
                <AccordionContent>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <p className="mt-6 text-xs text-muted-foreground">
            For microphone access, use localhost or a secure HTTPS connection.
          </p>
        </div>
      )}
    </Workspace>
  );
}
