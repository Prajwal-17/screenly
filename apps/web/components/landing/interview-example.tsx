"use client";

import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  CornerDownRight,
  RotateCcw,
} from "lucide-react";
import { PorcelainOrb, type VoiceSignal } from "@/components/porcelain-orb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const examples = [
  {
    role: "Frontend",
    topic: "React",
    question:
      "When would you choose server-side rendering over client-side rendering?",
    answer:
      "I’d look at what the page needs. For a public product page, I’d lean toward server rendering for discoverability and a faster first load.",
    followUp:
      "How would your approach change if that page also included personalized content?",
  },
  {
    role: "Backend",
    topic: "APIs",
    question: "How would you make sure a payment isn’t processed twice?",
    answer:
      "I’d use an idempotency key for each payment request and store the result. A retry with the same key would return the original response.",
    followUp:
      "What would happen if two requests with the same key arrived at the same time?",
  },
  {
    role: "Full-stack",
    topic: "System design",
    question:
      "How would you keep a dashboard up to date without refreshing the page?",
    answer:
      "I’d start with how fresh the data needs to be. Polling might be enough for a summary, but I’d consider server-sent events for live updates.",
    followUp:
      "How would you handle updates that were missed while the connection was offline?",
  },
] as const;

const restingSignal: VoiceSignal = {
  level: 0,
  low: 0,
  high: 0,
  candidate: false,
  inactive: true,
};
const readSignal = () => restingSignal;

