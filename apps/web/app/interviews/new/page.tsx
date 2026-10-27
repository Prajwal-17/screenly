"use client";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  roles,
  levels,
  topics,
  settingsSchema,
  type InterviewSettings,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { InlineAlert } from "@/components/common";
import { ChoiceGroup, ChoiceLabel } from "@/components/form-choices";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUserProfile } from "@/lib/profile";
import { api } from "@/lib/api";
const roleTopics: Record<
  InterviewSettings["role"],
  InterviewSettings["topics"]
> = {
  Frontend: ["JavaScript", "React"],
  Backend: ["APIs", "Databases"],
  "Full-stack": ["System design", "APIs"],
};
export default function Setup() {
  const router = useRouter();
  const client = useQueryClient();
  const profile = useUserProfile();
  const appliedProfile = useRef(false);
  const form = useForm<InterviewSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      role: "Frontend",
      level: "Mid-level",
      topics: ["JavaScript", "React"],
      duration: 20,
    },
  });
  const { setValue } = form;
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get("role");
    const valid = roles.find((r) => r === role);
    if (valid) {
      setValue("role", valid);
      setValue("topics", roleTopics[valid]);
    }
  }, [setValue]);
  useEffect(() => {
    if (!profile.data || appliedProfile.current || form.formState.isDirty)
      return;
    appliedProfile.current = true;
    const explicitRole = roles.find(
      (role) =>
        role === new URLSearchParams(window.location.search).get("role"),
    );
    const role = explicitRole || profile.data.details.role;
    if (role) {
      setValue("role", role);
      setValue("topics", roleTopics[role]);
    }
    if (profile.data.details.level)
      setValue("level", profile.data.details.level);
  }, [profile.data, form, setValue]);
  const capabilities = useQuery({
    queryKey: ["capabilities"],
    queryFn: api.capabilities,
  });
  const mutation = useMutation({
    mutationFn: api.create,
    onSuccess: async (i) => {
      await client.invalidateQueries({ queryKey: ["interviews"] });
      router.push(`/interviews/${i.id}`);
    },
  });
  return (
    <Workspace>
      <form
        onSubmit={form.handleSubmit((v) => {
          if (!mutation.isPending) mutation.mutate(v);
        })}
        className="mx-auto w-full max-w-3xl space-y-7 sm:py-3"
      >
        <div
          role="group"
          aria-labelledby="role-label"
          className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-7"
        >
          <div id="role-label" className="text-sm font-medium sm:pt-3">
            Role
          </div>
          <Controller
            name="role"
            control={form.control}
            render={({ field }) => (
              <ChoiceGroup
                label="Role"
                name={field.name}
                options={roles}
                value={field.value}
                variant="segmented"
                onValueChange={(value) => {
                  field.onChange(value);
                  const role = roles.find((r) => r === value);
                  if (role)
                    form.setValue("topics", roleTopics[role], {
                      shouldValidate: true,
                    });
                }}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
        <div
          role="group"
          aria-labelledby="level-label"
          className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-7"
        >
          <div id="level-label" className="text-sm font-medium sm:pt-3">
            Experience
          </div>
          <Controller
            name="level"
            control={form.control}
            render={({ field }) => (
              <ChoiceGroup
                label="Experience"
                name={field.name}
                options={levels}
                value={field.value}
                variant="segmented"
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
        <div
          role="group"
          aria-labelledby="topics-label"
          aria-describedby={
            form.formState.errors.topics ? "topics-error" : "topics-hint"
          }
          className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-7"
        >
          <div>
            <div id="topics-label" className="text-sm font-medium sm:pt-3">
              Topics
            </div>
            <p id="topics-hint" className="mt-1 text-xs text-muted-foreground">
              Choose 1–6
            </p>
          </div>
          <div>
            <Controller
              name="topics"
              control={form.control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
                  {topics.map((topic) => (
                    <ChoiceLabel
                      key={topic}
                      htmlFor={`topic-${encodeURIComponent(topic)}`}
                      className="min-h-12 w-full rounded-none border-0 px-3 text-xs font-normal sm:px-4 sm:text-sm"
                    >
                      <Checkbox
                        id={`topic-${encodeURIComponent(topic)}`}
                        name={field.name}
                        value={topic}
                        checked={field.value.includes(topic)}
                        onBlur={field.onBlur}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked
                              ? [...field.value, topic]
                              : field.value.filter((t) => t !== topic),
                          )
                        }
                        aria-invalid={!!form.formState.errors.topics}
                        aria-describedby={
                          form.formState.errors.topics
                            ? "topics-error"
                            : "topics-hint"
                        }
                      />
                      {topic}
                    </ChoiceLabel>
                  ))}
                </div>
              )}
            />
            <FieldError
              id="topics-error"
              errors={[form.formState.errors.topics]}
            />
          </div>
        </div>
        <div
          role="group"
          aria-labelledby="duration-label"
          className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-7"
        >
          <div id="duration-label" className="text-sm font-medium sm:pt-3">
            Duration
          </div>
          <Controller
            name="duration"
            control={form.control}
            render={({ field }) => (
              <ToggleGroup
                type="single"
                variant="outline"
                aria-label="Duration"
                value={String(field.value)}
                onValueChange={(value) => {
                  if (value) field.onChange(Number(value));
                }}
                className="grid w-full grid-cols-3 gap-0 overflow-hidden rounded-lg border [&>button]:rounded-none [&>button]:border-0 [&>button]:border-r [&>button]:shadow-none [&>button:last-child]:border-r-0"
              >
                {[10, 20, 30].map((duration) => (
                  <ToggleGroupItem
                    key={duration}
                    value={String(duration)}
                    className="min-h-11 px-2 text-sm focus-visible:ring-inset data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-choice-border"
                  >
                    {duration} min
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
        </div>
        <div className="border-t pt-6">
          {capabilities.data && !capabilities.data.llm && (
            <InlineAlert variant="warning" className="mb-4">
              The interviewer is unavailable. You can save your setup and return
              later.
            </InlineAlert>
          )}
          {capabilities.error && (
            <InlineAlert variant="warning" className="mb-4">
              Service availability could not be checked. You can save your setup
              and check again before starting.
            </InlineAlert>
          )}
          {mutation.error && (
            <InlineAlert className="mb-4">{mutation.error.message}</InlineAlert>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mic className="size-4" aria-hidden="true" />
              Voice interview
            </span>
            <Button type="submit" loading={mutation.isPending}>
              Check microphone
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>
    </Workspace>
  );
}
