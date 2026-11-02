"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Loading,
  ErrorState,
  RefreshNotice,
  ConfirmAction,
  InlineAlert,
} from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { api, formatDate } from "@/lib/api";
export function PracticeMemory() {
  const { data: session } = authClient.useSession();
  const client = useQueryClient();
  const memory = useQuery({
    queryKey: ["profile-memory"],
    queryFn: api.memory,
    enabled: !!session,
  });
  const dismiss = useMutation({
    mutationFn: api.dismissMemory,
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile-memory"] }),
  });
  return (
    <section className="pb-6" aria-labelledby="memory-title">
      <h2 id="memory-title" className="type-page-title">
        Practice memory
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Findings from earlier sessions can guide future conversations. Removing
        one leaves its source interview intact.
      </p>
      {memory.data && (memory.isError || memory.fetchStatus === "paused") && (
        <RefreshNotice
          message={
            memory.fetchStatus === "paused"
              ? "You’re offline. Showing the last loaded version."
              : "This section couldn’t refresh. Showing the last loaded version."
          }
          retry={() => void memory.refetch()}
          retrying={memory.isFetching}
        />
      )}
      {!memory.data &&
      !(
        memory.isError ||
        memory.errorUpdatedAt > 0 ||
        memory.fetchStatus === "paused"
      ) ? (
        <Loading label="Loading practice memory…" layout="memory" />
      ) : !memory.data ? (
        <ErrorState
          title="We couldn’t load practice memory"
          message={
            memory.fetchStatus === "paused"
              ? "You’re offline. Reconnect, then try again."
              : "Your retained findings haven’t changed. Try loading them again."
          }
          retry={() => void memory.refetch()}
          retrying={memory.isFetching}
        />
      ) : memory.data?.length ? (
        <ul className="mt-5 divide-y border-t">
          {memory.data.map((finding) => (
            <li
              key={finding.id}
              className="flex items-start justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{finding.practiceFocus}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {finding.observation}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {finding.role} · {formatDate(finding.createdAt)} ·{" "}
                  <Link
                    href={`/interviews/${finding.sourceInterviewId}/feedback`}
                    className="underline underline-offset-4"
                  >
                    Source interview
                  </Link>
                </p>
              </div>
              <ConfirmAction
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove practice finding from ${formatDate(finding.createdAt)}`}
                    disabled={dismiss.isPending}
                  >
                    <Trash2 />
                  </Button>
                }
                title="Remove practice finding?"
                description="It will no longer guide future interviews. The source interview stays in your history."
                confirmLabel="Remove finding"
                destructive
                pending={dismiss.isPending}
                onConfirm={() => dismiss.mutate(finding.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-xl border bg-card px-6 py-10">
          <h3 className="type-section-title">No retained findings yet.</h3>
          <p className="mt-2 max-w-[55ch] type-ui text-muted-foreground">
            Complete an interview to build practice context from what you
            actually demonstrated.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/interviews/new">Start an interview</Link>
          </Button>
        </div>
      )}
      {dismiss.error && (
        <InlineAlert className="mt-4">
          Could not remove the finding. Try again.
        </InlineAlert>
      )}
    </section>
  );
}
