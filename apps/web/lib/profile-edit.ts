"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { profileDraftSchema, type UserProfile } from "@repo/shared";
import { profileApi } from "./profile";

export class ProfileConflict extends Error {}
export type ProfileChange = (latest: UserProfile) => {
  details: UserProfile["details"];
  onboarding?: UserProfile["onboarding"];
};

/** Serialize owned edits and merge into a fresh profile, never a rendered snapshot. */
export function useProfileChange(userId: string) {
  const client = useQueryClient();
  const lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => controller.abort();
  }, [userId]);
  return useMutation({
    scope: { id: "profile-edit:" + userId },
    mutationFn: async (change: ProfileChange) => {
      const signal = lifetime.current?.signal;
      if (!signal) throw new DOMException("Editor closed", "AbortError");
      signal.throwIfAborted();
      const latest = await profileApi.get(signal);
      signal.throwIfAborted();
      client.setQueryData(["profile", userId], latest);
      const update = change(latest);
      const details = profileDraftSchema.parse(update.details);
      const onboarding = update.onboarding ?? latest.onboarding;
      if (
        JSON.stringify(details) === JSON.stringify(latest.details) &&
        JSON.stringify(onboarding) === JSON.stringify(latest.onboarding)
      )
        return latest;
      return profileApi.save(details, false, onboarding, signal);
    },
    onSuccess: (saved) => {
      if (!lifetime.current?.signal.aborted)
        client.setQueryData(["profile", userId], saved);
    },
  });
}

export function requireUnchanged(current: unknown, baseline: unknown) {
  if (JSON.stringify(current) !== JSON.stringify(baseline))
    throw new ProfileConflict(
      "This changed in another tab. Cancel and edit it again.",
    );
}
