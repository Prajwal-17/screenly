"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  CheckCheck,
  Clock3,
  ChartNoAxesColumn,
  Monitor,
  Server,
  Layers2,
} from "lucide-react";
import { roles } from "@repo/shared";
import { Workspace } from "@/components/workspace";
import {
  PageTitle,
  InterviewRows,
  Loading,
  ErrorState,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { api, elapsed } from "@/lib/api";

const focuses = {
  Frontend: { topics: "JavaScript · React", icon: Monitor },
  Backend: { topics: "APIs · Databases", icon: Server },
  "Full-stack": { topics: "System design · APIs", icon: Layers2 },
};

export default function Dashboard() {
  const { data: session } = authClient.useSession();
  const query = useQuery({
    queryKey: ["interviews"],
    queryFn: api.list,
    enabled: !!session,
  });
  const items = query.data ?? [];
  const completed = items.filter((i) => i.status === "completed");
  const scores = completed.flatMap((i) =>
    i.feedback?.overallScore != null ? [i.feedback.overallScore] : [],
  );
  const average = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;
  const metrics = [
    {
      label: "Completed interviews",
      value: completed.length,
      detail: "Sessions in your practice history",
      icon: CheckCheck,
    },
    {
      label: "Minutes practiced",
      value: Math.round(items.reduce((sum, i) => sum + elapsed(i), 0) / 60),
      detail: "Time spent building confidence",
      icon: Clock3,
    },
    {
      label: "Average score",
      value: average ?? "—",
      detail:
        average === null
          ? "Available after scored interviews"
          : "Across your scored interviews",
      icon: ChartNoAxesColumn,
    },
  ];
  return (
    <Workspace>
      <PageTitle
        title="Overview"
        description="A little practice. A little more confidence."
        action={
          <Button asChild>
            <Link href="/interviews/new">
              <Plus />
              New interview
            </Link>
          </Button>
        }
      />
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <>
          <section
            className="grid gap-3 sm:grid-cols-3 sm:gap-4"
            aria-label="Practice statistics"
          >
            {metrics.map(({ label, value, detail, icon: Icon }) => (
              <article key={label} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-normal tracking-normal text-muted-foreground">
                    {label}
                  </h2>
                  <Icon
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-4 text-[34px] leading-none font-medium tracking-[-0.04em] tabular-nums">
                  {value}
                  {label === "Average score" && average !== null && (
                    <span className="ml-1 text-sm font-normal tracking-normal text-muted-foreground">
                      / 10
                    </span>
                  )}
                </p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {detail}
                </p>
              </article>
            ))}
          </section>
          <section className="mt-8" aria-labelledby="recent-title">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="recent-title">Recent interviews</h2>
              <Button asChild variant="link" size="sm">
                <Link href="/history">
                  View history
                  <ArrowRight />
                </Link>
              </Button>
            </div>
            <InterviewRows interviews={items.slice(0, 5)} />
          </section>
        </>
      )}
      <section className="mt-8" aria-labelledby="focus-title">
        <div className="mb-4">
          <h2 id="focus-title">Choose a focus</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Start with the work you want to do.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {roles.map((role) => {
            const { topics, icon: Icon } = focuses[role];
            return (
              <Link
                key={role}
                href={`/interviews/new?role=${encodeURIComponent(role)}`}
                className="group flex min-h-24 items-center gap-3.5 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-ink-secondary">
                  <Icon
                    className="size-[19px]"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-medium">{role}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {topics}
                  </span>
                </span>
                <ArrowUpRight
                  className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </Workspace>
  );
}
