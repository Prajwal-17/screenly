"use client";

import { useState } from "react";
import { roles, type InterviewRole } from "@repo/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const examples: Record<
  InterviewRole,
  { interviewer: string; candidate: string; followUp: string; review: string }
> = {
  Frontend: {
    interviewer: "How would you keep this page usable while data is loading?",
    candidate:
      "I’d keep the current content visible, mark the update as pending, and provide a retry if it fails.",
    followUp:
      "How would you announce the update to a screen reader without repeating every change?",
    review:
      "The explanation considered loading and recovery. A stronger answer would specify how focus and announcements behave.",
  },
  Backend: {
    interviewer: "How would you prevent a payment from being processed twice?",
    candidate:
      "I’d require an idempotency key and persist the first result so retries return it.",
    followUp: "What if two requests with the same key arrive at once?",
    review:
      "The explanation identified idempotency. It left concurrent requests unresolved.",
  },
  "Full-stack": {
    interviewer:
      "A dashboard stops updating after a reconnect. Where would you investigate?",
    candidate:
      "I’d check whether the client missed an event, then compare its cursor with the server’s latest version.",
    followUp:
      "How would the UI recover if the missing events are no longer available?",
    review:
      "The explanation connected client and server state. The recovery path needs a clearer fallback.",
  },
  "Mobile Engineering": {
    interviewer:
      "How would an offline edit reach the server after connectivity returns?",
    candidate:
      "I’d queue the change locally and retry it after reconnecting, keeping its status visible.",
    followUp: "How would you resolve a conflicting edit from another device?",
    review:
      "The explanation covered queuing and user visibility. Conflict resolution remains to be explored.",
  },
  "DevOps / Platform Engineering": {
    interviewer: "A deploy raises error rates. What do you do first?",
    candidate:
      "I’d pause the rollout, compare the new and old versions, and roll back if the change is causing failures.",
    followUp: "What evidence would tell you rollback worked?",
    review:
      "The explanation gave a safe first response. Verification after rollback needs more detail.",
  },
  "Data Engineering": {
    interviewer:
      "A source sends the same batch twice. How should the pipeline respond?",
    candidate:
      "I’d identify batches and make writes repeatable, then check the output row count and key uniqueness.",
    followUp: "What changes when a backfill arrives out of order?",
    review:
      "The explanation covered repeatable writes and quality checks. Out-of-order recovery was not assessed.",
  },
};

export function InterviewExample() {
  const [role, setRole] = useState<InterviewRole>("Frontend");
  return (
    <section
      id="example"
      className="rounded-xl border bg-card"
      aria-label="Illustrative transcript and review"
    >
      <div className="border-b px-5 py-4 text-sm font-medium">
        Illustrative conversation and review
      </div>
      <Tabs
        value={role}
        onValueChange={(value) => {
          const next = roles.find((item) => item === value);
          if (next) setRole(next);
        }}
      >
        <div className="overflow-x-auto border-b px-3 py-2">
          <TabsList
            aria-label="Example interview role"
            className="h-auto min-w-max flex-wrap justify-start"
          >
            {roles.map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className="min-h-10 px-3 text-xs"
              >
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {roles.map((item) => (
          <TabsContent
            key={item}
            value={item}
            aria-label={`${item} example`}
            className="mt-0 p-5 sm:p-7"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
              <div
                className="space-y-5"
                aria-label={`${item} example transcript`}
              >
                <h2 className="text-base font-medium">Transcript excerpt</h2>
                {[
                  ["Interviewer", examples[item].interviewer],
                  ["You", examples[item].candidate],
                  ["Interviewer", examples[item].followUp],
                ].map(([speaker, content], index) => (
                  <div key={index}>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {speaker}
                    </p>
                    <p className="max-w-[65ch] text-sm leading-relaxed">
                      {content}
                    </p>
                  </div>
                ))}
              </div>
              <aside
                className="border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7"
                aria-label={`${item} example review`}
              >
                <h2 className="text-base font-medium">
                  Qualitative review example
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {examples[item].review}
                </p>
              </aside>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
