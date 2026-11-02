"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  Database,
  Layers2,
  Mic,
  PanelsTopLeft,
  RefreshCw,
  ServerCog,
  Smartphone,
  UserRound,
  Workflow,
} from "lucide-react";
import {
  roles,
  levels,
  type InterviewRole,
  type ExperienceLevel,
} from "@repo/shared";
import { Workspace } from "@/components/workspace";
import { ErrorState, InlineAlert, Loading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChoiceGroup } from "@/components/form-choices";
import { profileApi, useUserProfile } from "@/lib/profile";
import { api } from "@/lib/api";
import { FeaturePreview } from "@/components/feature-preview";
import styles from "@/components/interview-setup.module.css";

const rolePresentation = {
  Frontend: {
    label: "Frontend",
    description: "Interfaces, performance, and the web.",
    icon: PanelsTopLeft,
  },
  Backend: {
    label: "Backend",
    description: "APIs, data, and the systems behind them.",
    icon: Database,
  },
  "Full-stack": {
    label: "Full-stack",
    description: "Decisions across the frontend and backend.",
    icon: Layers2,
  },
  "Mobile Engineering": {
    label: "Mobile Engineering",
    description: "App architecture and device constraints.",
    icon: Smartphone,
  },
  "DevOps / Platform Engineering": {
    label: "DevOps / Platform",
    description: "Reliable infrastructure and software delivery.",
    icon: ServerCog,
  },
  "Data Engineering": {
    label: "Data Engineering",
    description: "Pipelines, models, and reliable data.",
    icon: Workflow,
  },
} satisfies Record<
  InterviewRole,
  { label: string; description: string; icon: typeof Database }
>;

