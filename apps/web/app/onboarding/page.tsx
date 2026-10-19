"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  emptyProfile,
  levels,
  profileDetailsSchema,
  roles,
  type ProfileDetails,
  type ProfileImport,
} from "@repo/shared";
import { Brand } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineAlert } from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { profileApi, useUserProfile } from "@/lib/profile";

const fieldClass =
  "min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 focus-visible:ring-offset-focus-offset aria-invalid:border-destructive md:text-sm";
const commonStack = [
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "SQL",
  "AWS",
  "Docker",
];
const steps = ["Import", "Profile", "Focus"];

export default function Onboarding() {
  const router = useRouter();
  const client = useQueryClient();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const profile = useUserProfile();
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const [details, setDetails] = useState<ProfileDetails>(emptyProfile());
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [stackInput, setStackInput] = useState("");
  const [source, setSource] = useState("");
  const [dragging, setDragging] = useState(false);
  const initialized = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  const importController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!sessionPending && !session) router.replace("/auth/sign-in");
  }, [sessionPending, session, router]);
  useEffect(() => {
    if (!profile.data || !session || initialized.current === session.user.id)
      return;
    initialized.current = session.user.id;
    const edit =
      new URLSearchParams(window.location.search).get("edit") === "1";
    if (!edit && ["complete", "skipped"].includes(profile.data.status)) {
      router.replace("/dashboard");
      return;
    }
    setEditing(edit);
    setDetails(profile.data.details);
    setStep(edit || profile.data.status === "draft" ? 1 : 0);
    setReady(true);
  }, [profile.data, session, router]);
  useEffect(() => {
    if (ready) heading.current?.focus();
  }, [step, ready]);
  useEffect(() => () => importController.current?.abort(), []);

  const change = (key: keyof ProfileDetails, value: string | string[]) => {
    setDetails((prior) => ({ ...prior, [key]: value }));
    setFieldErrors((prior) => ({ ...prior, [key]: "" }));
  };
  function applySuggestions(result: ProfileImport) {
    setDetails((prior) => {
      const next = { ...prior };
      for (const [key, value] of Object.entries(result.suggestions)) {
        if (key === "stack" && Array.isArray(value))
          next.stack = [
            ...new Map(
              [...prior.stack, ...value].map((item) => [
                item.toLowerCase(),
                item,
              ]),
            ).values(),
          ].slice(0, 30);
        else if (
          typeof value === "string" &&
          !prior[key as keyof ProfileDetails]
        )
          Object.assign(next, { [key]: value });
      }
      return next;
    });
    setSource(result.source);
    setStep(1);
  }
  async function importSource(input: File | { url?: string; text?: string }) {
    if (importing || saving) return;
    if (
      input instanceof File &&
      (input.size > 5 * 1024 * 1024 ||
        !input.size ||
        !/\.(pdf|docx|txt)$/i.test(input.name))
    ) {
      setError("Choose a PDF, DOCX, or TXT resume up to 5 MB.");
      return;
    }
    setError("");
    setImporting(true);
    const controller = new AbortController();
    importController.current = controller;
    try {
      applySuggestions(
        await profileApi.import(
          input,
          AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
        ),
      );
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Import failed. Try again or enter your details manually.",
        );
    } finally {
      setImporting(false);
    }
  }
  function continueManually() {
    importController.current?.abort();
    try {
      const link = new URL(
        /^[a-z][a-z0-9+.-]*:/i.test(url.trim())
          ? url.trim()
          : `https://${url.trim()}`,
      );
      const key = ["github.com", "www.github.com"].includes(link.hostname)
        ? "githubUrl"
        : /(^|\.)linkedin\.com$/.test(link.hostname)
          ? "linkedinUrl"
          : "portfolioUrl";
      if (
        link.protocol === "https:" &&
        !link.username &&
        !link.password &&
        url.trim()
      )
        setDetails((prior) => ({
          ...prior,
          [key]: prior[key] || link.toString(),
        }));
    } catch {
      /* Manual entry does not require a source URL. */
    }
    setStep(1);
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving || importing) return;
    const result = profileDetailsSchema.safeParse(details);
    if (!result.success) {
      const errors = Object.fromEntries(
        result.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      );
      setFieldErrors(errors);
      const first = String(result.error.issues[0]?.path[0]);
      if (
        [
          "name",
          "headline",
          "location",
          "githubUrl",
          "linkedinUrl",
          "portfolioUrl",
        ].includes(first) &&
        step !== 1
      )
        setStep(1);
      setTimeout(() => document.getElementById(`profile-${first}`)?.focus(), 0);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const complete = step === 2;
      const saved = await profileApi.save(result.data, complete);
      client.setQueryData(["profile", session?.user.id], saved);
      if (complete) router.replace(editing ? "/settings" : "/interviews/new");
      else setStep(2);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save your profile. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function skip() {
    if (editing) {
      router.replace("/settings");
      return;
    }
    importController.current?.abort();
    setSaving(true);
    setError("");
    try {
      client.setQueryData(
        ["profile", session?.user.id],
        await profileApi.skip(),
      );
      router.replace("/dashboard");
    } catch {
      setError("Could not save your choice. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  function addStack(value = stackInput) {
    const additions = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (
      additions.some((item) => item.length > 40) ||
      details.stack.length +
        additions.filter(
          (item) =>
            !details.stack.some(
              (old) => old.toLowerCase() === item.toLowerCase(),
            ),
        ).length >
        30
    ) {
      setFieldErrors((prior) => ({
        ...prior,
        stack: "Use up to 30 technologies, each under 40 characters.",
      }));
      return;
    }
    change("stack", [
      ...new Map(
        [...details.stack, ...additions].map((item) => [
          item.toLowerCase(),
          item,
        ]),
      ).values(),
    ]);
    setStackInput("");
  }
  const field = (
    key:
      | "name"
      | "headline"
      | "location"
      | "githubUrl"
      | "linkedinUrl"
      | "portfolioUrl",
    label: string,
    placeholder?: string,
  ) => (
    <div className="space-y-2">
      <label htmlFor={`profile-${key}`} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={`profile-${key}`}
        value={details[key]}
        maxLength={key.includes("Url") ? 2048 : key === "name" ? 80 : 120}
        autoComplete={
          key === "name"
            ? "name"
            : key === "location"
              ? "address-level2"
              : "off"
        }
        onChange={(event) => change(key, event.target.value)}
        placeholder={placeholder}
        aria-invalid={!!fieldErrors[key]}
        aria-describedby={fieldErrors[key] ? `${key}-error` : undefined}
        disabled={saving}
      />
      {fieldErrors[key] && (
        <p
          id={`${key}-error`}
          className="text-xs text-destructive"
          role="alert"
        >
          {fieldErrors[key]}
        </p>
      )}
    </div>
  );

  if (sessionPending || !session || (!ready && !profile.isError))
    return (
      <div
        className="grid min-h-dvh place-items-center text-sm text-muted-foreground"
        role="status"
      >
        Getting your profile ready…
      </div>
    );
  if (profile.isError)
    return (
      <div className="mx-auto max-w-lg px-6 py-16">
        <Brand />
        <div className="mt-10">
          <InlineAlert>
            Could not load your profile.{" "}
            <Button variant="link" onClick={() => void profile.refetch()}>
              Try again
            </Button>
          </InlineAlert>
        </div>
      </div>
    );
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <Brand />
        <Button variant="ghost" onClick={() => void skip()} disabled={saving}>
          {editing ? "Cancel" : "Skip for now"}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-[680px] px-6 pt-5 pb-12 sm:pt-10 sm:pb-16">
        <nav aria-label="Setup progress">
          <ol className="mb-10 flex items-center gap-2 sm:gap-4">
            {steps.map((label, index) => (
              <li
                key={label}
                className="flex min-w-0 flex-1 items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep(index);
                    setError("");
                  }}
                  disabled={index > step || saving || importing}
                  aria-current={index === step ? "step" : undefined}
                  className={`flex min-h-11 items-center gap-2 rounded-md text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 ${index === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${index <= step ? "bg-primary text-primary-foreground" : "border bg-background"}`}
                  >
                    {index < step ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {label}
                </button>
                {index < 2 && (
                  <span
                    className="h-px min-w-2 flex-1 bg-border"
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-[28px] leading-tight tracking-[-0.035em] outline-none sm:text-[32px]"
        >
          {step === 0
            ? "A good place to start."
            : step === 1
              ? "Make sure it sounds like you."
              : "Make practice your own."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {step === 0
            ? "Bring a resume or profile. We’ll draft the basics for you."
            : step === 1
              ? "A few details to make this your space."
              : "Choose a direction. You can change it anytime."}
        </p>
        {step === 0 && (
          <Button
            variant="link"
            className="-ml-3 mt-2"
            onClick={continueManually}
            disabled={saving}
          >
            Enter details myself
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
        {error && (
          <div className="mt-6">
            <InlineAlert>{error}</InlineAlert>
          </div>
        )}
        {step === 0 ? (
          <div className="mt-8 space-y-6">
            {!capabilities.isPending && !capabilities.data?.llm && (
              <p className="text-sm text-muted-foreground" role="status">
                AI import is unavailable right now. You can still enter your
                details manually.
              </p>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your source is sent to the AI provider; the original isn’t saved.
            </p>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!importing) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file && capabilities.data?.llm) void importSource(file);
              }}
              className={`rounded-xl border border-dashed bg-card px-6 py-8 text-center transition-colors ${dragging ? "border-primary bg-accent" : "border-input"}`}
            >
              <Upload
                className="mx-auto mb-4 size-6 text-primary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-base">Upload your resume</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                PDF, DOCX or TXT · up to 5 MB
              </p>
              <label
                className={`relative mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border bg-card px-5 py-2 text-sm font-medium outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-3 ${!capabilities.data?.llm || importing ? "cursor-not-allowed text-muted-foreground" : "hover:bg-secondary-hover"}`}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  aria-label="Upload resume"
                  className="sr-only"
                  disabled={importing || !capabilities.data?.llm}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importSource(file);
                    event.target.value = "";
                  }}
                />
                Choose a file
              </label>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void importSource({ url });
              }}
              className="space-y-2"
            >
              <label
                htmlFor="profile-source-link"
                className="text-sm font-medium"
              >
                Or use a profile link
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Link2
                    className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="profile-source-link"
                    placeholder="GitHub, LinkedIn or your portfolio"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    maxLength={2048}
                    className="pl-10"
                    disabled={importing || !capabilities.data?.llm}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!url.trim() || importing || !capabilities.data?.llm}
                >
                  Use link
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </form>
            <details className="text-sm">
              <summary className="w-fit cursor-pointer rounded-md py-3 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Paste profile text instead
              </summary>
              <form
                className="mt-3 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void importSource({ text });
                }}
              >
                <label htmlFor="profile-source-text" className="sr-only">
                  Profile or resume text
                </label>
                <textarea
                  id="profile-source-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={30000}
                  rows={5}
                  className={fieldClass}
                  placeholder="Paste the relevant parts of your resume or profile…"
                  disabled={importing || !capabilities.data?.llm}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={
                    text.trim().length < 40 ||
                    importing ||
                    !capabilities.data?.llm
                  }
                >
                  <Sparkles aria-hidden="true" />
                  Draft my profile
                </Button>
              </form>
            </details>
            {importing && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 text-sm"
                role="status"
              >
                <span className="flex items-center gap-2">
                  <Loader2
                    className="size-4 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  Reading and drafting your profile…
                </span>
                <Button
                  variant="ghost"
                  onClick={() => importController.current?.abort()}
                >
                  Cancel import
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={save} noValidate className="mt-8">
            {source && step === 1 && (
              <div
                className="mb-7 flex items-start gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground"
                role="status"
              >
                <Sparkles
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Drafted from {source.toLowerCase()}. Review and edit before
                  continuing.
                </span>
              </div>
            )}
            {step === 1 ? (
              <div className="space-y-6">
                {field("name", "Your name")}
                {field(
                  "headline",
                  "Headline (optional)",
                  "e.g. Software engineer",
                )}
                {field("location", "Location (optional)", "City, country")}
                <fieldset className="space-y-5 border-t pt-6">
                  <legend className="pr-2 text-sm font-medium">
                    Your links{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </legend>
                  {field("githubUrl", "GitHub", "https://github.com/you")}
                  {field(
                    "linkedinUrl",
                    "LinkedIn",
                    "https://linkedin.com/in/you",
                  )}
                  {field("portfolioUrl", "Portfolio", "https://your-site.com")}
                </fieldset>
              </div>
            ) : (
              <div className="space-y-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="profile-role"
                      className="text-sm font-medium"
                    >
                      Target role
                    </label>
                    <select
                      id="profile-role"
                      className={fieldClass}
                      value={details.role}
                      onChange={(event) => change("role", event.target.value)}
                      disabled={saving}
                    >
                      <option value="">Not sure yet</option>
                      {roles.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="profile-level"
                      className="text-sm font-medium"
                    >
                      Experience level
                    </label>
                    <select
                      id="profile-level"
                      className={fieldClass}
                      value={details.level}
                      onChange={(event) => change("level", event.target.value)}
                      disabled={saving}
                    >
                      <option value="">Choose later</option>
                      {levels.map((level) => (
                        <option key={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <fieldset>
                  <legend className="mb-3 text-sm font-medium">
                    Your stack
                  </legend>
                  {details.stack.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {details.stack.map((item) => (
                        <button
                          key={item.toLowerCase()}
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            change(
                              "stack",
                              details.stack.filter((value) => value !== item),
                            )
                          }
                          aria-label={`Remove ${item}`}
                          className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-md border border-primary bg-accent px-3 text-sm text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="break-all">{item}</span>
                          <X className="size-3.5 shrink-0" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="profile-stack"
                      aria-label="Add a technology"
                      placeholder="Add a technology"
                      value={stackInput}
                      onChange={(event) => setStackInput(event.target.value)}
                      maxLength={200}
                      disabled={saving}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          addStack();
                        }
                      }}
                      aria-invalid={!!fieldErrors.stack}
                      aria-describedby={
                        fieldErrors.stack ? "stack-error" : undefined
                      }
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-label="Add technology"
                      onClick={() => addStack()}
                      disabled={!stackInput.trim() || saving}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                  {fieldErrors.stack && (
                    <p
                      id="stack-error"
                      className="mt-2 text-xs text-destructive"
                      role="alert"
                    >
                      {fieldErrors.stack}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {commonStack
                      .filter(
                        (item) =>
                          !details.stack.some(
                            (value) =>
                              value.toLowerCase() === item.toLowerCase(),
                          ),
                      )
                      .map((item) => (
                        <Button
                          key={item}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addStack(item)}
                          disabled={saving}
                        >
                          <Plus className="size-3" aria-hidden="true" />
                          {item}
                        </Button>
                      ))}
                  </div>
                </fieldset>
                <div className="space-y-2">
                  <label htmlFor="profile-goal" className="text-sm font-medium">
                    What would you like to work on?{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id="profile-goal"
                    rows={3}
                    className={fieldClass}
                    maxLength={500}
                    value={details.goal}
                    onChange={(event) => change("goal", event.target.value)}
                    disabled={saving}
                    placeholder="e.g. Explaining my technical decisions more clearly"
                  />
                </div>
              </div>
            )}
            <div className="mt-8 flex items-center justify-between gap-4 border-t pt-6">
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setStep((value) => value - 1);
                  setError("");
                }}
              >
                <ArrowLeft aria-hidden="true" />
                Back
              </Button>
              <Button type="submit" loading={saving}>
                {step === 1
                  ? "Continue"
                  : editing
                    ? "Save profile"
                    : "Continue to practice"}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
