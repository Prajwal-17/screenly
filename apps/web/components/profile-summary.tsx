"use client";

import { useRef, useState } from "react";
import {
  profileDetailsSchema,
  projectSchema,
  otherLinkSchema,
  normalizeProfileLink,
  safeProfileHref,
  roles,
  levels,
  type ProfileProject,
  type ProfileImport,
} from "@repo/shared";
import { Pencil, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, ErrorState } from "@/components/common";
import { authClient } from "@/lib/auth-client";
import { useUserProfile } from "@/lib/profile";
import {
  useProfileChange,
  requireUnchanged,
  type ProfileChange,
} from "@/lib/profile-edit";
import {
  ProfileEditor,
  type EditorField,
  type ProfileEditorSpec,
} from "@/components/profile-editor";
import { ImportPanel } from "@/components/onboarding/import-panel";
import {
  ImportReview,
  mergeSuggestions,
  suggestionKeys,
} from "@/components/onboarding/profile-review";
import { cn } from "@/lib/utils";

const definitions = {
  name: { label: "Name", maxLength: 80, required: true },
  headline: { label: "Headline", maxLength: 120 },
  about: { label: "About", maxLength: 1500, multiline: true },
  location: { label: "Location", maxLength: 120 },
  role: { label: "Role", options: roles },
  level: { label: "Experience", options: levels },
  goal: { label: "Practice goal", maxLength: 500, multiline: true },
  stack: {
    label: "Technologies",
    multiline: true,
    hint: "Separate with commas.",
  },
  githubUrl: { label: "GitHub", maxLength: 2048 },
  linkedinUrl: { label: "LinkedIn", maxLength: 2048 },
  portfolioUrl: { label: "Portfolio", maxLength: 2048 },
} satisfies Record<string, Omit<EditorField, "key">>;
type Field = keyof typeof definitions;
const projectFields: EditorField[] = [
  { key: "name", label: "Project name", maxLength: 100, required: true },
  {
    key: "description",
    label: "Description",
    maxLength: 1000,
    multiline: true,
  },
  { key: "role", label: "Your role", maxLength: 100 },
  {
    key: "stack",
    label: "Technologies",
    multiline: true,
    hint: "Separate with commas.",
  },
  { key: "url", label: "Live URL", maxLength: 2048 },
  { key: "repositoryUrl", label: "Repository", maxLength: 2048 },
];
const linkFields: EditorField[] = [
  { key: "label", label: "Link label", maxLength: 40, required: true },
  { key: "url", label: "URL", maxLength: 2048, required: true },
];
const splitStack = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
const projectFrom = (values: Record<string, string>) =>
  projectSchema.parse({
    ...values,
    stack: splitStack(values.stack ?? ""),
    url: normalizeProfileLink(values.url ?? ""),
    repositoryUrl: normalizeProfileLink(values.repositoryUrl ?? ""),
  });

export function ProfileSummary() {
  const { data: session } = authClient.useSession();
  return session ? (
    <ProfileDetailsEditor key={session.user.id} userId={session.user.id} />
  ) : null;
}

