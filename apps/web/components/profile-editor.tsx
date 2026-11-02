"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileConflict } from "@/lib/profile-edit";
import { cn } from "@/lib/utils";

export type EditorField = {
  key: string;
  label: string;
  maxLength?: number;
  multiline?: boolean;
  options?: readonly string[];
  hint?: string;
  required?: boolean;
};
export type ProfileEditorSpec = {
  id: string;
  title: string;
  fields: EditorField[];
  initial: Record<string, string>;
  apply: (values: Record<string, string>) => Promise<unknown>;
  destructive?: boolean;
};

export function ProfileEditor({
  spec,
  busy,
  onDone,
}: {
  spec: ProfileEditorSpec;
  busy: boolean;
  onDone: () => void;
}) {
  const [values, setValues] = useState(spec.initial);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const saving = useRef(false);
  const prefix = useId();
  useEffect(() => {
    form.current
      ?.querySelector<HTMLElement>("input, textarea, [role=combobox], button")
      ?.focus({ preventScroll: true });
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || busy || conflict) return;
    saving.current = true;
    setFields({});
    setError("");
    try {
      await spec.apply(values);
      onDone();
    } catch (cause) {
      if (cause instanceof ZodError) {
        const errors = Object.fromEntries(
          cause.issues.map((issue) => {
            const key = String(issue.path[0] ?? spec.fields[0]?.key ?? "value");
            return [
              spec.fields.some((field) => field.key === key)
                ? key
                : (spec.fields[0]?.key ?? key),
              issue.message,
            ];
          }),
        );
        setFields(errors);
        requestAnimationFrame(() => {
          const key = Object.keys(errors)[0] ?? spec.fields[0]?.key ?? "value";
          document
            .getElementById(prefix + "-" + key)
            ?.focus({ preventScroll: true });
        });
      } else {
        setConflict(cause instanceof ProfileConflict);
        setError(
          cause instanceof ProfileConflict
            ? cause.message
            : "Couldn’t save. Try again.",
        );
      }
    } finally {
      saving.current = false;
    }
  }
  return (
    <form
      ref={form}
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (
          event.key === "Escape" &&
          !event.defaultPrevented &&
          !busy &&
          !saving.current
        ) {
          event.preventDefault();
          onDone();
        }
      }}
      aria-label={spec.title}
      className="profile-form space-y-4"
      noValidate
    >
      {spec.destructive && <p className="type-label">{spec.title}?</p>}
      {spec.fields.map((field) => {
        const id = prefix + "-" + field.key;
        const error = fields[field.key];
        const description = [
          error ? id + "-error" : "",
          field.hint ? id + "-hint" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const common = {
          id,
          value: values[field.key] ?? "",
          disabled: busy,
          "aria-invalid": !!error,
          "aria-describedby": description || undefined,
        };
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={id}>{field.label}</Label>
            {field.options ? (
              <Select
                value={values[field.key] || undefined}
                onValueChange={(value) => {
                  setValues((prior) => ({ ...prior, [field.key]: value }));
                  setFields({});
                }}
                disabled={busy}
              >
                <SelectTrigger {...common} className="w-full">
                  <SelectValue
                    placeholder={"Select " + field.label.toLowerCase()}
                  />
                </SelectTrigger>
                <SelectContent className={cn("profile-surface")}>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.multiline ? (
              <Textarea
                {...common}
                rows={field.key === "about" ? 5 : 3}
                maxLength={field.maxLength}
                onChange={(event) => {
                  setValues((prior) => ({
                    ...prior,
                    [field.key]: event.target.value,
                  }));
                  setFields({});
                }}
              />
            ) : (
              <Input
                {...common}
                required={field.required}
                maxLength={field.maxLength}
                autoComplete={field.key === "name" ? "name" : "off"}
                onChange={(event) => {
                  setValues((prior) => ({
                    ...prior,
                    [field.key]: event.target.value,
                  }));
                  setFields({});
                }}
              />
            )}
            {field.hint && (
              <p
                id={id + "-hint"}
                className="type-caption text-muted-foreground"
              >
                {field.hint}
              </p>
            )}
            {error && (
              <p
                id={id + "-error"}
                role="alert"
                className="text-sm text-destructive-text"
              >
                {error}
              </p>
            )}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-sm text-destructive-text">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          variant={spec.destructive ? "destructive" : "default"}
          loading={busy}
          loadingLabel="Saving…"
          disabled={conflict}
        >
          {spec.destructive ? "Delete" : error ? "Retry" : "Save"}
        </Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
