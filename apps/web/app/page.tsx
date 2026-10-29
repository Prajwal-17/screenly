import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mic, Monitor } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InterviewExample } from "@/components/landing/interview-example";

export const metadata: Metadata = {
  title: { absolute: "Screenly · Practice a technical conversation" },
  description:
    "Voice interviews for six engineering roles, with a saved transcript and qualitative, evidence-linked session review.",
};
const faqs = [
  [
    "How do I start?",
    "Save your profile and experience level, choose one of six role presets, then check your microphone. New sessions last 20 minutes.",
  ],
  [
    "What happens during an interview?",
    "Speak naturally with the interviewer. It can follow up on your explanation and change a constraint. The conversation appears in a continuous transcript.",
  ],
  [
    "What happens afterward?",
    "You can request a session review with findings grounded in transcript passages and one practice priority. Your transcript is saved for later review or export.",
  ],
  [
    "What do I need?",
    "A desktop or laptop browser at least 1024 pixels wide, microphone access, and a secure connection or localhost.",
  ],
];
export default function Home() {
  return (
    <div className="bg-background text-foreground">
      <a
        href="#main"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="border-b">
        <nav
          className="landing-container flex min-h-16 items-center justify-between gap-5"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            aria-label="Screenly home"
            className="inline-flex min-h-11 items-center"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              className="text-sm underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/interviews/new">
                Get started <ArrowRight />
              </Link>
            </Button>
          </div>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="landing-container grid gap-8 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <h1 className="max-w-[16ch] text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Practice a technical conversation.
          </h1>
          <div>
            <p className="mb-5 max-w-[35ch] text-sm leading-relaxed text-muted-foreground">
              Choose a role, speak through a realistic interview, and review
              what your explanation demonstrated.
            </p>
            <Button asChild>
              <Link href="/interviews/new">
                Start an interview <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
        <div className="landing-container pb-16">
          <InterviewExample />
        </div>
        <section className="border-y bg-sidebar">
          <div className="landing-container grid gap-8 py-16 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-medium tracking-tight">
                One role. One conversation. One practice priority.
              </h2>
              <p className="mt-3 max-w-[50ch] text-sm leading-relaxed text-muted-foreground">
                Your saved profile provides context. The review links findings
                to the current transcript and names a concrete next step.
              </p>
            </div>
            <ol className="space-y-4 text-sm">
              <li className="border-b pb-4">
                Select Frontend, Backend, Full-stack, Mobile Engineering, DevOps
                / Platform Engineering, or Data Engineering.
              </li>
              <li className="border-b pb-4">
                Speak and follow the conversation in the transcript.
              </li>
              <li>Revisit the session review and saved conversation.</li>
            </ol>
          </div>
        </section>
        <section
          className="landing-container grid gap-8 py-16 lg:grid-cols-2"
          aria-labelledby="faq-title"
        >
          <h2 id="faq-title" className="text-2xl font-medium tracking-tight">
            Questions before you begin
          </h2>
          <Accordion type="single" collapsible className="border-t">
            {faqs.map(([question, answer]) => (
              <AccordionItem key={question} value={question!}>
                <AccordionTrigger className="text-sm">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        <section className="landing-container border-t py-16 text-center">
          <h2 className="text-2xl font-medium">Start your next session</h2>
          <Button asChild className="mt-5">
            <Link href="/interviews/new">
              New interview <ArrowRight />
            </Link>
          </Button>
          <p className="mt-5 flex justify-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Monitor className="size-4" /> Desktop or laptop
            </span>
            <span className="inline-flex items-center gap-1">
              <Mic className="size-4" /> Microphone required
            </span>
          </p>
        </section>
      </main>
      <footer className="border-t">
        <div className="landing-container flex min-h-16 items-center justify-between gap-3">
          <Wordmark />
          <Link
            href="/auth/sign-in"
            className="text-sm underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
