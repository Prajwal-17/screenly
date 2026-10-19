"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { projectSchema, type ProfileProject } from "@repo/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function ProfileField({
  id,
  label,
  value,
  onChange,
  error,
  multiline = false,
  maxLength = 120,
  placeholder,
  optional = false,
  onBlur,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  optional?: boolean;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  const props = {
    id,
    value,
    maxLength,
    placeholder,
    disabled,
    onBlur,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {multiline ? (
        <Textarea {...props} rows={3} />
      ) : (
        <Input
          {...props}
          autoComplete={id === "profile-name" ? "name" : "off"}
        />
      )}{" "}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
const common = ["TypeScript", "React", "Node.js", "Python", "SQL", "AWS"];
export function StackEditor({
  value,
  onChange,
  id = "profile-stack",
  suggestions = true,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  suggestions?: boolean;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  function add(text = input) {
    const next = [
      ...new Map(
        [
          ...value,
          ...text
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        ].map((x) => [x.toLowerCase(), x]),
      ).values(),
    ];
    if (next.length > 30 || next.some((x) => x.length > 40)) {
      setError("Use up to 30 technologies, each at most 40 characters.");
      return;
    }
    onChange(next);
    setInput("");
    setError("");
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((item) => (
          <Button
            key={item}
            type="button"
            variant="secondary"
            size="sm"
            className="max-w-full bg-accent text-accent-foreground"
            onClick={() => onChange(value.filter((x) => x !== item))}
            aria-label={`Remove ${item}`}
            disabled={disabled}
          >
            <span className="break-all">{item}</span>
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        ))}
        <div className="flex min-w-[200px] flex-1 gap-2">
          <Input
            id={id}
            aria-label="Add a technology"
            value={input}
            maxLength={200}
            placeholder="Add a technology"
            disabled={disabled}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              }
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Add technology"
            disabled={disabled || !input.trim()}
            onClick={() => add()}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {suggestions && (
        <div className="flex flex-wrap gap-2">
          {common
            .filter(
              (x) => !value.some((y) => x.toLowerCase() === y.toLowerCase()),
            )
            .map((item) => (
              <Button
                type="button"
                key={item}
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => add(item)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {item}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
export function ProjectEditor({
  project,
  onChange,
  onClose,
}: {
  project: ProfileProject | null;
  onChange: (project: ProfileProject) => void;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  function done() {
    const result = projectSchema.safeParse(project);
    if (result.success) {
      setErrors({});
      onClose();
    } else
      setErrors(
        Object.fromEntries(
          result.error.issues.map((x) => [String(x.path[0]), x.message]),
        ),
      );
  }
  const field = (
    key: "name" | "description" | "role" | "url" | "repositoryUrl",
    label: string,
    multiline = false,
  ) => (
    <ProfileField
      id={`project-${key}`}
      label={label}
      value={project?.[key] ?? ""}
      onChange={(value) => {
        if (project) onChange({ ...project, [key]: value });
        setErrors((prior) => ({ ...prior, [key]: "" }));
      }}
      maxLength={
        key === "description"
          ? 1000
          : key === "url" || key === "repositoryUrl"
            ? 2048
            : 100
      }
      multiline={multiline}
      error={errors[key]}
      optional={key !== "name"}
    />
  );
  return (
    <Dialog
      open={!!project}
      onOpenChange={(open) => {
        if (!open) {
          setErrors({});
          onClose();
        }
      }}
      title="Project details"
      description="Your changes save as you type."
      className="top-[max(16px,4dvh)] max-h-[92dvh] max-w-[640px]"
    >
      {project && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            done();
          }}
        >
          <div className="space-y-5 px-5 pb-5">
            {field("name", "Project name")}
            {field("description", "What did you build?", true)}
            {field("role", "Your contribution")}
            <div className="grid gap-5 sm:grid-cols-2">
              {field("url", "Live URL")}
              {field("repositoryUrl", "GitHub repository")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-stack">Technologies</Label>
              <StackEditor
                id="project-stack"
                value={project.stack}
                onChange={(stack) => onChange({ ...project, stack })}
                suggestions={false}
              />
            </div>
          </div>
          <div className="sticky bottom-0 flex justify-end border-t bg-card p-4">
            <Button type="submit">Done</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
