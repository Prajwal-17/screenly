import { eq } from "drizzle-orm";
import {
  emptyProfile,
  type ProfileDetails,
  type UserProfile,
  type OnboardingState,
} from "@repo/shared";
import { db } from "./index";
import { user, userProfile } from "./schema";

export const profiles = {
  get(userId: string): UserProfile {
    const row = db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, userId))
      .get();
    if (row)
      return {
        details: { ...emptyProfile(), ...row.details },
        onboarding: row.onboarding,
        status: row.status,
        completedAt: row.completedAt,
        updatedAt: row.updatedAt,
      };
    const owner = db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .get();
    return {
      details: emptyProfile(owner?.name),
      onboarding: { step: 0, pendingImport: null },
      status: "new",
      completedAt: null,
      updatedAt: null,
    };
  },
  save(
    userId: string,
    details: ProfileDetails,
    complete = false,
    onboarding?: OnboardingState,
  ): UserProfile {
    const prior = profiles.get(userId);
    const now = Date.now();
    const values = {
      userId,
      details,
      onboarding: complete
        ? { step: 5, pendingImport: null }
        : (onboarding ?? prior.onboarding),
      status: complete
        ? ("complete" as const)
        : prior.status === "new"
          ? ("draft" as const)
          : prior.status,
      completedAt: complete ? now : prior.completedAt,
      updatedAt: now,
    };
    db.transaction((tx) => {
      tx.insert(userProfile)
        .values(values)
        .onConflictDoUpdate({ target: userProfile.userId, set: values })
        .run();
      if (complete)
        tx.update(user)
          .set({ name: details.name, updatedAt: new Date(now) })
          .where(eq(user.id, userId))
          .run();
    });
    return profiles.get(userId);
  },
  skip(userId: string): UserProfile {
    const current = profiles.get(userId);
    const values = {
      userId,
      details: current.details,
      onboarding: { ...current.onboarding, pendingImport: null },
      status: "skipped" as const,
      completedAt: current.completedAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    db.insert(userProfile)
      .values(values)
      .onConflictDoUpdate({ target: userProfile.userId, set: values })
      .run();
    return profiles.get(userId);
  },
};
