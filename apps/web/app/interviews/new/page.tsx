"use client";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  roles,
  levels,
  topics,
  settingsSchema,
  type InterviewSettings,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Mic, Clock3, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { PageIntro, InlineAlert } from "@/components/common";
import { ChoiceGroup, ChoiceLabel } from "@/components/form-choices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldSet, FieldLegend, FieldError } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const values = useWatch({ control: form.control });
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
      <PageIntro description="Make this practice session your own." />
      <form
        onSubmit={form.handleSubmit((v) => {
          if (!mutation.isPending) mutation.mutate(v);
        })}
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
      >
        <div className="min-w-0 rounded-xl border bg-card">
          <div className="border-b px-5 py-5 sm:px-6">
            <h2>What would you like to practice?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Questions adapt to your role, experience, and answers.
            </p>
          </div>
          <div className="space-y-7 p-5 sm:p-6">
            <FieldSet>
              <FieldLegend className="mb-3 text-sm font-medium">
                Role
              </FieldLegend>
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <ChoiceGroup
                    label="Role"
                    name={field.name}
                    options={roles}
                    value={field.value}
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
            </FieldSet>
            <FieldSet>
              <FieldLegend className="mb-3 text-sm font-medium">
                Experience
              </FieldLegend>
              <Controller
                name="level"
                control={form.control}
                render={({ field }) => (
                  <ChoiceGroup
                    label="Experience"
                    name={field.name}
                    options={levels}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FieldSet>
            <FieldSet
              aria-describedby={
                form.formState.errors.topics ? "topics-error" : "topics-hint"
              }
            >
              <FieldLegend className="mb-1 text-sm font-medium">
                Topics
              </FieldLegend>
              <p
                id="topics-hint"
                className="mb-3 text-xs text-muted-foreground"
              >
                Choose 1–6 topics to focus your conversation.
              </p>
              <Controller
                name="topics"
                control={form.control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <ChoiceLabel
                        key={topic}
                        htmlFor={`topic-${encodeURIComponent(topic)}`}
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
            </FieldSet>
            <FieldSet>
              <FieldLegend className="mb-3 text-sm font-medium">
                Duration
              </FieldLegend>
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
                    className="flex-wrap"
                  >
                    {[10, 20, 30].map((duration) => (
                      <ToggleGroupItem
                        key={duration}
                        value={String(duration)}
                        className="gap-2 px-4"
                      >
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        {duration} minutes
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </FieldSet>
          </div>
        </div>
        <aside
          className="rounded-xl border bg-card xl:sticky xl:top-24"
          aria-label="Session summary"
        >
          <div className="border-b px-5 py-5">
            <h2 className="text-base">Session summary</h2>
          </div>
          <div className="space-y-5 p-5">
            <dl className="space-y-3 text-xs">
              {[
                ["Role", values.role],
                ["Experience", values.level],
                ["Duration", `${values.duration} minutes`],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-4" key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 text-right font-medium wrap-anywhere">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-1.5">
              {values.topics?.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="bg-muted text-[11px] font-normal"
                >
                  {t}
                </Badge>
              ))}
            </div>
            <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
              <p className="flex gap-2">
                <Mic
                  className="mt-0.5 size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                Answer naturally, using your voice.
              </p>
              <p className="flex gap-2">
                <Check
                  className="mt-0.5 size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                Check your microphone before you begin.
              </p>
            </div>
            {capabilities.data && !capabilities.data.llm && (
              <InlineAlert variant="warning">
                The interviewer is unavailable. You can save your setup and
                return later.
              </InlineAlert>
            )}
            {capabilities.error && (
              <InlineAlert variant="warning">
                Service availability could not be checked. You can save your
                setup and check again before starting.
              </InlineAlert>
            )}
            {mutation.error && (
              <InlineAlert>{mutation.error.message}</InlineAlert>
            )}
            <Button className="w-full" loading={mutation.isPending}>
              Continue to setup check
              <ArrowRight aria-hidden="true" />
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Your interview clock hasn’t started yet.
            </p>
          </div>
        </aside>
      </form>
    </Workspace>
  );
}
