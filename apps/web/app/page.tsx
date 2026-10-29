import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FileText,
  Mic,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  title: { absolute: "Screenly · An interview. A real conversation." },
  description:
    "Meet your AI interviewer. Choose your role and experience level, answer naturally, and get feedback grounded in your conversation. Frontend, backend, and full-stack interviews.",
};

const steps = [
  {
    title: "Make it your interview.",
    description:
      "Frontend, backend, or full-stack. Choose your experience level, pick the topics, and set aside 10, 20, or 30 minutes.",
  },
  {
    title: "Let the conversation unfold.",
    description:
      "Think out loud. Your AI interviewer listens, asks relevant follow-ups, and gives you the space to explain your thinking.",
  },
  {
    title: "Leave with a clearer picture.",
    description:
      "Get feedback on your answers, see where you were strongest, and revisit the conversation in your saved transcript.",
  },
];

const questions = [
  {
    question: "What is Screenly?",
    answer:
      "Screenly is an AI interviewing app. You choose the role, experience level, topics, and duration, then have a spoken technical interview with follow-up questions based on your answers.",
  },
  {
    question: "Who are the interviews for?",
    answer:
      "Anyone interviewing for a frontend, backend, or full-stack role. You can choose junior, mid-level, or senior experience and focus on topics including JavaScript, React, TypeScript, APIs, databases, system design, testing, and web performance.",
  },
  {
    question: "How long does an interview take?",
    answer:
      "Choose a 10, 20, or 30-minute interview. You set the duration before you begin and can finish the conversation early if you need to.",
  },
  {
    question: "What do I need to get started?",
    answer:
      "A Google account, a microphone, and a desktop or laptop browser with a window at least 1024 pixels wide. Screenly checks your microphone before the interview. Answers are spoken, so there’s no typing required.",
  },
  {
    question: "What happens after the interview?",
    answer:
      "When you finish, you can request feedback on technical accuracy, depth and trade-offs, problem solving, and communication. Your interview and transcript are saved so you can revisit them later, and you can export the transcript.",
  },
];

const primaryActionClasses =
  "gap-4 font-[450] transition-[background-color,transform] duration-[160ms,140ms] ease-[ease,var(--ease-landing)] active:scale-[0.97] focus-visible:transition-none focus-visible:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:transition-transform [&_svg]:duration-180 [&_svg]:ease-landing focus-visible:[&_svg]:transition-none motion-reduce:[&_svg]:transition-none motion-reduce:[&_svg]:translate-x-0 motion-safe:[@media(hover:hover)_and_(pointer:fine)]:hover:[&_svg]:translate-x-0.5";

function StartInterview({ className = "" }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn(primaryActionClasses, className)}>
      <Link href="/interviews/new">
        Start an interview <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
}

