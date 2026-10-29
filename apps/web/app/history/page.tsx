"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { Workspace } from "@/components/workspace";
import {
  PageIntro,
  InterviewRows,
  Loading,
  ErrorState,
  InlineAlert,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { api, elapsed } from "@/lib/api";

export default function History() {
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: api.remove,
    onSuccess: () => client.invalidateQueries({ queryKey: ["interviews"] }),
  });
  const query = useQuery({
    queryKey: ["interviews"],
    queryFn: api.list,
    enabled: !!session,
  });
  const all = query.data ?? [];
  const completed = all.filter((i) => i.status === "completed");
  const scores = completed.flatMap((i) =>
    i.feedback?.overallScore != null ? [i.feedback.overallScore] : [],
  );
  const items = all
    .filter((i) => status === "all" || i.status === status)
    .filter((i) =>
      `${i.role} ${i.level} ${i.topics.join(" ")}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    );
  return (
    <Workspace>
      <PageIntro
        action={
          query.data?.length ? (
            <Button asChild>
              <Link href="/interviews/new">
                <Plus />
                New interview
              </Link>
            </Button>
          ) : undefined
        }
      />
      {!!query.data?.length && (
        <>
          <dl className="mb-7 flex flex-wrap gap-x-7 gap-y-3 text-sm">
            <div className="flex gap-1.5">
              <dd className="font-medium tabular-nums">{completed.length}</dd>
              <dt className="text-muted-foreground">completed</dt>
            </div>
            <div className="flex gap-1.5">
              <dd className="font-medium tabular-nums">
                {Math.round(all.reduce((sum, i) => sum + elapsed(i), 0) / 60)}
              </dd>
              <dt className="text-muted-foreground">minutes practiced</dt>
            </div>
            {scores.length > 0 && (
              <div className="flex gap-1.5">
                <dd className="font-medium tabular-nums">
                  {(
                    scores.reduce((sum, n) => sum + n, 0) / scores.length
                  ).toFixed(1)}
                </dd>
                <dt className="text-muted-foreground">average score</dt>
              </div>
            )}
          </dl>
          <div
            className="mb-5 flex gap-6 border-b"
            role="group"
            aria-label="Filter interviews by status"
          >
            {[
              ["all", "All interviews"],
              ["completed", "Completed"],
              ["active", "In progress"],
              ["draft", "Drafts"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatus(value!)}
                aria-pressed={status === value}
                className={`min-h-11 border-b-2 text-xs sm:text-sm ${status === value ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {!!query.data?.length && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {query.data
              ? `${items.length} interview${items.length === 1 ? "" : "s"}${search ? ` of ${query.data.length}` : ""}`
              : "Your interviews"}
          </p>
          <div className="relative w-full sm:max-w-72">
            <Label htmlFor="history-search" className="sr-only">
              Search interviews
            </Label>
            <Search
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="history-search"
              className="pr-10 pl-9"
              placeholder="Search role or topic…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (search || status !== "all") && !items.length ? (
        <div className="border-y px-5 py-16 text-center">
          <Search
            className="mx-auto mb-4 size-6 text-muted-foreground"
            aria-hidden="true"
          />
          <h3>No interviews match</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try another search or status.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setSearch("");
              setStatus("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <InterviewRows
          interviews={items}
          deleting={remove.isPending}
          onDelete={(i) => remove.mutate(i.id)}
        />
      )}
      {remove.error && (
        <InlineAlert className="mt-5">{remove.error.message}</InlineAlert>
      )}
    </Workspace>
  );
}
