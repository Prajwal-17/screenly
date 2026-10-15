"use client";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  roles,
  levels,
  topics,
  settingsSchema,
  type InterviewSettings,
} from "@repo/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { PageTitle, Reveal } from "@/components/common";
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
      <Reveal>
        <PageTitle title="New interview" />
        <form
          onSubmit={form.handleSubmit((v) => {
            if (!mutation.isPending) mutation.mutate(v);
          })}
          className="setup-layout"
        >
          <div className="surface">
            <fieldset className="setup-section">
              <legend className="sr-only">Role</legend>
              <h3>Role</h3>
              <div className="choices">
                {roles.map((role) => (
                  <label key={role} className="choice">
                    <input
                      type="radio"
                      value={role}
                      {...form.register("role")}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="setup-section">
              <legend className="sr-only">Experience</legend>
              <h3>Experience</h3>
              <div className="choices">
                {levels.map((level) => (
                  <label key={level} className="choice">
                    <input
                      type="radio"
                      value={level}
                      {...form.register("level")}
                    />
                    {level}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset
              className="setup-section"
              aria-describedby={
                form.formState.errors.topics ? "topics-error" : undefined
              }
            >
              <legend className="sr-only">Topics</legend>
              <h3>
                Topics{" "}
                <small
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-body)",
                    letterSpacing: 0,
                  }}
                >
                  Choose 1–6
                </small>
              </h3>
              <div className="choices">
                {topics.map((topic) => (
                  <label key={topic} className="choice">
                    <input
                      type="checkbox"
                      value={topic}
                      {...form.register("topics")}
                    />
                    {topic}
                  </label>
                ))}
              </div>
              {form.formState.errors.topics && (
                <p
                  id="topics-error"
                  className="error"
                  role="alert"
                  style={{ marginTop: 16 }}
                >
                  {form.formState.errors.topics.message}
                </p>
              )}
            </fieldset>
            <fieldset className="setup-section">
              <legend className="sr-only">Duration</legend>
              <h3>Duration</h3>
              <div className="choices">
                {([10, 20, 30] as const).map((duration) => (
                  <button
                    type="button"
                    key={duration}
                    className={`choice ${values.duration === duration ? "selected" : ""}`}
                    aria-pressed={values.duration === duration}
                    onClick={() => form.setValue("duration", duration)}
                  >
                    {duration} minutes
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <aside className="surface pad stack">
            <h2>Session summary</h2>
            <div>
              <div className="summary-line">
                <span>Role</span>
                <span>{values.role}</span>
              </div>
              <div className="summary-line">
                <span>Experience</span>
                <span>{values.level}</span>
              </div>
              <div className="summary-line">
                <span>Duration</span>
                <span>{values.duration} minutes</span>
              </div>
              <div className="summary-topics">
                {values.topics?.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <p style={{ fontSize: 12 }}>
              Check your microphone or choose typed answers before starting.
            </p>
            {capabilities.data && !capabilities.data.llm && (
              <div className="notice">
                The interviewer is unavailable. You can save your setup and
                return later.
              </div>
            )}
            {mutation.error && (
              <div className="error" role="alert">
                {mutation.error.message}
              </div>
            )}
            <button className="button" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              Continue to setup check
            </button>
          </aside>
        </form>
      </Reveal>
    </Workspace>
  );
}
