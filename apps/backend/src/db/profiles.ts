import { eq } from "drizzle-orm";
import {
  emptyProfile,
  type ProfileDetails,
  type UserProfile,
  type OnboardingState,
} from "@repo/shared";
import type { Database } from "./index";
import { user, userProfile } from "./schema";

export function createProfiles(db: Database) {
  const profiles = {
    async get(userId: string): Promise<UserProfile> {
      const row = await db
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
      const owner = await db
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
    async save(
      userId: string,
      details: ProfileDetails,
      complete = false,
      onboarding?: OnboardingState,
    ): Promise<UserProfile> {
      const prior = await profiles.get(userId);
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
      const upsert = db
        .insert(userProfile)
        .values(values)
        .onConflictDoUpdate({ target: userProfile.userId, set: values });
      if (complete)
        await db.batch([
          upsert,
          db
            .update(user)
            .set({ name: details.name, updatedAt: new Date(now) })
            .where(eq(user.id, userId)),
        ]);
      else await upsert.run();
      return profiles.get(userId);
    },
    async skip(userId: string): Promise<UserProfile> {
      const current = await profiles.get(userId);
      const values = {
        userId,
        details: current.details,
        onboarding: { ...current.onboarding, pendingImport: null },
        status: "skipped" as const,
        completedAt: current.completedAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      await db
        .insert(userProfile)
        .values(values)
        .onConflictDoUpdate({ target: userProfile.userId, set: values })
        .run();
      return profiles.get(userId);
    },
  };
  return profiles;
}
