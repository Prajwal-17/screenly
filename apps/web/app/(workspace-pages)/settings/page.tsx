"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Workspace } from "@/components/workspace";
import { ProfileSummary } from "@/components/profile-summary";
import { Button } from "@/components/ui/button";
import {
  InlineAlert,
  Loading,
  ErrorState,
  ConfirmAction,
} from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { api, formatDate } from "@/lib/api";
import {
  playbackRates,
  preferredPlaybackRate,
  savePlaybackRate,
} from "@/lib/audio/playback-rates";

export default function Settings() {
  const { data: session } = authClient.useSession();
  const client = useQueryClient();
  const [rate, setRate] = useState<number>(1);
  const [preferenceError, setPreferenceError] = useState(false);
  useEffect(() => {
    setRate(preferredPlaybackRate());
  }, []);
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
    <Workspace>
      <div className="max-w-3xl">
        <ProfileSummary />
        <section className="border-b py-6" aria-labelledby="memory-title">
          <h2 id="memory-title" className="text-base font-medium">
            Practice memory
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Findings from earlier sessions can guide future conversations.
            Removing one leaves its source interview intact.
          </p>
          {memory.isPending ? (
            <Loading label="Loading practice memory…" />
          ) : memory.error ? (
            <ErrorState
              message={memory.error.message}
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
                    <p className="text-sm font-medium">
                      {finding.practiceFocus}
                    </p>
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
            <p className="mt-4 text-sm text-muted-foreground">
              No retained findings yet.
            </p>
          )}
          {dismiss.error && (
            <InlineAlert className="mt-4">
              Could not remove the finding. Try again.
            </InlineAlert>
          )}
        </section>
        <section className="border-b py-6" aria-labelledby="audio-title">
          <h2 id="audio-title" className="text-base font-medium">
            Audio and conversation
          </h2>
          <label htmlFor="playback-rate" className="mt-4 block text-sm">
            Interviewer playback speed
          </label>
          <select
            id="playback-rate"
            value={rate}
            onChange={(event) => {
              const next = Number(event.target.value);
              setRate(next);
              setPreferenceError(!savePlaybackRate(next));
            }}
            className="mt-2 min-h-11 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {playbackRates.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
          {preferenceError && (
            <InlineAlert className="mt-3">
              This browser could not save your playback preference.
            </InlineAlert>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            Pause, replay, microphone and speaker controls are available during
            an interview.
          </p>
        </section>
        <section className="py-6" aria-labelledby="account-title">
          <h2 id="account-title" className="text-base font-medium">
            Account
          </h2>
          <p className="mt-3 text-sm">{session?.user.email}</p>
          <p className="mt-3 text-sm">
            <Link href="/help" className="underline underline-offset-4">
              Help and troubleshooting
            </Link>
          </p>
        </section>
      </div>
    </Workspace>
  );
}
