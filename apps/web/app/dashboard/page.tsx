"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, AudioLines, FileText, Play, Plus } from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ErrorState,
  InterviewRows,
  Loading,
  RefreshNotice,
} from "@/components/common";
import { FeaturePreview } from "@/components/feature-preview";
import { api, formatDate } from "@/lib/api";
import { useUserProfile } from "@/lib/profile";
import { authClient } from "@/lib/auth-client";

export default function Dashboard() {
  const profile = useUserProfile();
  const { data: session } = authClient.useSession();
  const query = useQuery({
    queryKey: ["interviews"],
    queryFn: api.list,
    enabled: !!session,
  });
  const sessions = [...(query.data ?? [])].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const active = sessions.find((item) => item.status === "active");
  const latest = sessions.find((item) => item.status === "completed");
  const priority = latest?.review?.practicePriority;
  const firstName = profile.data?.details.name.trim().split(/\s+/)[0];
  return (
    <Workspace title="Dashboard">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div className="max-w-xl">
          <h2 className="type-page-title">
            {firstName
              ? `Welcome back, ${firstName}.`
              : "Your next conversation starts here."}
          </h2>
          <p className="mt-2 type-ui text-muted-foreground">
            Resume a session or choose your next role.
          </p>
        </div>
        <Button asChild>
          <Link href={active ? `/interviews/${active.id}` : "/interviews/new"}>
            {active ? <Play /> : <Plus />}
            {active ? "Resume interview" : "Start an interview"}
          </Link>
        </Button>
      </div>
      {!query.data &&
      (query.isError ||
        query.errorUpdatedAt > 0 ||
        query.fetchStatus === "paused") ? (
        <div className="py-8">
          <ErrorState
            title="We couldn’t load your sessions"
            message="Reconnect or try loading your saved interviews again."
            retry={() => void query.refetch()}
            retrying={query.isFetching}
          />
        </div>
      ) : !query.data ? (
        <Loading label="Loading your sessions…" layout="dashboard" />
      ) : (
        <>
          {(query.isError || query.fetchStatus === "paused") && (
            <RefreshNotice
              message="Showing your last loaded sessions."
              retry={() => void query.refetch()}
              retrying={query.isFetching}
            />
          )}
          <div className="grid gap-10 py-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section aria-labelledby="dashboard-next-title" className="min-w-0">
              <h3 id="dashboard-next-title" className="mb-5 type-section-title">
                {active
                  ? "Pick up where you left off"
                  : priority
                    ? "Your next practice"
                    : "Start with a conversation"}
              </h3>
              {active ? (
                <div className="rounded-xl border bg-card p-6">
                  <Badge variant="warning">
                    {active.pausedAt ? "Paused" : "In progress"}
                  </Badge>
                  <h4 className="mt-4 text-xl font-semibold tracking-tight">
                    {active.role} interview
                  </h4>
                  <p className="mt-2 type-ui text-muted-foreground">
                    {active.level} · {active.duration} minutes ·{" "}
                    {formatDate(active.createdAt)}
                  </p>
                  <Button asChild variant="outline" className="mt-6">
                    <Link href={`/interviews/${active.id}`}>
                      Continue session <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : priority ? (
                <div className="rounded-xl bg-accent p-6 text-accent-foreground">
                  <h4 className="text-xl font-semibold tracking-tight">
                    {priority.title}
                  </h4>
                  <p className="mt-3 max-w-[65ch] type-ui leading-relaxed">
                    {priority.action}
                  </p>
                  <Button asChild variant="outline" className="mt-6">
                    <Link
                      href={`/interviews/new?role=${encodeURIComponent(latest!.role)}`}
                    >
                      Practice again <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border bg-card p-6">
                  <AudioLines className="size-6 text-link" aria-hidden="true" />
                  <h4 className="mt-4 text-xl font-semibold tracking-tight">
                    One role. Twenty minutes.
                  </h4>
                  <p className="mt-3 max-w-[55ch] type-ui text-muted-foreground">
                    Choose an engineering role, work through a spoken
                    conversation, and leave with a transcript and one practice
                    priority.
                  </p>
                  <Button asChild variant="outline" className="mt-6">
                    <Link href="/interviews/new">
                      Choose a role <ArrowRight />
                    </Link>
                  </Button>
                </div>
              )}
            </section>
            <section aria-labelledby="latest-review-title" className="min-w-0">
              <h3 id="latest-review-title" className="mb-5 type-section-title">
                Latest session
              </h3>
              {latest ? (
                <div className="space-y-3">
                  <FileText
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h4 className="font-medium">{latest.role} interview</h4>
                  <p className="type-caption text-muted-foreground">
                    {formatDate(latest.createdAt)} · {latest.level}
                  </p>
                  <p className="type-ui leading-relaxed text-muted-foreground">
                    {latest.review?.summary ??
                      "Your conversation is saved. Open the session to see its transcript and review status."}
                  </p>
                  <Button asChild variant="link" className="px-0">
                    <Link href={`/interviews/${latest.id}/feedback`}>
                      {latest.review || latest.feedback
                        ? "Open review"
                        : "Open saved session"}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="type-ui leading-relaxed text-muted-foreground">
                  Your completed conversations and reviews will be here after
                  your first interview.
                </p>
              )}
            </section>
          </div>
          {sessions.length > 0 && (
            <section aria-labelledby="recent-title" className="border-t pt-7">
              <div className="mb-5 flex items-center justify-between">
                <h3 id="recent-title" className="type-section-title">
                  Recent interviews
                </h3>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/history">
                    View all <ArrowRight />
                  </Link>
                </Button>
              </div>
              <InterviewRows interviews={sessions.slice(0, 3)} compact />
            </section>
          )}
          <div className="mt-8 flex justify-end border-t pt-5">
            <FeaturePreview feature="plan" />
          </div>
        </>
      )}
    </Workspace>
  );
}