export default function Home() {
  return (
    <div
      className="bg-background text-foreground [&_section[id]]:scroll-mt-8"
      id="top"
    >
      <a
        className="fixed top-3 left-3 z-50 -translate-y-[160%] rounded-md bg-primary px-4 py-2.5 text-primary-foreground focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="border-b">
        <nav
          className="landing-container flex min-h-[84px] items-center justify-between gap-8 max-[800px]:min-h-[74px] max-[800px]:gap-5"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center"
            aria-label="Screenly home"
          >
            <Wordmark />
          </Link>
          <div className="ml-16 flex items-center gap-7 max-[1100px]:ml-0 max-[1100px]:gap-5 max-[800px]:hidden">
            {[
              ["#experience", "The experience"],
              ["#how-it-works", "How it works"],
              ["#questions", "FAQs"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="landing-nav-link">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-7 max-[800px]:gap-[22px] max-[380px]:gap-3.5 max-[380px]:[&>a:last-child]:gap-[7px] max-[380px]:[&>a:last-child]:px-2.5 max-[380px]:[&>a:last-child]:text-[12px]">
            <Link
              href="/auth/sign-in"
              className="landing-nav-link text-foreground"
            >
              Sign in
            </Link>
            <Button asChild size="sm" className={primaryActionClasses}>
              <Link href="/interviews/new">
                Get started <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section
          className="landing-container animate-landing-arrival pt-[76px] max-[800px]:pt-14 motion-reduce:animate-none"
          aria-labelledby="hero-title"
        >
          <div className="mb-[52px] grid grid-cols-[minmax(0,1fr)_300px] items-end gap-[60px] max-[1100px]:grid-cols-[minmax(0,1fr)_280px] max-[1100px]:gap-8 max-[800px]:mb-9 max-[800px]:grid-cols-1 max-[800px]:gap-6">
            <h1
              id="hero-title"
              className="text-landing-hero m-0 [&>span]:block [&>span]:text-muted-foreground"
            >
              Your next interview.<span>A real conversation.</span>
            </h1>
            <div className="pb-[3px] max-[800px]:max-w-[390px] [&>p]:mb-[22px] [&>p]:text-[15px] [&>p]:leading-[1.75] [&>p]:text-muted-foreground max-[800px]:[&>p]:mb-[23px]">
              <p>
                Meet your AI interviewer. Speak naturally, explore what you
                know, and get feedback grounded in your answers.
              </p>
              <StartInterview className="min-h-[46px] px-[18px]" />
            </div>
          </div>
          <InterviewExample />
          <div className="mt-[17px] flex justify-between gap-5 text-[12px] text-muted-foreground max-[620px]:text-[11px] [&>a]:inline-flex [&>a]:shrink-0 [&>a]:items-center [&>a]:gap-[7px] [&>a]:text-foreground [&>a:hover]:underline [&>a:hover]:underline-offset-[5px] max-[620px]:[&>a]:hidden [&_svg]:size-[13px]">
            <p>A little preview. The real conversation is yours.</p>
            <a href="#how-it-works">
              See how it works <ArrowDown aria-hidden="true" />
            </a>
          </div>
          <div className="flex items-center justify-between gap-6 py-16 text-[14px] text-muted-foreground max-[800px]:py-11 max-[800px]:text-[13px] max-[620px]:flex-col max-[620px]:items-start max-[620px]:gap-[18px] max-[620px]:py-[38px]">
            <p>From your first role to your next chapter.</p>
            <ul
              className="flex items-center gap-7 text-[15px] font-[450] text-foreground max-[800px]:gap-4 max-[800px]:text-[14px] max-[620px]:gap-6"
              aria-label="Supported experience levels"
            >
              {["Junior", "Mid-level", "Senior"].map((level) => (
                <li
                  key={level}
                  className="not-first:border-l not-first:pl-7 max-[800px]:not-first:pl-4 max-[620px]:not-first:pl-6"
                >
                  {level}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section
          id="how-it-works"
          className="landing-container grid grid-cols-2 items-start gap-[100px] max-[1100px]:gap-14 max-[800px]:gap-9 max-[620px]:grid-cols-1 border-t py-[100px] max-[800px]:py-16"
          aria-labelledby="process-title"
        >
          <div>
            <h2 id="process-title" className="text-landing-section">
              Less setup.
              <br />
              More conversation.
            </h2>
            <p className="text-landing-description">
              A thoughtful interview, from the first question to the final
              takeaway. All in your browser.
            </p>
          </div>
          <ol className="flex flex-col">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="grid grid-cols-[26px_minmax(0,1fr)] gap-[22px] border-b py-[27px] first:pt-0 last:border-b-0 last:pb-0 max-[800px]:gap-3.5 max-[620px]:gap-[18px] max-[620px]:py-6"
              >
                <span
                  className="flex size-[25px] items-center justify-center rounded-full border text-[11px] text-muted-foreground tabular-nums"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[17px] font-medium tracking-[-0.015em] max-[800px]:text-[16px] max-[620px]:text-[17px]">
                    {step.title}
                  </h3>
                  <p className="mt-[9px] text-[14px] leading-[1.8] text-muted-foreground max-[800px]:text-[13px] max-[620px]:text-[14px]">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section
          className="border-y bg-sidebar py-[94px] max-[800px]:py-16"
          aria-labelledby="feedback-title"
        >
          <div className="landing-container grid grid-cols-2 items-center gap-[100px] max-[1100px]:gap-14 max-[800px]:gap-9 max-[620px]:grid-cols-1">
            <div>
              <h2 id="feedback-title" className="text-landing-section">
                The conversation ends.
                <br />
                The insight stays.
              </h2>
              <p className="text-landing-description">
                There’s more to an interview than a score. Understand what came
                through, where you could go deeper, and why.
              </p>
              <ul className="mt-7 flex flex-col gap-[15px] text-[13px] max-[620px]:mt-6 [&>li]:flex [&>li]:items-center [&>li]:gap-2.5 [&_svg]:size-[15px]">
                <li>
                  <Check aria-hidden="true" /> Feedback tied to your answers
                </li>
                <li>
                  <Check aria-hidden="true" /> Your strengths, made clear
                </li>
                <li>
                  <Check aria-hidden="true" /> A transcript to come back to
                </li>
              </ul>
            </div>
            <article
              className="overflow-hidden rounded-xl border bg-card"
              aria-label="Illustrative interview feedback"
            >
              <header className="flex items-center justify-between gap-4 border-b px-[26px] py-[18px] max-[800px]:p-5 max-[620px]:p-[23px] [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-[9px] [&>span:first-child]:text-[13px] [&>span:first-child]:font-medium [&_svg]:size-[15px]">
                <span>
                  <ClipboardCheck aria-hidden="true" /> Interview feedback
                </span>
                <span className="shrink-0 rounded-sm border px-[9px] py-[3px] text-[11px] leading-[1.6] font-normal text-muted-foreground max-[620px]:px-[7px] max-[620px]:text-[10px]">
                  Example
                </span>
              </header>
              <div className="p-[26px] max-[800px]:p-5 max-[620px]:p-[23px] [&>h3]:mb-7 [&>h3]:text-[23px] [&>h3]:leading-[1.4] [&>h3]:font-[450] [&>h3]:tracking-[-0.025em] max-[800px]:[&>h3]:text-[21px] max-[620px]:[&>h3]:text-[23px]">
                <p className="mb-[13px] text-[11px] text-muted-foreground">
                  Frontend · React · Mid-level
                </p>
                <h3>
                  You explained the what.
                  <br />
                  Now connect it to the why.
                </h3>
                <div className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5 [&>svg]:mt-[3px] [&>svg]:size-[15px] [&_h4]:mb-[7px] [&_h4]:text-[12px] [&_h4]:font-medium [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-muted-foreground">
                  <Check aria-hidden="true" />
                  <div>
                    <h4>What came through</h4>
                    <p>
                      You connected server rendering to discoverability and a
                      faster first load. Your reasoning was easy to follow.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5 not-first:mt-6 not-first:border-t not-first:pt-6 [&>svg]:mt-[3px] [&>svg]:size-[15px] [&_h4]:mb-[7px] [&_h4]:text-[12px] [&_h4]:font-medium [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-muted-foreground">
                  <ArrowUpRight aria-hidden="true" />
                  <div>
                    <h4>Where to go deeper</h4>
                    <p>
                      Talk through the trade-off: how would personalized data
                      change your caching strategy?
                    </p>
                  </div>
                </div>
              </div>
              <footer className="flex items-center gap-2 border-t px-[26px] py-[17px] text-[11px] text-muted-foreground max-[800px]:px-5 max-[800px]:py-4 max-[620px]:px-[23px] max-[620px]:text-[10px] [&_svg]:size-3.5 [&_svg]:shrink-0">
                <FileText aria-hidden="true" /> The full conversation, saved
                with your feedback.
              </footer>
            </article>
          </div>
        </section>
        <section
          id="questions"
          className="landing-container grid grid-cols-2 items-start gap-[100px] max-[1100px]:gap-14 max-[800px]:gap-9 max-[620px]:grid-cols-1 py-[110px] max-[800px]:py-16"
          aria-labelledby="faq-title"
        >
          <div>
            <h2 id="faq-title" className="text-landing-section">
              A few things,
              <br />
              before we begin.
            </h2>
            <p className="text-landing-description">
              A little clarity before your first conversation.
            </p>
          </div>
          <Accordion
            type="single"
            collapsible
            className="-mt-4 max-[620px]:-mt-3 [&_[data-slot=accordion-content]]:animate-none"
          >
            {questions.map(({ question, answer }, index) => (
              <AccordionItem
                key={question}
                value={`question-${index}`}
                className="border-b"
              >
                <AccordionTrigger className="min-h-[66px] items-center gap-6 rounded-sm py-5 text-[14px] leading-5 font-[450]">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="max-w-[65ch] pr-[30px] pb-[22px] text-[13px] leading-[1.85] text-muted-foreground">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        <section
          className="landing-container flex flex-col items-center border-t pt-[88px] pb-[94px] text-center max-[800px]:py-16 [&>h2]:text-[clamp(36px,4.2vw,56px)] [&>h2]:leading-[1.15] [&>h2]:font-medium [&>h2]:tracking-[-0.04em] [&>h2]:text-balance max-[620px]:[&>h2]:text-[38px] [&>p]:mt-[18px] [&>p]:text-[15px] [&>p]:text-muted-foreground max-[620px]:[&>p]:max-w-[250px] max-[620px]:[&>p]:text-[14px]"
          aria-labelledby="closing-title"
        >
          <h2 id="closing-title">Ready when you are.</h2>
          <p>Bring your experience. We’ll bring the questions.</p>
          <StartInterview className="mt-7" />
          <div className="mt-[23px] flex items-center justify-center gap-5 text-[11px] text-muted-foreground max-[380px]:gap-[13px] max-[380px]:text-[10px] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 [&_svg]:size-[13px]">
            <span>
              <Monitor aria-hidden="true" /> Desktop or laptop
            </span>
            <span>
              <Mic aria-hidden="true" /> Microphone required
            </span>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="landing-container flex items-center justify-between gap-7 py-[27px] max-[620px]:items-start max-[620px]:py-6">
          <div className="flex items-center gap-[25px] max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-[3px] [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>p]:text-[12px] [&>p]:text-muted-foreground max-[620px]:[&>p]:max-w-[160px] max-[620px]:[&>p]:text-[11px]">
            <Link href="/" aria-label="Screenly home">
              <Wordmark />
            </Link>
            <p>Good questions. Real conversations.</p>
          </div>
          <div className="flex items-center gap-7 max-[620px]:flex-col max-[620px]:items-end max-[620px]:gap-0 [&>a]:inline-flex [&>a]:min-h-11 [&>a]:items-center [&>a]:gap-2 [&>a]:text-[12px] [&>a]:font-[450] [&>a]:text-muted-foreground [&>a]:transition-colors [&>a]:duration-160 [&>a]:ease-[ease] [&>a:hover]:text-foreground [&>a:hover]:underline [&>a:hover]:underline-offset-[5px] [&_svg]:size-[13px]">
            <Link href="/auth/sign-in">Sign in</Link>
            <a href="#top">
              Back to top <ArrowUp aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
