import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Mic,
  Monitor,
  AudioLines,
  FileText,
  UserRound,
} from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InterviewExample } from "@/components/landing/interview-example";
import { AccountActions } from "@/components/landing/account-actions";

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
      <header className="border-b bg-card">
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
          <AccountActions placement="header" />
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="landing-container grid gap-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <h1 className="max-w-[17ch] type-display">
            Practice the conversation.{" "}
            <span className="block text-link">Follow the evidence.</span>
          </h1>
          <div>
            <p className="mb-6 max-w-[35ch] text-base leading-relaxed text-muted-foreground">
              Choose a role, speak through a realistic interview, and review
              what your explanation demonstrated.
            </p>
            <Button asChild>
              <Link href="/interviews/new">
                Start an interview <ArrowRight />
              </Link>
            </Button>
            <p className="mt-4 flex flex-wrap gap-4 type-caption text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="size-3.5" />
                Desktop or laptop
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mic className="size-3.5" />
                Microphone required
              </span>
            </p>
          </div>
        </section>
        <div className="landing-container pb-16">
          <InterviewExample />
        </div>
        <section className="border-y bg-card">
          <div className="landing-container py-14 sm:py-16">
            <h2 className="type-page-title">
              From a conversation to your next practice.
            </h2>
            <div className="mt-9 grid gap-8 md:grid-cols-3 md:gap-10">
              {[
                {
                  icon: UserRound,
                  title: "Bring your experience",
                  text: "Your profile gives the interviewer context. Choose one of six engineering roles.",
                },
                {
                  icon: AudioLines,
                  title: "Think out loud",
                  text: "Work through an adaptive spoken interview, with a continuous transcript beside you.",
                },
                {
                  icon: FileText,
                  title: "See what you demonstrated",
                  text: "Revisit findings linked to your actual words and leave with one practice priority.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-t pt-5">
                  <Icon className="mb-4 size-5 text-link" aria-hidden="true" />
                  <h3 className="type-section-title">{title}</h3>
                  <p className="mt-2 max-w-[40ch] type-ui leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          className="landing-container grid gap-8 py-16 lg:grid-cols-2"
          aria-labelledby="faq-title"
        >
          <h2 id="faq-title" className="type-page-title">
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
          <h2 className="type-page-title">Start your next session</h2>
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
          <AccountActions placement="footer" />
        </div>
      </footer>
    </div>
  );
}