function ProfileDetailsEditor({ userId }: { userId: string }) {
  const profile = useUserProfile();
  const change = useProfileChange(userId);
  const [editor, setEditor] = useState<ProfileEditorSpec | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [projectOpen, setProjectOpen] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [localImport, setLocalImport] = useState<ProfileImport | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const importSaving = useRef(false);
  const details = profile.data?.details;
  if (profile.isPending)
    return <Loading label="Loading your profile…" layout="profile" />;
  if (!profile.data || !details)
    return (
      <ErrorState
        title="We couldn’t load your profile"
        message="Try loading your saved profile again."
        retry={() => void profile.refetch()}
        retrying={profile.isFetching}
      />
    );
  const pending = localImport ?? profile.data.onboarding.pendingImport;
  const selection =
    selected ??
    profile.data.onboarding.importSelection ??
    (pending ? suggestionKeys(pending.suggestions) : []);
  const disabled =
    !!editor || change.isPending || importBusy || importOpen || !!pending;
  function finishEditor() {
    const id = editor?.id;
    setEditor(null);
    if (id)
      requestAnimationFrame(() => {
        (
          document.getElementById("edit-" + id) ??
          document.getElementById("profile-projects")
        )?.focus({ preventScroll: true });
      });
  }
  function begin(
    id: string,
    title: string,
    fields: EditorField[],
    initial: Record<string, string>,
    update: (values: Record<string, string>) => ProfileChange,
    destructive = false,
  ) {
    setAnnouncement("");
    setEditor({
      id,
      title,
      fields,
      initial,
      destructive,
      apply: async (values) => {
        await change.mutateAsync(update(values));
        setAnnouncement(destructive ? "Deleted." : title + " saved.");
      },
    });
  }
  function editField(key: Field) {
    if (!details) return;
    const baseline = details[key];
    begin(
      key,
      "Edit " + definitions[key].label.toLowerCase(),
      [{ key, ...definitions[key] }],
      {
        [key]: Array.isArray(baseline) ? baseline.join(", ") : baseline,
      },
      (values) => (latest) => {
        requireUnchanged(latest.details[key], baseline);
        const raw =
          key === "stack"
            ? splitStack(values[key] ?? "")
            : key.endsWith("Url")
              ? normalizeProfileLink(values[key] ?? "")
              : (values[key] ?? "");
        const value = profileDetailsSchema.shape[key].parse(raw);
        return { details: { ...latest.details, [key]: value } };
      },
    );
  }
  function editControl(
    id: string,
    label: string,
    onClick: () => void,
    text?: string,
  ) {
    return (
      <Button
        id={"edit-" + id}
        type="button"
        variant="ghost"
        size={text ? "xs" : "icon-xs"}
        className="shrink-0 text-link"
        disabled={disabled}
        aria-label={"Edit " + label.toLowerCase()}
        title={"Edit " + label.toLowerCase()}
        onClick={onClick}
      >
        {text === "Add" ? (
          <Plus className="size-3.5" aria-hidden="true" />
        ) : (
          <Pencil className="size-3.5" aria-hidden="true" />
        )}
        {text}
      </Button>
    );
  }
  function editorAt(id: string) {
    return editor?.id === id ? (
      <ProfileEditor
        key={id}
        spec={editor}
        busy={change.isPending}
        onDone={finishEditor}
      />
    ) : null;
  }
  function field(
    key: Field,
    mode: "default" | "prose" | "headline" | "link" = "default",
  ) {
    if (!details) return null;
    if (editor?.id === key)
      return <div data-profile-field={key}>{editorAt(key)}</div>;
    const value = details[key],
      label = definitions[key].label;
    if (
      !value.length &&
      (key === "headline" || key === "goal" || key === "location")
    )
      return (
        <div data-profile-field={key}>
          <Button
            id={"edit-" + key}
            variant="ghost"
            size="sm"
            className="-ml-3 font-normal text-link"
            disabled={disabled}
            aria-label={"Edit " + label.toLowerCase()}
            onClick={() => editField(key)}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {"Add " + label.toLowerCase()}
          </Button>
        </div>
      );
    if (mode === "headline")
      return (
        <div
          className="flex max-w-[65ch] items-start gap-2"
          data-profile-field={key}
        >
          <p className="min-w-0 flex-1 whitespace-pre-wrap type-prose">
            {value}
          </p>
          {editControl(key, label, () => editField(key))}
        </div>
      );
    if (mode === "link") {
      const href = safeProfileHref(typeof value === "string" ? value : "");
      return (
        <div
          className="flex items-center gap-3 border-b py-3"
          data-profile-field={key}
        >
          <span className="w-20 shrink-0 text-sm">{label}</span>
          <div className="min-w-0 flex-1">
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm text-link underline-offset-4 hover:underline"
              >
                {href.replace(/^https?:\/\//, "")}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
          {editControl(
            key,
            label,
            () => editField(key),
            value.length ? "Edit" : "Add",
          )}
        </div>
      );
    }
    return (
      <section className="space-y-3" data-profile-field={key}>
        <div className="flex items-center justify-between gap-3">
          {mode === "prose" ? (
            <h3 className="type-section-title">{label}</h3>
          ) : (
            <h4 className="text-sm font-normal text-muted-foreground">
              {label}
            </h4>
          )}
          {editControl(
            key,
            label,
            () => editField(key),
            mode === "prose" || !value.length
              ? value.length
                ? "Edit"
                : "Add"
              : undefined,
          )}
        </div>
        {key === "stack" ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Your technologies">
            {(expanded ? details.stack : details.stack.slice(0, 8)).map(
              (item) => (
                <li
                  key={item.toLowerCase()}
                  className="rounded-md bg-card px-2 py-1 text-xs text-secondary-foreground"
                >
                  {item}
                </li>
              ),
            )}
            {details.stack.length > 8 && (
              <li>
                <button
                  type="button"
                  className="min-h-7 px-1 text-xs text-link underline underline-offset-4"
                  aria-expanded={expanded}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded
                    ? "Less"
                    : "+" + (details.stack.length - 8) + " more"}
                </button>
              </li>
            )}
          </ul>
        ) : value.length ? (
          <p
            className={cn(
              "whitespace-pre-wrap break-words type-prose",
              mode === "default" && "font-medium",
            )}
          >
            {value}
          </p>
        ) : null}
      </section>
    );
  }
  function addProject() {
    begin(
      "new-project",
      "Add project",
      projectFields,
      {
        name: "",
        description: "",
        role: "",
        stack: "",
        url: "",
        repositoryUrl: "",
      },
      (values) => {
        const project = projectFrom(values);
        return (latest) => ({
          details: {
            ...latest.details,
            projects: [...latest.details.projects, project],
          },
        });
      },
    );
  }
  function projectField(index: number, key: keyof ProfileProject) {
    if (!details) return;
    const baseline = details.projects;
    const item = baseline[index]!;
    const definition = projectFields.find((field) => field.key === key)!;
    begin(
      "project-" + index + "-" + key,
      "Edit " + definition.label.toLowerCase(),
      [definition],
      {
        [key]: Array.isArray(item[key])
          ? item.stack.join(", ")
          : String(item[key]),
      },
      (values) => (latest) => {
        requireUnchanged(latest.details.projects, baseline);
        const raw =
          key === "stack"
            ? splitStack(values[key] ?? "")
            : key === "url" || key === "repositoryUrl"
              ? normalizeProfileLink(values[key] ?? "")
              : (values[key] ?? "");
        const value = projectSchema.shape[key].parse(raw);
        return {
          details: {
            ...latest.details,
            projects: latest.details.projects.map((project, i) =>
              i === index ? { ...project, [key]: value } : project,
            ),
          },
        };
      },
    );
  }
  function removeProject(index: number) {
    if (!details) return;
    const baseline = details.projects;
    begin(
      "delete-project-" + index,
      "Delete " + (baseline[index]?.name || "project"),
      [],
      {},
      () => (latest) => {
        requireUnchanged(latest.details.projects, baseline);
        return {
          details: {
            ...latest.details,
            projects: latest.details.projects.filter((_, i) => i !== index),
          },
        };
      },
      true,
    );
  }
  function editLink(index?: number) {
    if (!details) return;
    const baseline = details.otherLinks;
    begin(
      index === undefined ? "new-link" : "link-" + index,
      index === undefined ? "Add link" : "Edit link",
      linkFields,
      index === undefined ? { label: "", url: "" } : { ...baseline[index]! },
      (values) => {
        const link = otherLinkSchema.parse({
          label: values.label,
          url: normalizeProfileLink(values.url ?? ""),
        });
        return (latest) => {
          if (index !== undefined)
            requireUnchanged(latest.details.otherLinks, baseline);
          return {
            details: {
              ...latest.details,
              otherLinks:
                index === undefined
                  ? [...latest.details.otherLinks, link]
                  : latest.details.otherLinks.map((item, i) =>
                      i === index ? link : item,
                    ),
            },
          };
        };
      },
    );
  }
  function removeLink(index: number) {
    if (!details) return;
    const baseline = details.otherLinks;
    begin(
      "delete-link-" + index,
      "Delete " + baseline[index]!.label,
      [],
      {},
      () => (latest) => {
        requireUnchanged(latest.details.otherLinks, baseline);
        return {
          details: {
            ...latest.details,
            otherLinks: latest.details.otherLinks.filter((_, i) => i !== index),
          },
        };
      },
      true,
    );
  }
  async function storeImport(result: ProfileImport, keys: string[]) {
    setImportError("");
    try {
      await change.mutateAsync((latest) => {
        if (latest.onboarding.pendingImport)
          requireUnchanged(latest.onboarding.pendingImport, result);
        return {
          details: latest.details,
          onboarding: {
            ...latest.onboarding,
            pendingImport: result,
            importSelection: keys,
          },
        };
      });
    } catch {
      setImportError(
        "Couldn’t save the import draft. Keep this page open and retry.",
      );
    }
  }
  async function closeImport(apply: boolean) {
    if (importSaving.current || importBusy || !pending) {
      if (!pending && !importBusy) setImportOpen(false);
      return;
    }
    importSaving.current = true;
    setImportError("");
    try {
      const result = pending;
      await change.mutateAsync((latest) => {
        if (latest.onboarding.pendingImport)
          requireUnchanged(latest.onboarding.pendingImport, result);
        return {
          details: apply
            ? mergeSuggestions(latest.details, result.suggestions, selection)
            : latest.details,
          onboarding: {
            ...latest.onboarding,
            pendingImport: null,
            importSelection: undefined,
          },
        };
      });
      setLocalImport(null);
      setSelected(null);
      setImportOpen(false);
      setAnnouncement(
        apply ? "Selected profile details imported." : "Import discarded.",
      );
      requestAnimationFrame(() =>
        document
          .getElementById("profile-import-open")
          ?.focus({ preventScroll: true }),
      );
    } catch {
      setImportError(
        "Couldn’t save the import. Your selections are kept. Try again.",
      );
    } finally {
      importSaving.current = false;
    }
  }
  return (
    <div className="space-y-9">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="mt-1 grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-lg font-medium text-accent-foreground"
        >
          {details.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || <Plus />}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {editor?.id === "name" ? (
            editorAt("name")
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 break-words text-[28px] leading-tight font-semibold tracking-[-0.025em]">
                {details.name || "Your profile"}
              </h2>
              {editControl("name", "Name", () => editField("name"))}
            </div>
          )}
          {field("headline", "headline")}
        </div>
        <Button
          id="profile-import-open"
          variant="ghost"
          size="sm"
          className="text-link"
          disabled={disabled}
          onClick={() => setImportOpen(true)}
        >
          <Upload className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Import profile</span>
          <span className="sr-only sm:hidden">Import profile</span>
        </Button>
      </div>
      {(importOpen || pending) && (
        <section
          aria-labelledby="profile-import-title"
          className="border-y py-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 id="profile-import-title" className="type-section-title">
              {pending ? "Review suggestions" : "Import profile"}
            </h3>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Close import"
              disabled={importBusy || change.isPending}
              onClick={() => void closeImport(false)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {pending ? (
            <>
              <ImportReview
                result={pending}
                selection={selection}
                onSelection={(keys) => {
                  setSelected(keys);
                  void storeImport(pending, keys);
                }}
              />
              {importError && (
                <p role="alert" className="mt-4 text-sm text-destructive-text">
                  {importError}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  loading={change.isPending}
                  loadingLabel="Saving import…"
                  disabled={!selection.length}
                  onClick={() => void closeImport(true)}
                >
                  Apply selected
                </Button>
                <Button
                  variant="ghost"
                  disabled={change.isPending}
                  onClick={() => void closeImport(false)}
                >
                  Discard
                </Button>
                {importError && (
                  <Button
                    variant="outline"
                    disabled={change.isPending}
                    onClick={() => void storeImport(pending, selection)}
                  >
                    Retry draft save
                  </Button>
                )}
              </div>
            </>
          ) : (
            <ImportPanel
              compact
              onBusy={setImportBusy}
              onResult={(result) => {
                setImportBusy(false);
                setLocalImport(result);
                const keys = suggestionKeys(result.suggestions);
                setSelected(keys);
                void storeImport(result, keys);
              }}
            />
          )}
        </section>
      )}
      <div className="profile-grid">
        <div className="min-w-0 space-y-8">
          {field("about", "prose")}
          {field("location")}
          <section aria-labelledby="profile-projects" className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h3
                id="profile-projects"
                tabIndex={-1}
                className="type-section-title outline-none"
              >
                Projects
              </h3>
              <Button
                id="edit-new-project"
                variant="ghost"
                size="xs"
                className="text-link"
                disabled={disabled || details.projects.length >= 10}
                onClick={addProject}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add project
              </Button>
            </div>
            {editorAt("new-project")}
            {details.projects.length === 0 && (
              <p className="type-ui text-muted-foreground">
                Add a project to give the interviewer more context.
              </p>
            )}
            <ul className="divide-y">
              {details.projects.map((project, index) => (
                <li key={index} className="py-5 first:pt-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="min-w-0 break-words text-base font-medium">
                      {project.name || "Untitled project"}
                    </h4>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-link"
                      disabled={!!editor || change.isPending}
                      aria-label={"Edit project " + (project.name || index + 1)}
                      aria-expanded={projectOpen === index}
                      onClick={() =>
                        setProjectOpen(projectOpen === index ? null : index)
                      }
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      {projectOpen === index ? "Close" : "Edit"}
                    </Button>
                  </div>
                  {projectOpen === index ? (
                    <div className="space-y-5 pt-3">
                      {projectFields.map((definition) => {
                        const id = "project-" + index + "-" + definition.key;
                        const value =
                          project[definition.key as keyof ProfileProject];
                        return (
                          <div key={id}>
                            {editor?.id === id ? (
                              editorAt(id)
                            ) : (
                              <>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-sm text-muted-foreground">
                                    {definition.label}
                                  </span>
                                  {editControl(
                                    id,
                                    definition.label,
                                    () =>
                                      projectField(
                                        index,
                                        definition.key as keyof ProfileProject,
                                      ),
                                    value.length ? "Edit" : "Add",
                                  )}
                                </div>
                                {value.length ? (
                                  <p className="whitespace-pre-wrap break-words type-prose">
                                    {Array.isArray(value)
                                      ? value.join(", ")
                                      : value}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {editor?.id === "delete-project-" + index ? (
                        editorAt(editor.id)
                      ) : (
                        <Button
                          id={"edit-delete-project-" + index}
                          variant="ghost"
                          size="sm"
                          className="text-destructive-text"
                          disabled={disabled}
                          onClick={() => removeProject(index)}
                        >
                          Delete project
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words type-prose text-muted-foreground">
                        {project.description}
                      </p>
                      {(project.role || project.stack.length > 0) && (
                        <p className="mt-3 break-words type-caption text-muted-foreground">
                          {[project.role, project.stack.join(", ")]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {[
                        ["Live project", project.url],
                        ["Repository", project.repositoryUrl],
                      ].some(([, url]) => safeProfileHref(url)) && (
                        <div className="mt-3 flex flex-wrap gap-4">
                          {[
                            ["Live project", project.url],
                            ["Repository", project.repositoryUrl],
                          ].map(([label, url]) =>
                            safeProfileHref(url) ? (
                              <a
                                key={label}
                                href={safeProfileHref(url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-link underline-offset-4 hover:underline"
                              >
                                {label}
                                <span className="sr-only">
                                  {" "}
                                  (opens in a new tab)
                                </span>
                              </a>
                            ) : null,
                          )}
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="profile-links">
            <h3 id="profile-links" className="mb-3 type-section-title">
              Links
            </h3>
            {field("githubUrl", "link")}
            {field("linkedinUrl", "link")}
            {field("portfolioUrl", "link")}
            {details.otherLinks.map((link, index) => (
              <div key={index} className="border-b py-3">
                {editor?.id === "link-" + index ||
                editor?.id === "delete-link-" + index ? (
                  editorAt(editor.id)
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{link.label}</span>
                    <a
                      href={safeProfileHref(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 break-all text-sm text-link"
                    >
                      {link.url}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    {editControl("link-" + index, link.label, () =>
                      editLink(index),
                    )}
                    <Button
                      id={"edit-delete-link-" + index}
                      variant="ghost"
                      size="icon-xs"
                      disabled={disabled}
                      aria-label={"Delete " + link.label}
                      onClick={() => removeLink(index)}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3">
              {editor?.id === "new-link" ? (
                editorAt("new-link")
              ) : (
                <Button
                  id="edit-new-link"
                  variant="ghost"
                  size="sm"
                  className="-ml-3 text-link"
                  disabled={disabled || details.otherLinks.length >= 8}
                  onClick={() => editLink()}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add another link
                </Button>
              )}
            </div>
          </section>
        </div>
        <aside
          aria-labelledby="profile-practice"
          className="min-w-0 space-y-6 border-l pl-6"
        >
          <h3 id="profile-practice" className="type-section-title">
            Practice
          </h3>
          {field("role")}
          {field("level")}
          {field("goal")}
          {field("stack")}
        </aside>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
