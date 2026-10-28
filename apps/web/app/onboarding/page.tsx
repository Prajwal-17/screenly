"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CloudCheck,
  FileText,
  FolderGit2,
  Link2,
  Loader2,
  Pencil,
  Plus,
  ScanText,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  profileDetailsSchema,
  normalizeProfileLink,
  roles,
  levels,
  type ProfileDetails,
  type ProfileProject,
} from "@repo/shared";
import { authClient } from "@/lib/auth-client";
import { profileApi, useUserProfile } from "@/lib/profile";
import { useProfileDraft } from "@/lib/use-profile-draft";
import { api } from "@/lib/api";
import { Brand } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { InlineAlert } from "@/components/common";
import { ChoiceGroup } from "@/components/form-choices";
import {
  ProfileField,
  ProjectEditor,
  StackEditor,
} from "@/components/onboarding/profile-fields";
import { ImportPanel } from "@/components/onboarding/import-panel";
import {
  ImportReview,
  mergeSuggestions,
  ProfileReview,
} from "@/components/onboarding/profile-review";

const steps = [
  { title: "Get started", hint: "Bring a resume or profile", icon: ScanText },
  { title: "About you", hint: "Your background", icon: UserRound },
  { title: "Your links", hint: "Where to find your work", icon: Link2 },
  { title: "Projects", hint: "What you’ve built", icon: FolderGit2 },
  { title: "Practice focus", hint: "Your stack and goals", icon: Target },
  { title: "Review", hint: "One last look", icon: CheckCheck },
];
const copy = [
  {
    title: "Import profile",
    description: "Import your background, or build your profile step by step.",
  },
  {
    title: "About you",
    description: "",
  },
  {
    title: "Links",
    description: "",
  },
  {
    title: "Projects",
    description: "Personal, open-source, and professional projects all count.",
  },
  {
    title: "Practice focus",
    description: "",
  },
  {
    title: "Review profile",
    description:
      "Review your details before continuing. You can edit them anytime.",
  },
];
export default function Onboarding() {
  const client = useQueryClient();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const profile = useUserProfile();
  const [editing, setEditing] = useState(false);
  const [modeReady, setModeReady] = useState(false);
  useEffect(() => {
    setEditing(new URLSearchParams(location.search).get("edit") === "1");
    setModeReady(true);
  }, []);
  const { draft, update, sync, flush, finish, clear } = useProfileDraft(
    modeReady ? profile.data : undefined,
    session?.user.id,
    editing,
  );
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const ready = !!session && !!profile.data && modeReady;
  const [projectIndex, setProjectIndex] = useState<number | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const admitted = useRef("");
  const step = draft?.onboarding.step ?? 0;
  const pending = draft?.onboarding.pendingImport;
  const hasPending = !!pending;
  useEffect(() => {
    if (!isPending && !session) router.replace("/auth/sign-in");
  }, [isPending, session, router]);
  useEffect(() => {
    if (
      !profile.data ||
      !modeReady ||
      !session ||
      admitted.current === session.user.id
    )
      return;
    admitted.current = session.user.id;
    if (!editing && ["complete", "skipped"].includes(profile.data.status))
      router.replace("/dashboard");
  }, [profile.data, modeReady, editing, router, session]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    content.current?.scrollTo({ top: 0 });
  }, [step, hasPending]);
  useEffect(() => {
    if (pending)
      setSelection(
        draft?.onboarding.importSelection ?? Object.keys(pending.suggestions),
      );
  }, [pending, draft?.onboarding.importSelection]);
  function go(next: number) {
    setError("");
    setErrors({});
    update((prior) => ({
      ...prior,
      onboarding: { ...prior.onboarding, step: next },
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
          ([path]) => path !== key && !path.startsWith(`${key}.`),
        ),
      ),
    );
  }
  function validate(all = false) {
    if (!draft) return false;
    const result = profileDetailsSchema.safeParse(draft.details);
    if (result.success) return true;
    const allowed =
      step === 1
        ? ["name", "headline", "location", "about"]
        : step === 2
          ? ["githubUrl", "linkedinUrl", "portfolioUrl", "otherLinks"]
          : step === 3
            ? ["projects"]
            : ["role", "level", "stack", "goal"];
    const issues = result.error.issues.filter(
      (issue) => all || allowed.includes(String(issue.path[0])),
    );
    if (!issues.length) return true;
    setErrors(
      Object.fromEntries(
        issues.map((issue) => [issue.path.join("."), issue.message]),
      ),
    );
    const field = String(issues[0]?.path[0]);
    if (all) {
      const target = ["name", "headline", "location", "about"].includes(field)
        ? 1
        : ["githubUrl", "linkedinUrl", "portfolioUrl", "otherLinks"].includes(
              field,
            )
          ? 2
          : field === "projects"
            ? 3
            : 4;
      update((prior) => ({
        ...prior,
        onboarding: { ...prior.onboarding, step: target },
      }));
    }
    setError(issues[0]?.message ?? "Check your details.");
    const index = issues[0]?.path[1];
    const nested = String(issues[0]?.path[2] ?? "name");
    const focusId =
      field === "otherLinks" && typeof index === "number"
        ? `extra-${nested === "label" ? "label" : "url"}-${index}`
        : field === "projects" && typeof index === "number"
          ? `project-${nested}`
          : `profile-${field}`;
    if (field === "projects" && typeof index === "number")
      setProjectIndex(index);
    setTimeout(() => document.getElementById(focusId)?.focus(), 0);
    return false;
  }
  async function next() {
    if (saving || busy || (step > 0 && !ready)) return;
    if (step === 0 && pending) {
      update((prior) => ({
        ...prior,
        details: mergeSuggestions(
          prior.details,
          pending.suggestions,
          selection,
        ),
        onboarding: { step: 1, pendingImport: null },
      }));
      setError("");
      return;
    }
    if (step === 0) {
      go(1);
      return;
    }
    if (!validate(step === 5)) return;
    if (step < 5) {
      go(step + 1);
      return;
    }
    setSaving(true);
    if (!editing) setSettingUp(true);
    setError("");
    try {
      await finish();
      if (editing) router.replace("/settings");
      else await openWorkspace("/interviews/new");
    } catch (cause) {
      setSettingUp(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your profile. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function openWorkspace(destination: string) {
    await Promise.all([
      client.prefetchQuery({ queryKey: ["interviews"], queryFn: api.list }),
      client.prefetchQuery({
        queryKey: ["capabilities"],
        queryFn: api.capabilities,
      }),
    ]);
    router.replace(destination);
  }
  async function exit() {
    if (!ready || saving) return;
    setSaving(true);
    if (!editing) setSettingUp(true);
    setError("");
    try {
      await flush();
      if (!editing)
        client.setQueryData(
          ["profile", session?.user.id],
          await profileApi.skip(),
        );
      clear();
      if (editing) router.replace("/settings");
      else await openWorkspace("/dashboard");
    } catch {
      setSettingUp(false);
      setError(
        "Your draft is kept on this device. Could not sync it; try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (settingUp)
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto w-full max-w-6xl px-6 py-5 sm:px-10">
          <Brand />
        </header>
        <main className="grid flex-1 place-items-center px-6 pb-24">
          <div
            className="max-w-sm text-center"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="mx-auto mb-6 size-6 animate-spin text-primary"
              aria-hidden="true"
            />
            <h1 className="text-2xl sm:text-[28px]">
              Setting up your workspace…
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Saving your preferences and getting your practice space ready.
            </p>
          </div>
        </main>
      </div>
    );
  const details = draft.details;
  const field = (
    key:
      | "name"
      | "headline"
      | "location"
      | "about"
      | "githubUrl"
      | "linkedinUrl"
      | "portfolioUrl"
      | "goal",
    label: string,
    options: {
      multiline?: boolean;
      optional?: boolean;
      placeholder?: string;
    } = {},
  ) => (
    <ProfileField
      id={`profile-${key}`}
      label={label}
      value={details[key]}
      onChange={(value) => change(key, value)}
      error={errors[key]}
      maxLength={
        key.includes("Url")
          ? 2048
          : key === "name"
            ? 80
            : key === "about"
              ? 1500
              : key === "goal"
                ? 500
                : 120
      }
      onBlur={
        key.includes("Url")
          ? () => change(key, normalizeProfileLink(details[key]))
          : undefined
      }
      disabled={saving}
      {...options}
    />
  );
  const saveStatus = (
    <div
      className="flex items-center gap-2 text-xs text-muted-foreground"
      role="status"
    >
      {sync === "saving" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : sync === "error" ? (
        <FileText className="size-3.5" aria-hidden="true" />
      ) : (
        <CloudCheck className="size-3.5 text-primary" aria-hidden="true" />
      )}
      {!ready ? (
        profile.isError ? (
          <Button variant="link" onClick={() => void profile.refetch()}>
            Could not load profile. Retry
          </Button>
        ) : (
          "Connecting your account…"
        )
      ) : sync === "saving" ? (
        "Saving changes…"
      ) : sync === "error" ? (
        <>
          Sync failed.{" "}
          <Button
            variant="link"
            size="xs"
            onClick={() => void flush().catch(() => {})}
          >
            Retry
          </Button>
        </>
      ) : (
        "All changes saved"
      )}
    </div>
  );
  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-sidebar">
      <header className="mx-auto flex h-[72px] w-full max-w-[1200px] shrink-0 items-center justify-between gap-4 px-5 sm:px-8">
        <Brand />
        <Button
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={() => void exit()}
        >
          {editing ? "Save & exit" : "Skip for now"}
        </Button>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-[1120px] flex-1 gap-8 px-4 pt-2 pb-5 sm:px-8 sm:pt-4 sm:pb-8">
        <aside className="hidden w-[216px] shrink-0 flex-col py-6 md:flex">
          <div className="mb-7">
            <h2 className="text-base">Your Screenly profile</h2>
          </div>
          <nav aria-label="Onboarding steps">
            <ol className="space-y-1">
              {steps.map((item, index) => (
                <li key={item.title}>
                  <button
                    type="button"
                    disabled={busy || saving || !!pending}
                    onClick={() => go(index)}
                    aria-current={index === step ? "step" : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${index === step ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"}`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-md ${index === step ? "bg-primary text-primary-foreground" : index < step ? "bg-secondary text-primary" : "border border-border"}`}
                    >
                      {index < step ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <item.icon className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">
                        {item.title}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-auto pt-8">{saveStatus}</div>
        </aside>
        <section
          aria-labelledby="onboarding-heading"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card"
        >
          <div className="shrink-0 border-b px-5 py-5 sm:px-8 sm:py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {pending
                  ? "Review AI suggestions"
                  : `Step ${step + 1} of ${steps.length}`}
              </span>
              <span className="md:hidden">{saveStatus}</span>
            </div>
            <Progress
              value={((step + 1) / steps.length) * 100}
              aria-label="Onboarding progress"
              className="mb-5 h-1 bg-secondary"
            />
            <h1
              id="onboarding-heading"
              ref={heading}
              tabIndex={-1}
              className="text-[24px] leading-tight tracking-[-0.03em] outline-none sm:text-[28px]"
            >
              {pending ? "Review suggestions" : copy[step]?.title}
            </h1>
            {(pending || copy[step]?.description) && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pending
                  ? "Nothing is applied until you approve. You can edit every detail next."
                  : copy[step]?.description}
              </p>
            )}
          </div>
          <div
            ref={content}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8"
            tabIndex={0}
            aria-label={`${steps[step]?.title} content`}
          >
            {error && (
              <div className="mb-5">
                <InlineAlert>{error}</InlineAlert>
              </div>
            )}
            {step === 0 ? (
              pending ? (
                <ImportReview
                  result={pending}
                  selection={selection}
                  onSelection={(keys) => {
                    setSelection(keys);
                    update((prior) => ({
                      ...prior,
                      onboarding: {
                        ...prior.onboarding,
                        importSelection: keys,
                      },
                    }));
                  }}
                />
              ) : (
                <ImportPanel
                  ready={ready}
                  onBusy={setBusy}
                  onResult={(result) => {
                    update((prior) => ({
                      ...prior,
                      onboarding: { step: 0, pendingImport: result },
                    }));
                  }}
                />
              )
            ) : null}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  {field("name", "Your name")}
                  {field("location", "Location", {
                    optional: true,
                    placeholder: "City, country",
                  })}
                </div>
                {field("headline", "Professional headline", {
                  optional: true,
                  placeholder: "e.g. Software engineer at Acme",
                })}
                {field("about", "About you", {
                  multiline: true,
                  optional: true,
                  placeholder:
                    "Your background, experience, and the work you enjoy.",
                })}
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                {field("githubUrl", "GitHub", {
                  optional: true,
                  placeholder: "https://github.com/you",
                })}
                {field("linkedinUrl", "LinkedIn", {
                  optional: true,
                  placeholder: "https://linkedin.com/in/you",
                })}
                {field("portfolioUrl", "Portfolio", {
                  optional: true,
                  placeholder: "https://your-site.com",
                })}
                <div className="border-t pt-4">
                  {details.otherLinks.map((link, index) => (
                    <div key={index} className="mb-4 flex items-end gap-2">
                      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[140px_1fr]">
                        <ProfileField
                          id={`extra-label-${index}`}
                          label="Link label"
                          error={errors[`otherLinks.${index}.label`]}
                          value={link.label}
                          maxLength={40}
                          onChange={(value) =>
                            change(
                              "otherLinks",
                              details.otherLinks.map((item, i) =>
                                i === index ? { ...item, label: value } : item,
                              ),
                            )
                          }
                        />
                        <ProfileField
                          id={`extra-url-${index}`}
                          label="URL"
                          error={errors[`otherLinks.${index}.url`]}
                          value={link.url}
                          maxLength={2048}
                          onChange={(value) =>
                            change(
                              "otherLinks",
                              details.otherLinks.map((item, i) =>
                                i === index ? { ...item, url: value } : item,
                              ),
                            )
                          }
                          onBlur={() =>
                            change(
                              "otherLinks",
                              details.otherLinks.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      url: normalizeProfileLink(item.url),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${link.label || "extra link"}`}
                        onClick={() =>
                          change(
                            "otherLinks",
                            details.otherLinks.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-3"
                    disabled={details.otherLinks.length >= 8}
                    onClick={() =>
                      change("otherLinks", [
                        ...details.otherLinks,
                        { label: "", url: "" },
                      ])
                    }
                  >
                    <Plus aria-hidden="true" />
                    Add another link
                  </Button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {details.projects.length
                      ? `${details.projects.length} project${details.projects.length === 1 ? "" : "s"} added`
                      : "Add the work you’d like to talk about."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={details.projects.length >= 10}
                    onClick={() => {
                      change("projects", [
                        ...details.projects,
                        {
                          name: "",
                          description: "",
                          role: "",
                          stack: [],
                          url: "",
                          repositoryUrl: "",
                        },
                      ]);
                      setProjectIndex(details.projects.length);
                    }}
                  >
                    <Plus aria-hidden="true" />
                    Add project
                  </Button>
                </div>
                {details.projects.length ? (
                  <ul className="divide-y border-y">
                    {details.projects.map((project, index) => (
                      <li
                        key={index}
                        className="flex items-start justify-between gap-4 py-5"
                      >
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold">
                            {project.name || "Untitled project"}
                          </h2>
                          {project.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {[project.role, project.stack.join(", ")]
                              .filter(Boolean)
                              .join(" · ") ||
                              "Add a description and technologies"}
                          </p>
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${project.name || "project"}`}
                            onClick={() => setProjectIndex(index)}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${project.name || "project"}`}
                            onClick={() =>
                              change(
                                "projects",
                                details.projects.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center">
                    <FolderGit2
                      className="mb-4 size-7 text-muted-foreground"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <h2 className="text-base">No projects yet</h2>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      Share what you built, your contribution, and the
                      technologies you used.
                    </p>
                  </div>
                )}
              </div>
            )}
            {step === 4 && (
              <div className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-2">
                  <fieldset>
                    <legend className="mb-3 text-sm font-medium">
                      Target role{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </legend>
                    <ChoiceGroup
                      name="profile-role"
                      label="Target role"
                      options={roles}
                      value={details.role}
                      onValueChange={(value) =>
                        change("role", value as ProfileDetails["role"])
                      }
                    />
                  </fieldset>
                  <fieldset>
                    <legend className="mb-3 text-sm font-medium">
                      Experience level{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </legend>
                    <ChoiceGroup
                      name="profile-level"
                      label="Experience level"
                      options={levels}
                      value={details.level}
                      onValueChange={(value) =>
                        change("level", value as ProfileDetails["level"])
                      }
                    />
                  </fieldset>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-stack">
                    Your technologies{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <StackEditor
                    value={details.stack}
                    onChange={(value) => change("stack", value)}
                    disabled={saving}
                  />
                </div>
                {field("goal", "What would you like to work on?", {
                  optional: true,
                  placeholder: "e.g. Explaining my technical decisions clearly",
                })}
              </div>
            )}
            {step === 5 && <ProfileReview details={details} onEdit={go} />}
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t bg-card px-5 py-4 sm:px-8">
            <Button
              type="button"
              variant="ghost"
              disabled={saving || busy || !ready}
              onClick={() => {
                if (pending) {
                  update((prior) => ({
                    ...prior,
                    onboarding: { step: 0, pendingImport: null },
                  }));
                } else go(Math.max(0, step - 1));
              }}
              className={step === 0 && !pending ? "hidden" : ""}
            >
              <ArrowLeft aria-hidden="true" />
              {pending ? "Discard" : "Back"}
            </Button>
            <Button
              type="button"
              className="ml-auto"
              loading={saving}
              disabled={
                busy || (!!pending && !selection.length) || (step > 0 && !ready)
              }
              onClick={() => void next()}
            >
              {pending
                ? "Approve & continue"
                : step === 0
                  ? "Enter details manually"
                  : step === 5
                    ? editing
                      ? "Save profile"
                      : "Finish setup"
                    : "Continue"}
              {pending ? (
                <Check aria-hidden="true" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
            </Button>
          </footer>
        </section>
      </main>
      <ProjectEditor
        validationErrors={Object.fromEntries(
          Object.entries(errors)
            .filter(([key]) => key.startsWith(`projects.${projectIndex}.`))
            .map(([key, message]) => [key.split(".")[2]!, message]),
        )}
        project={
          projectIndex === null
            ? null
            : (details.projects[projectIndex] ?? null)
        }
        onClose={() => setProjectIndex(null)}
        onChange={(project: ProfileProject) =>
          change(
            "projects",
            details.projects.map((item, index) =>
              index === projectIndex ? project : item,
            ),
          )
        }
      />
    </div>
  );
}
