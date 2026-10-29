"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mic, RefreshCw } from "lucide-react";
import { roles, type InterviewRole } from "@repo/shared";
import { Workspace } from "@/components/workspace";
import { InlineAlert, Loading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ChoiceGroup } from "@/components/form-choices";
import { useUserProfile } from "@/lib/profile";
import { api } from "@/lib/api";

export default function NewInterview() {
  const router = useRouter();
  const client = useQueryClient();
  const profile = useUserProfile();
  const [selectedRole, setSelectedRole] = useState<InterviewRole | null>(null);
  const [urlRole, setUrlRole] = useState<InterviewRole | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("role");
    setUrlRole(roles.find((role) => role === value) ?? null);
  }, []);
  const role = selectedRole ?? urlRole ?? (profile.data?.details.role || roles[0]);
  const level = profile.data?.details.level;
  const warnings = profile.data
    ? [
        !level &&
          "Add an experience level to your saved profile before starting.",
        !profile.data.details.projects.length &&
          !profile.data.details.about.trim() &&
          "Add a project or background so the interviewer has useful context.",
        !profile.data.details.goal.trim() &&
          "Add a practice goal to help focus the conversation.",
      ].filter((item): item is string => Boolean(item))
    : [];
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const create = useMutation({
    mutationFn: api.create,
    onSuccess: async (interview) => {
      await client.invalidateQueries({ queryKey: ["interviews"] });
      router.push(`/interviews/${interview.id}`);
    },
  });
  return (
    <Workspace>
      <div className="mx-auto max-w-2xl space-y-7">
        {profile.isPending && !profile.data ? (
          <Loading label="Loading your profile…" />
        ) : profile.error && !profile.data ? (
          <InlineAlert>
            Could not load your profile.{" "}
            <Button
              variant="outline"
              size="sm"
              loading={profile.isFetching}
              onClick={() => void profile.refetch()}
            >
              Retry profile
            </Button>
          </InlineAlert>
        ) : (
          profile.data && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (level && !create.isPending) create.mutate({ role });
              }}
              className="space-y-7"
            >
              <div>
                <h2 className="mb-4 text-lg font-medium">Choose a role</h2>
                <ChoiceGroup
                  label="Interview role"
                  name="role"
                  options={roles}
                  value={role}
                  variant="segmented"
                  onValueChange={(value) => {
                    const next = roles.find((item) => item === value);
                    if (next) setSelectedRole(next);
                  }}
                />
                {profile.data.details.role && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    From your profile: {profile.data.details.role}
                  </p>
                )}
              </div>
              <div className="border-y py-5 text-sm">
                <p>
                  <span className="text-muted-foreground">Experience</span> ·{" "}
                  {level || "Not saved"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  20 minute voice interview
                </p>
              </div>
              {warnings.length > 0 && (
                <InlineAlert variant="warning">
                  <ul className="list-disc space-y-1 pl-5">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/onboarding?edit=1">Complete profile</Link>
                  </Button>
                </InlineAlert>
              )}
              {capabilities.data && !capabilities.data.llm && (
                <InlineAlert variant="warning">
                  The interviewer is unavailable right now.
                </InlineAlert>
              )}
              {capabilities.error && (
                <InlineAlert variant="warning">
                  Service availability could not be checked.{" "}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void capabilities.refetch()}
                  >
                    <RefreshCw /> Retry
                  </Button>
                </InlineAlert>
              )}
              {create.error && (
                <InlineAlert>{create.error.message}</InlineAlert>
              )}
              <Button
                type="submit"
                disabled={!level || capabilities.data?.llm === false}
                loading={create.isPending}
              >
                <Mic /> Check microphone <ArrowRight />
              </Button>
            </form>
          )
        )}
      </div>
    </Workspace>
  );
}