export default function NewInterview() {
  const router = useRouter();
  const client = useQueryClient();
  const profile = useUserProfile();
  const [selectedRole, setSelectedRole] = useState<InterviewRole | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(
    null,
  );
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [urlRole, setUrlRole] = useState<InterviewRole | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("role");
    setUrlRole(roles.find((role) => role === value) ?? null);
  }, []);
  const role =
    selectedRole ?? urlRole ?? (profile.data?.details.role || roles[0]);
  const level = profile.data?.details.level;
  const goal = goalDraft ?? profile.data?.details.goal ?? "";
  const goalChanged =
    goalDraft !== null && goalDraft.trim() !== profile.data?.details.goal;
  const needsBackground =
    profile.data &&
    !profile.data.details.projects.length &&
    !profile.data.details.about.trim();
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const create = useMutation({
    mutationFn: async (input: { role: InterviewRole; goal?: string }) => {
      let profileUpdated = false;
      if (!level) {
        if (!selectedLevel) throw new Error("Choose your experience level.");
        await profileApi.saveExperience(selectedLevel);
        profileUpdated = true;
      }
      if (input.goal !== undefined) {
        try {
          // Merge this explicit edit into fresh profile data, preserving changes
          // to experience, onboarding and other fields made since page load.
          const latest = await profileApi.get();
          profileUpdated = true;
          if (latest.details.goal !== input.goal) {
            await profileApi.save(
              { ...latest.details, goal: input.goal },
              false,
              latest.onboarding,
            );
            profileUpdated = true;
          }
        } catch {
          throw new Error("Could not save your practice goal. Try again.");
        }
      }
      if (profileUpdated)
        await client.invalidateQueries({ queryKey: ["profile"] });
      return api.create({ role: input.role });
    },
    onSuccess: async (interview) => {
      await client.invalidateQueries({ queryKey: ["interviews"] });
      router.push(`/interviews/${interview.id}`);
    },
  });
  const presentation = rolePresentation[role];
  return (
    <Workspace>
      <div className={styles.page} data-interview-setup="">
        {profile.isPending && !profile.data ? (
          <Loading label="Loading your profile…" layout="entry" />
        ) : profile.error && !profile.data ? (
          <ErrorState
            title="We couldn’t load your profile"
            message="Try loading your saved profile again."
            retry={() => void profile.refetch()}
            retrying={profile.isFetching}
          />
        ) : (
          profile.data && (
            <>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if ((level || selectedLevel) && !create.isPending)
                    create.mutate({
                      role,
                      ...(goalChanged ? { goal: goal.trim() } : {}),
                    });
                }}
              >
                <header className={styles.header}>
                  <h2 className="type-page-title">Set up your interview</h2>
                </header>
                <div className={styles.grid}>
                  <section
                    className={styles.roles}
                    aria-labelledby="role-options-title"
                  >
                    <h3
                      id="role-options-title"
                      className={`${styles.sectionTitle} type-section-title`}
                    >
                      Engineering role
                    </h3>
                    <RadioGroup
                      name="role"
                      aria-label="Interview role"
                      value={role}
                      disabled={create.isPending}
                      onValueChange={(value) => {
                        const next = roles.find((item) => item === value);
                        if (next) setSelectedRole(next);
                      }}
                      className={styles.choices}
                    >
                      {roles.map((item) => {
                        const {
                          icon: Icon,
                          label,
                          description,
                        } = rolePresentation[item];
                        return (
                          <RadioGroupItem
                            key={item}
                            value={item}
                            variant="option"
                            className={styles.roleOption}
                            aria-label={item}
                            aria-description={description}
                            icon={
                              <Icon strokeWidth={1.65} aria-hidden="true" />
                            }
                            description={description}
                          >
                            {label}
                          </RadioGroupItem>
                        );
                      })}
                    </RadioGroup>
                  </section>
                  <section
                    className={styles.brief}
                    aria-labelledby="session-brief-title"
                  >
                    <header>
                      <h3 id="session-brief-title" className={styles.roleTitle}>
                        {presentation.label} interview
                      </h3>
                      <p className={styles.metadata}>
                        <span>
                          <Clock3 className="size-3.5" aria-hidden="true" />
                          20 minutes
                        </span>
                        <span>
                          <Mic className="size-3.5" aria-hidden="true" />
                          Voice
                        </span>
                      </p>
                    </header>
                    {level ? (
                      <p className={styles.experience}>
                        <UserRound
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="font-medium">{level}</span>
                        <span className="text-muted-foreground">
                          · From profile
                        </span>
                      </p>
                    ) : (
                      <fieldset disabled={create.isPending}>
                        <legend className="mb-2 w-full type-label">
                          <span className="flex items-center justify-between gap-3">
                            Experience level
                            <Link
                              href="/profile"
                              className="type-caption text-link underline underline-offset-4"
                            >
                              Complete profile
                            </Link>
                          </span>
                        </legend>
                        <ChoiceGroup
                          label="Experience level"
                          name="level"
                          options={levels}
                          value={selectedLevel ?? ""}
                          variant="segmented"
                          onValueChange={(value) => {
                            const next = levels.find((item) => item === value);
                            if (next) setSelectedLevel(next);
                          }}
                        />
                      </fieldset>
                    )}
                    <div className={styles.goal}>
                      <Label
                        htmlFor="practice-goal"
                        className="justify-between"
                      >
                        Practice goal
                        <span className="font-normal text-muted-foreground">
                          Optional
                        </span>
                      </Label>
                      <Textarea
                        id="practice-goal"
                        rows={3}
                        value={goal}
                        maxLength={500}
                        disabled={create.isPending}
                        onChange={(event) => setGoalDraft(event.target.value)}
                        placeholder="What would you like to work on?"
                        aria-describedby={
                          goalChanged ? "goal-save-note" : undefined
                        }
                        className={styles.goalInput}
                      />
                      {goalChanged && (
                        <p
                          id="goal-save-note"
                          className="type-caption text-muted-foreground"
                        >
                          Saved to your profile when you continue.
                        </p>
                      )}
                    </div>
                    {needsBackground && (
                      <p className="type-caption leading-relaxed text-muted-foreground">
                        Add background or a project for more context.{" "}
                        <Link
                          href="/profile"
                          className="text-link underline underline-offset-4"
                        >
                          Complete profile
                        </Link>
                      </p>
                    )}
                    <div className={styles.feedback}>
                      {capabilities.data && !capabilities.data.llm && (
                        <InlineAlert variant="warning">
                          The interviewer is unavailable. Try again later.
                        </InlineAlert>
                      )}
                      {capabilities.error && (
                        <InlineAlert
                          variant="warning"
                          action={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void capabilities.refetch()}
                              loading={capabilities.isFetching}
                            >
                              <RefreshCw /> Retry
                            </Button>
                          }
                        >
                          Could not check service availability.
                        </InlineAlert>
                      )}
                      {create.error && (
                        <InlineAlert>{create.error.message}</InlineAlert>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        (!level && !selectedLevel) ||
                        capabilities.data?.llm === false
                      }
                      loading={create.isPending}
                      loadingLabel="Preparing interview…"
                      aria-label="Continue to audio"
                      className="w-full"
                    >
                      Continue to audio <ArrowRight />
                    </Button>
                  </section>
                </div>
              </form>
              <div className={styles.extras}>
                <FeaturePreview feature="job" />
              </div>
            </>
          )
        )}
      </div>
    </Workspace>
  );
}
