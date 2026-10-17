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
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { PageTitle, InlineAlert } from "@/components/common";
import { ChoiceGroup, ChoiceLabel } from "@/components/form-choices";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <PageTitle title="New interview" />
      <form
        onSubmit={form.handleSubmit((v) => {
          if (!mutation.isPending) mutation.mutate(v);
        })}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(250px,1fr)]"
      >
        <Card className="gap-0 divide-y py-0">
          <CardContent className="py-6">
            <FieldSet>
              <FieldLegend className="font-heading text-lg tracking-[-0.01em]">
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
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FieldSet>
          </CardContent>
          <CardContent className="py-6">
            <FieldSet>
              <FieldLegend className="font-heading text-lg tracking-[-0.01em]">
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
          </CardContent>
          <CardContent className="py-6">
            <FieldSet
              aria-describedby={
                form.formState.errors.topics ? "topics-error" : "topics-hint"
              }
            >
              <FieldLegend className="font-heading text-lg tracking-[-0.01em]">
                Topics{" "}
                <span
                  id="topics-hint"
                  className="ml-2 font-sans text-xs font-normal tracking-normal text-muted-foreground"
                >
                  Choose 1–6
                </span>
              </FieldLegend>
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
          </CardContent>
          <CardContent className="py-6">
            <FieldSet>
              <FieldLegend className="font-heading text-lg tracking-[-0.01em]">
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
                        className="px-4"
                      >
                        {duration} minutes
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </FieldSet>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Session summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <dl className="space-y-3 text-[13px]">
                {[
                  ["Role", values.role],
                  ["Experience", values.level],
                  ["Duration", `${values.duration} minutes`],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-3" key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 text-right wrap-anywhere">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {values.topics?.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Check your microphone or choose typed answers before starting.
            </p>
            {capabilities.data && !capabilities.data.llm && (
              <InlineAlert variant="warning">
                The interviewer is unavailable. You can save your setup and
                return later.
              </InlineAlert>
            )}
            {mutation.error && (
              <InlineAlert>{mutation.error.message}</InlineAlert>
            )}
            <Button className="w-full" loading={mutation.isPending}>
              <ArrowRight aria-hidden="true" />
              Continue to setup check
            </Button>
          </CardContent>
        </Card>
      </form>
    </Workspace>
  );
}
