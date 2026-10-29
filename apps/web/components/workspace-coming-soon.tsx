import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ChartNoAxesCombined,
  Layers3,
  type LucideIcon,
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";

const comingSoonSections = {
  library: {
    icon: BookOpen,
    headline: "Question library",
    detail:
      "Technical questions by role and topic, ready to start a session from.",
    action: { href: "/interviews/new", label: "New interview" },
  },
  plans: {
    icon: Layers3,
    headline: "Practice plans",
    detail:
      "Tracks that sequence topics and tune difficulty to the role you are practising for.",
    action: { href: "/interviews/new", label: "New interview" },
  },
  progress: {
    icon: ChartNoAxesCombined,
    headline: "Progress",
    detail:
      "Real trends from your sessions: time spent, recurring gaps, and how your answers change over the weeks.",
    action: { href: "/history", label: "View interviews" },
  },
  saved: {
    icon: Bookmark,
    headline: "Saved answers",
    detail:
      "Save the responses that landed well, organise them by topic, and turn any of them into the next session.",
    action: { href: "/history", label: "View interviews" },
  },
} as const satisfies Record<
  string,
  {
    icon: LucideIcon;
    headline: string;
    detail: string;
    action: { href: string; label: string };
  }
>;

export function ComingSoonCard({
  section,
}: {
  section: keyof typeof comingSoonSections;
}) {
  const { icon: Icon, headline, action } = comingSoonSections[section];
  return (
    <div className="flex min-h-[min(480px,65dvh)] items-center justify-center">
      <div className="w-full max-w-md px-6 py-10 text-center">
        <span className="mx-auto mb-4 grid size-11 place-items-center text-muted-foreground">
          <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <h2 className="sr-only">{headline}</h2>
        <p className="mt-3 text-lg font-medium">Coming soon</p>
        <Button asChild size="sm" className="mt-5">
          <Link href={action.href}>
            {action.label}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function WorkspaceComingSoon({
  section,
}: {
  section: keyof typeof comingSoonSections;
}) {
  return (
    <Workspace>
      <ComingSoonCard section={section} />
    </Workspace>
  );
}
