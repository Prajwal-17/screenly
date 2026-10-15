"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { roles } from "@repo/shared";
import { Workspace } from "@/components/workspace";
import {
  PageTitle,
  InterviewRows,
  Loading,
  ErrorState,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { api, elapsed } from "@/lib/api";
const focusTopics = {
  Frontend: "JavaScript · React",
  Backend: "APIs · Databases",
  "Full-stack": "System design · APIs",
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
  return (
    <Workspace>
      <PageTitle
        title="Overview"
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
          <div
            className="grid gap-4 sm:grid-cols-3"
            aria-label="Practice statistics"
          >
            {[
              { label: "Completed interviews", value: completed.length },
              {
                label: "Minutes practiced",
                value: Math.round(
                  items.reduce((sum, i) => sum + elapsed(i), 0) / 60,
                ),
              },
              { label: "Average score", value: average ?? "—" },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {metric.label}
                  </p>
                  <div className="mt-3 font-heading text-4xl tracking-tight tabular-nums">
                    {metric.value}
                    {metric.label === "Average score" && average !== null && (
                      <span className="ml-1 font-sans text-sm text-muted-foreground">
                        / 10
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl">Recent interviews</h2>
            <Button asChild variant="link" size="sm">
              <Link href="/history">
                View history <ArrowRight />
              </Link>
            </Button>
          </div>
          <InterviewRows interviews={items.slice(0, 5)} />
        </>
      )}
      <h2 className="mt-8 mb-4 text-xl">Choose a focus</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {roles.map((role) => (
          <Button
            key={role}
            asChild
            variant="secondary"
            className="h-auto justify-between rounded-md border-t-2 border-border px-6 py-6 whitespace-normal hover:border-primary hover:bg-accent"
          >
            <Link href={`/interviews/new?role=${encodeURIComponent(role)}`}>
              <span>
                <strong className="block font-heading text-lg font-medium tracking-tight">
                  {role}
                </strong>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {focusTopics[role]}
                </span>
              </span>
              <ArrowRight />
            </Link>
          </Button>
        ))}
      </div>
    </Workspace>
  );
}
