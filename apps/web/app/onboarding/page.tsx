"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CloudCheck,
  Loader2,
} from "lucide-react";
import {
  profileDetailsSchema,
  roles,
  levels,
  type ProfileDetails,
  type UserProfile,
} from "@repo/shared";
import { authClient } from "@/lib/auth-client";
import { profileApi, useUserProfile } from "@/lib/profile";
import { useProfileDraft } from "@/lib/use-profile-draft";
import { api } from "@/lib/api";
import { Brand } from "@/components/workspace";
import { ProfileTheme } from "@/components/profile-theme";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChoiceGroup } from "@/components/form-choices";
import { InlineAlert, ErrorState, Loading } from "@/components/common";
import {
  ProfileField,
  StackEditor,
} from "@/components/onboarding/profile-fields";
import { BackgroundExtras } from "@/components/onboarding/background-extras";
import { ImportPanel } from "@/components/onboarding/import-panel";
import {
  ImportReview,
  mergeSuggestions,
  suggestionKeys,
  ProfileReview,
} from "@/components/onboarding/profile-review";

const steps = ["Background", "Practice", "Review"];
const phaseFor = (step: number) => (step < 4 ? 0 : step === 4 ? 1 : 2);
const savedStep = [1, 4, 5] as const;

function OnboardingFrame({
  children,
  phase = 0,
  onStep,
  status,
  action,
}: {
  children: React.ReactNode;
  phase?: number;
  onStep?: (index: number) => void;
  status?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <ProfileTheme className="min-h-dvh bg-background">
      <header className="mx-auto flex min-h-[84px] max-w-[1200px] items-center justify-between gap-4 px-6 sm:px-10">
        <Brand />
        {action}
      </header>
      <main className="mx-auto max-w-[1040px] px-6 pt-5 pb-12 sm:px-10">
        <div className="onboarding-grid">
          <aside className="flex flex-col border-r bg-sidebar px-6 py-8 lg:px-[30px] lg:py-9">
            <h2 className="mb-8 text-lg leading-tight font-semibold tracking-[-0.02em] text-foreground">
              Your profile
            </h2>
            <nav aria-label="Onboarding steps">
              <ol className="flex flex-wrap gap-3 md:flex-col md:gap-5">
                {steps.map((title, index) => (
                  <li key={title}>
                    <button
                      type="button"
                      disabled={!onStep}
                      onClick={() => onStep?.(index)}
                      aria-current={index === phase ? "step" : undefined}
                      className={
                        "flex min-h-10 items-center gap-3 rounded-md text-left text-sm " +
                        (index === phase
                          ? "font-medium text-link"
                          : "text-muted-foreground")
                      }
                    >
                      <span
                        className={
                          "grid size-7 shrink-0 place-items-center rounded-full border text-xs tabular-nums " +
                          (index === phase
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input")
                        }
                      >
                        {index < phase ? (
                          <Check className="size-3.5" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {title}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
            {status && <div className="mt-auto pt-10">{status}</div>}
          </aside>
          <section className="min-w-0 p-6 sm:p-8 lg:p-9">{children}</section>
        </div>
      </main>
    </ProfileTheme>
  );
}

export default function Onboarding() {
  const session = authClient.useSession();
  const profile = useUserProfile();
  const router = useRouter();
  const [legacyEdit, setLegacyEdit] = useState<boolean | null>(null);
  useEffect(
    () =>
      setLegacyEdit(new URLSearchParams(location.search).get("edit") === "1"),
    [],
  );
  const complete =
    profile.data?.status === "complete" || profile.data?.status === "skipped";
  useEffect(() => {
    if (!session.isPending && !session.data && !session.error)
      router.replace("/auth/sign-in");
    if (session.data && complete && legacyEdit !== null)
      router.replace(legacyEdit ? "/profile" : "/interviews/new");
  }, [
    session.isPending,
    session.data,
    session.error,
    complete,
    legacyEdit,
    router,
  ]);
  if (session.data && profile.data && !complete && legacyEdit !== null)
    return (
      <OnboardingForm
        key={session.data.user.id}
        userId={session.data.user.id}
        profile={profile.data}
      />
    );
  const failed =
    !!session.error ||
    (!complete &&
      (profile.isError ||
        profile.errorUpdatedAt > 0 ||
        profile.fetchStatus === "paused"));
  return (
    <OnboardingFrame>
      <h1 className="mb-7 type-page-title">Your background</h1>
      {failed ? (
        <ErrorState
          title={
            session.error
              ? "We couldn’t check your session"
              : "We couldn’t load your profile"
          }
          message={
            profile.fetchStatus === "paused"
              ? "Reconnect to load your profile. Your device draft is kept."
              : "Try connecting again. Your saved profile and device draft are kept."
          }
          retry={() => {
            if (session.error) void session.refetch();
            else void profile.refetch();
          }}
          retryLabel={session.error ? "Retry session" : "Retry loading profile"}
          retrying={session.isRefetching || profile.isFetching}
        />
      ) : (
        <Loading
          layout="onboarding"
          label={complete ? "Opening your workspace…" : "Loading your profile…"}
        />
      )}
    </OnboardingFrame>
  );
}

function OnboardingForm({
  userId,
  profile,
}: {
  userId: string;
  profile: UserProfile;
}) {
  const router = useRouter();
  const client = useQueryClient();
  const { draft, update, sync, flush, finish, clear, ready } = useProfileDraft(
    profile,
    userId,
    false,
  );
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importBusy, setImportBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectIndex, setProjectIndex] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const step = draft.onboarding.step;
  const phase = phaseFor(step);
  const pending = draft.onboarding.pendingImport;
  const available = pending ? suggestionKeys(pending.suggestions) : [];
  const selection = (draft.onboarding.importSelection ?? available).filter(
    (key) => available.includes(key),
  );
  const details = draft.details;
  const hasPending = !!pending;
  useEffect(() => {
    heading.current?.focus();
  }, [phase, hasPending, ready]);
  function go(index: number) {
    setError("");
    setErrors({});
    update((prior) => ({
      ...prior,
      onboarding: { ...prior.onboarding, step: savedStep[index]! },
    }));
  }
  function change<K extends keyof ProfileDetails>(
    key: K,
    value: ProfileDetails[K],
  ) {
    update((prior) => ({
      ...prior,
      details: { ...prior.details, [key]: value },
    }));
    setErrors((prior) =>
      Object.fromEntries(
        Object.entries(prior).filter(
          ([path]) => path !== key && !path.startsWith(key + "."),
        ),
      ),
    );
  }
  function validate(all = false) {
    const parsed = profileDetailsSchema.safeParse(details);
    const practiceFields = ["role", "level", "goal", "stack"];
    const issues = parsed.success
      ? []
      : parsed.error.issues
          .filter(
            (issue) =>
              all ||
              (phase === 0
                ? !practiceFields.includes(String(issue.path[0]))
                : practiceFields.includes(String(issue.path[0]))),
          )
          .map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          }));
    if ((phase === 1 || all) && !details.role)
      issues.push({ path: "role", message: "Choose a role." });
    if ((phase === 1 || all) && !details.level)
      issues.push({ path: "level", message: "Choose your experience." });
    if (!issues.length) return true;
    setErrors(
      Object.fromEntries(issues.map((issue) => [issue.path, issue.message])),
    );
    const first = issues[0]!.path;
    const focusPhase = ["role", "level", "stack", "goal"].includes(first)
      ? 1
      : 0;
    update((prior) => ({
      ...prior,
      onboarding: { ...prior.onboarding, step: savedStep[focusPhase]! },
    }));
    if (first.startsWith("projects."))
      setProjectIndex(Number(first.split(".")[1]));
    const focusId = first.startsWith("otherLinks.")
      ? "extra-" +
        (first.endsWith(".label") ? "label" : "url") +
        "-" +
        first.split(".")[1]
      : first.startsWith("projects.")
        ? "project-" + first.split(".")[2]
        : "profile-" + first;
    requestAnimationFrame(() => {
      const target =
        (first === "role" || first === "level"
          ? null
          : document.getElementById(focusId)) ??
        document.querySelector<HTMLElement>(
          '[role="radiogroup"][aria-label="' +
            (first === "role" ? "Role" : "Experience") +
            '"] button',
        );
      target?.focus();
    });
    return false;
  }
  async function next() {
    if (submitting.current || saving || importBusy || !ready) return;
    setError("");
    if (pending) {
      if (!selection.length) return;
      update((prior) => ({
        details: mergeSuggestions(
          prior.details,
          pending.suggestions,
          selection,
        ),
        onboarding: {
          ...prior.onboarding,
          step: 1,
          pendingImport: null,
          importSelection: undefined,
        },
      }));
      return;
    }
    if (!validate(phase === 2)) return;
    if (phase < 2) {
      go(phase + 1);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await finish();
      await Promise.all([
        client.prefetchQuery({ queryKey: ["interviews"], queryFn: api.list }),
        client.prefetchQuery({
          queryKey: ["capabilities"],
          queryFn: api.capabilities,
        }),
      ]);
      router.replace("/interviews/new");
    } catch {
      setError("Couldn’t save your profile. Try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  async function exit() {
    if (submitting.current || saving || importBusy || !ready) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      await flush();
      client.setQueryData(["profile", userId], await profileApi.skip());
      clear();
      router.replace("/interviews/new");
    } catch {
      setError(
        "Couldn’t sync your draft. It is kept on this device. Try again.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  const field = (
    key: "name" | "headline" | "about" | "location" | "goal",
    label: string,
    multiline = false,
  ) => (
    <ProfileField
      id={"profile-" + key}
      label={label}
      multiline={multiline}
      value={details[key]}
      disabled={saving}
      required={key === "name"}
      error={errors[key]}
      maxLength={
        key === "name"
          ? 80
          : key === "about"
            ? 1500
            : key === "goal"
              ? 500
              : 120
      }
      onChange={(value) => change(key, value)}
    />
  );
  const status = (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 type-caption text-muted-foreground"
    >
      {sync === "saving" ? (
        <>
          <Loader2
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          Saving…
        </>
      ) : sync === "error" ? (
        <>
          Couldn’t sync.
          <Button
            variant="link"
            size="xs"
            onClick={() => void flush().catch(() => {})}
          >
            Retry
          </Button>
        </>
      ) : (
        <>
          <CloudCheck className="size-3.5" aria-hidden="true" />
          Saved
        </>
      )}
    </div>
  );
  return (
    <OnboardingFrame
      phase={phase}
      onStep={!importBusy && !saving && !pending ? go : undefined}
      status={ready ? status : null}
      action={
        <Button
          variant="ghost"
          loading={saving}
          loadingLabel="Saving…"
          disabled={importBusy || !ready}
          onClick={() => void exit()}
        >
          Save & exit
        </Button>
      }
    >
      <h1
        ref={heading}
        tabIndex={-1}
        className="mb-7 type-page-title outline-none"
      >
        {pending
          ? "Review suggestions"
          : phase === 0
            ? "Your background"
            : phase === 1
              ? "Practice"
              : "Review"}
      </h1>
      {!ready ? (
        <Loading layout="onboarding" label="Loading your profile…" />
      ) : (
        <>
          {error && (
            <div className="mb-5">
              <InlineAlert>{error}</InlineAlert>
            </div>
          )}
          {pending ? (
            <ImportReview
              result={pending}
              selection={selection}
              onSelection={(keys) =>
                update((prior) => ({
                  ...prior,
                  onboarding: { ...prior.onboarding, importSelection: keys },
                }))
              }
            />
          ) : phase === 0 ? (
            <>
              <ImportPanel
                compact
                ready={!saving}
                onBusy={setImportBusy}
                onResult={(result) => {
                  setImportBusy(false);
                  update((prior) => ({
                    ...prior,
                    onboarding: {
                      ...prior.onboarding,
                      pendingImport: result,
                      importSelection: suggestionKeys(result.suggestions),
                    },
                  }));
                }}
              />
              <form
                id="onboarding-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void next();
                }}
                className="mt-7 space-y-6 border-t pt-7"
              >
                <div className="grid gap-6 xl:grid-cols-2">
                  {field("name", "Name")}
                  {field("location", "Location")}
                </div>
                {field("headline", "Headline")}
                {field("about", "About", true)}
                <BackgroundExtras
                  details={details}
                  disabled={saving}
                  errors={errors}
                  projectIndex={projectIndex}
                  onProjectIndex={setProjectIndex}
                  initiallyOpen={step === 2 || step === 3}
                  onChange={(next) => {
                    update((prior) => ({ ...prior, details: next }));
                    setErrors({});
                  }}
                />
              </form>
            </>
          ) : phase === 1 ? (
            <form
              id="onboarding-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void next();
              }}
              className="space-y-7"
            >
              <fieldset id="profile-role">
                <legend className="mb-3 type-label">Role</legend>
                <ChoiceGroup
                  name="profile-role"
                  label="Role"
                  options={roles}
                  disabled={saving}
                  invalid={!!errors.role}
                  describedBy={errors.role ? "profile-role-error" : undefined}
                  value={details.role}
                  onValueChange={(value) =>
                    change("role", value as ProfileDetails["role"])
                  }
                />
                {errors.role && (
                  <p
                    id="profile-role-error"
                    role="alert"
                    className="mt-2 text-sm text-destructive-text"
                  >
                    {errors.role}
                  </p>
                )}
              </fieldset>
              <fieldset id="profile-level">
                <legend className="mb-3 type-label">Experience</legend>
                <ChoiceGroup
                  name="profile-level"
                  label="Experience"
                  options={levels}
                  disabled={saving}
                  invalid={!!errors.level}
                  describedBy={errors.level ? "profile-level-error" : undefined}
                  value={details.level}
                  onValueChange={(value) =>
                    change("level", value as ProfileDetails["level"])
                  }
                />
                {errors.level && (
                  <p
                    id="profile-level-error"
                    role="alert"
                    className="mt-2 text-sm text-destructive-text"
                  >
                    {errors.level}
                  </p>
                )}
              </fieldset>
              <div className="space-y-3">
                <Label htmlFor="profile-stack">Technologies</Label>
                <StackEditor
                  value={details.stack}
                  disabled={saving}
                  suggestions={false}
                  onChange={(value) => change("stack", value)}
                />
                {errors.stack && (
                  <p role="alert" className="text-sm text-destructive-text">
                    {errors.stack}
                  </p>
                )}
              </div>
              {field("goal", "Practice goal", true)}
            </form>
          ) : (
            <ProfileReview
              details={details}
              onEdit={(step) => go(phaseFor(step))}
            />
          )}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={saving || importBusy}
              onClick={() => {
                if (pending)
                  update((prior) => ({
                    ...prior,
                    onboarding: {
                      ...prior.onboarding,
                      pendingImport: null,
                      importSelection: undefined,
                    },
                  }));
                else if (phase > 0) go(phase - 1);
                else void exit();
              }}
            >
              {pending || phase > 0 ? <ArrowLeft aria-hidden="true" /> : null}
              {pending ? "Discard" : phase > 0 ? "Back" : "Skip for now"}
            </Button>
            <Button
              type="button"
              loading={saving}
              loadingLabel="Saving profile…"
              disabled={importBusy || (!!pending && !selection.length)}
              onClick={() => void next()}
            >
              {pending
                ? "Apply selected"
                : phase === 2
                  ? "Create profile"
                  : "Continue"}
              <ArrowRight aria-hidden="true" />
            </Button>
          </footer>
        </>
      )}
    </OnboardingFrame>
  );
}
