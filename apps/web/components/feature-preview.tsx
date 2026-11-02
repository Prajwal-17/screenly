"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  ListChecks,
  BriefcaseBusiness,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

const features = {
  plan: {
    name: "Practice plan",
    icon: ListChecks,
    description: "Turn a review into a focused week of practice.",
    detail:
      "A future practice plan could turn your session’s next practice priority into short drills, with transcript evidence beside each exercise.",
    steps: [
      "Choose a finding from a saved review",
      "Practice one explanation at a time",
      "Revisit the evidence in your next session",
    ],
  },
  job: {
    name: "Tailor to a job",
    icon: BriefcaseBusiness,
    description: "Practice with a specific opportunity in mind.",
    detail:
      "A future job brief could use a job description to suggest relevant topics within your selected engineering role. Your saved experience would remain separate.",
    steps: [
      "Add a job description",
      "Review the suggested areas of focus",
      "Start an interview with that context",
    ],
  },
  reminders: {
    name: "Practice reminders",
    icon: Bell,
    description: "Make room for a regular practice session.",
    detail:
      "A future reminder could let you choose a time and timezone, then receive a notification before you plan to practice.",
    steps: [
      "Choose a day and time",
      "Confirm your timezone and delivery preference",
      "Pause or change the schedule whenever you need",
    ],
  },
};

export function FeaturePreview({
  feature,
}: {
  feature: keyof typeof features;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const item = features[feature];
  const Icon = item.icon;
  return (
    <>
      <Button
        ref={trigger}
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`${item.name} preview`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon aria-hidden="true" />
        {item.name}
        <Badge variant="outline">Preview</Badge>
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={item.name}
        description={item.description}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        <div className="space-y-6 px-6 pb-6">
          <Badge variant="info">Feature preview</Badge>
          <p className="type-ui leading-relaxed">{item.detail}</p>
          <ol className="space-y-4">
            {item.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3 type-ui">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary type-caption text-muted-foreground">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <p className="border-t pt-4 type-caption text-muted-foreground">
            This feature is a design preview. Nothing is created, saved or
            scheduled.
          </p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
