"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  profileSaveSchema,
  type ProfileDetails,
  type OnboardingState,
  type UserProfile,
} from "@repo/shared";
import { profileApi } from "./profile";

export type ProfileDraft = {
  details: ProfileDetails;
  onboarding: OnboardingState;
};
export function useProfileDraft(
  profile: UserProfile | undefined,
  userId: string | undefined,
  editing: boolean,
) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [sync, setSync] = useState<"saved" | "saving" | "error">("saved");
  const [revision, setRevision] = useState(0);
  const initialized = useRef("");
  const latest = useRef<ProfileDraft | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const stopped = useRef(false);
  const persisted = useRef("");
  const client = useQueryClient();
  const key = userId ? `screenly:onboarding:${userId}` : "";
  useEffect(() => {
    if (!profile || !userId || initialized.current === userId) return;
    initialized.current = userId;
    stopped.current = false;
    let next: ProfileDraft = {
      details: profile.details,
      onboarding: {
        ...profile.onboarding,
        step:
          editing && ["complete", "skipped"].includes(profile.status)
            ? profile.onboarding.step === 5 || profile.onboarding.step === 0
              ? 1
              : profile.onboarding.step
            : profile.onboarding.step,
      },
    };
    const remote = JSON.stringify(next);
    try {
      const cache = JSON.parse(localStorage.getItem(key) ?? "null");
      const parsed = profileSaveSchema.safeParse(cache?.draft);
      if (
        parsed.success &&
        (cache.pending === true ||
          cache.changedAt > (profile.updatedAt ?? 0)) &&
        (!["complete", "skipped"].includes(profile.status) || editing)
      )
        next = {
          details: parsed.data.details,
          onboarding: parsed.data.onboarding ?? next.onboarding,
        };
    } catch {
      /* The server copy remains usable when device storage is unavailable. */
    }
    persisted.current = remote;
    latest.current = next;
    setDraft(next);
    if (JSON.stringify(next) !== remote) setRevision(1);
  }, [profile, userId, key, editing]);
  const update = useCallback(
    (change: (prior: ProfileDraft) => ProfileDraft) => {
      if (!latest.current || stopped.current) return;
      const next = change(latest.current);
      if (JSON.stringify(next) === JSON.stringify(latest.current)) return;
      latest.current = next;
      setDraft(next);
      setRevision((value) => value + 1);
      setSync("saving");
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ draft: next, changedAt: Date.now(), pending: true }),
        );
      } catch {
        /* Remote autosave still runs. */
      }
    },
    [key],
  );
  const flush = useCallback(() => {
    const snapshot = latest.current;
    if (!snapshot || stopped.current) return queue.current;
    const signature = JSON.stringify(snapshot);
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (signature === persisted.current) {
          if (latest.current === snapshot) setSync("saved");
          return;
        }
        try {
          setSync("saving");
          const saved = await profileApi.save(
            snapshot.details,
            false,
            snapshot.onboarding,
          );
          persisted.current = signature;
          client.setQueryData(["profile", userId], saved);
          if (latest.current === snapshot) {
            setSync("saved");
            try {
              localStorage.removeItem(key);
            } catch {
              /* A later load can safely re-save the same draft. */
            }
          }
          return saved;
        } catch (error) {
          setSync("error");
          throw error;
        }
      });
    return queue.current;
  }, [client, userId, key]);
  useEffect(() => {
    if (!revision) return;
    const timer = setTimeout(() => void flush().catch(() => {}), 650);
    return () => clearTimeout(timer);
  }, [revision, flush]);
  const finish = useCallback(async () => {
    await flush();
    await queue.current;
    stopped.current = true;
    try {
      const current = latest.current!;
      const saved = await profileApi.save(current.details, true, {
        ...current.onboarding,
        pendingImport: null,
      });
      client.setQueryData(["profile", userId], saved);
      try {
        localStorage.removeItem(key);
      } catch {
        /* The saved server profile takes precedence. */
      }
      return saved;
    } catch (error) {
      stopped.current = false;
      throw error;
    }
  }, [client, flush, key, userId]);
  const clear = () => {
    stopped.current = true;
    try {
      localStorage.removeItem(key);
    } catch {
      /* The saved server profile takes precedence. */
    }
  };
  return { draft, update, sync, flush, finish, clear };
}