export function InterviewExample() {
  const [role, setRole] = useState<string>("Frontend");
  const [showFollowUp, setShowFollowUp] = useState(false);

  return (
    <section
      id="experience"
      className="overflow-hidden rounded-xl border"
      aria-label="Interactive interview example"
    >
      <div className="flex min-h-[58px] items-center justify-between gap-4 border-b px-6 py-3 max-[620px]:px-[18px] max-[620px]:py-3.5 [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-[9px] [&>span:first-child]:text-[13px] [&>span:first-child]:font-medium max-[620px]:[&>span:first-child]:gap-[7px] max-[620px]:[&>span:first-child]:text-[12px] [&_svg]:size-[17px] max-[620px]:[&_svg]:hidden">
        <span>
          <AudioLines aria-hidden="true" /> The Screenly experience
        </span>
        <span className="shrink-0 rounded-sm border px-[9px] py-[3px] text-[11px] leading-[1.6] font-normal text-muted-foreground max-[620px]:px-[7px] max-[620px]:text-[10px]">
          Interactive example
        </span>
      </div>
      <Tabs
        value={role}
        onValueChange={(value) => {
          setRole(value);
          setShowFollowUp(false);
        }}
      >
        <div className="flex min-h-16 items-center justify-between gap-5 border-b px-6 py-2.5 max-[620px]:justify-center max-[620px]:px-4">
          <TabsList
            aria-label="Example interview role"
            className="min-h-9 gap-[3px] rounded-md p-[3px] max-[620px]:w-full [&:has(:focus-visible)_[role=tab]]:transition-none"
          >
            {examples.map((example) => (
              <TabsTrigger
                key={example.role}
                value={example.role}
                className="min-h-[30px] rounded-sm px-[15px] py-[5px] text-[12px] leading-[1.4285714286] font-[450] transition-[color,background-color] duration-150 ease-[ease] max-[620px]:min-h-11 max-[620px]:px-3 [@media(pointer:coarse)]:min-h-11"
              >
                {example.role}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="text-[12px] text-muted-foreground max-[800px]:hidden">
            A different role. A different conversation.
          </p>
        </div>
        {examples.map((example) => (
          <TabsContent
            key={example.role}
            value={example.role}
            className="mt-0 grid grid-cols-[minmax(0,1fr)_330px] max-[1100px]:grid-cols-[minmax(0,1fr)_290px] max-[800px]:grid-cols-[minmax(0,1fr)_260px] max-[620px]:grid-cols-1 [&[hidden]]:hidden"
          >
            <div className="flex min-h-[398px] min-w-0 flex-col px-7 pt-[22px] pb-[18px] max-[800px]:p-5 max-[620px]:min-h-[350px] max-[620px]:px-[18px] max-[620px]:pt-5 max-[620px]:pb-4">
              <div className="flex items-center justify-between gap-4 text-[11px] text-muted-foreground [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-2.5 [&>span:first-child>span]:text-input">
                <span>
                  {example.role} <span aria-hidden="true">/</span>{" "}
                  {example.topic}
                </span>
                <span>Mid-level</span>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center px-3 pt-1 pb-6 max-[800px]:px-0 max-[620px]:pt-1.5">
                <div className="h-[132px] w-[154px] shrink-0 max-[620px]:h-[126px] max-[620px]:w-[140px]">
                  <PorcelainOrb readSignal={readSignal} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Your AI interviewer
                </p>
                <p
                  className="mt-3.5 min-h-16 max-w-[540px] text-center text-[clamp(19px,1.8vw,24px)] leading-[1.45] font-[450] tracking-[-0.025em] text-balance max-[800px]:text-[20px] max-[620px]:mt-3 max-[620px]:min-h-[87px] max-[620px]:max-w-[390px] max-[620px]:text-[21px]"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {showFollowUp ? example.followUp : example.question}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 max-[800px]:justify-center max-[620px]:justify-between max-[620px]:gap-2 [&>span]:flex [&>span]:items-center [&>span]:gap-[7px] [&>span]:text-[11px] [&>span]:text-muted-foreground max-[800px]:[&>span]:hidden max-[620px]:[&>span]:flex max-[620px]:[&>span]:text-[10px] [&_svg]:size-3.5 max-[620px]:[&>span>svg]:hidden">
                <span>
                  <AudioLines aria-hidden="true" /> Made for your voice
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-w-[156px] px-2 text-[12px] leading-[1.4] font-[450] text-foreground max-[620px]:min-w-[143px] max-[620px]:text-[11px] transition-[background-color,transform] duration-[160ms,140ms] ease-[ease,var(--ease-landing)] active:scale-[0.97] focus-visible:transition-none focus-visible:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100"
                  aria-pressed={showFollowUp}
                  onClick={() => setShowFollowUp((current) => !current)}
                >
                  {showFollowUp ? (
                    <>
                      First question{" "}
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      See the follow-up{" "}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
            <aside
              className="flex flex-col gap-[22px] border-l bg-sidebar p-[26px] max-[1100px]:p-6 max-[800px]:p-[22px] max-[620px]:gap-5 max-[620px]:border-t max-[620px]:border-l-0 max-[620px]:p-[23px] [&>h2]:mb-0.5 [&>h2]:text-[12px] [&>h2]:font-medium [&>h2]:tracking-normal max-[620px]:[&>h2]:text-[13px]"
              aria-label={`${example.role} example transcript`}
            >
              <h2>In the conversation</h2>
              <div className="[&>p:last-child]:text-[12px] [&>p:last-child]:leading-[1.75] max-[620px]:[&>p:last-child]:text-[13px]">
                <p className="mb-[5px] text-[10px] font-medium text-muted-foreground max-[620px]:text-[11px]">
                  Interviewer
                </p>
                <p>{example.question}</p>
              </div>
              <div className="[&>p:last-child]:text-[12px] [&>p:last-child]:leading-[1.75] max-[620px]:[&>p:last-child]:text-[13px] pl-4">
                <p className="mb-[5px] text-[10px] font-medium text-muted-foreground max-[620px]:text-[11px]">
                  You
                </p>
                <p>{example.answer}</p>
              </div>
              <div className="mt-auto flex items-start gap-2 border-t pt-4 max-[620px]:pt-[18px] [&>svg]:mt-0.5 [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground [&>div>p:first-child]:text-foreground [&>div>p:last-child]:text-[12px] [&>div>p:last-child]:leading-[1.75] [&>div>p:last-child]:text-muted-foreground max-[620px]:[&>div>p:last-child]:text-[13px]">
                <CornerDownRight aria-hidden="true" />
                <div>
                  <p className="mb-[5px] text-[10px] font-medium text-muted-foreground max-[620px]:text-[11px]">
                    {showFollowUp
                      ? "A relevant follow-up"
                      : "A conversation that follows you"}
                  </p>
                  <p>
                    {showFollowUp
                      ? example.followUp
                      : "Your answer shapes the next question."}
                  </p>
                </div>
              </div>
            </aside>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
