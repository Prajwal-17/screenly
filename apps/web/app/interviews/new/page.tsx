"use client";
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
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { PageTitle, Reveal } from "@/components/common";
import { api } from "@/lib/api";
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
        <PageTitle
          eyebrow="Make it yours"
          title="What’s your next challenge?"
          description="A few choices to shape a conversation around you."
        />
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="setup-layout"
        >
          <div className="surface">
            <fieldset
              className="setup-section"
              style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }}
            >
              <legend className="sr-only">Your role</legend>
              <h3>01 · Choose your role</h3>
              <p>Focus on the work you want to do.</p>
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
            <fieldset
              className="setup-section"
              style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }}
            >
              <legend className="sr-only">Experience level</legend>
              <h3>02 · Set the depth</h3>
              <p>Questions will adapt to your answers along the way.</p>
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
              style={{ borderLeft: 0, borderRight: 0, borderTop: 0, margin: 0 }}
            >
              <legend className="sr-only">Interview topics</legend>
              <h3>03 · Pick your focus</h3>
              <p>Select one to six topics you’d like to explore.</p>
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
                <p className="accent" role="alert" style={{ marginTop: 12 }}>
                  {form.formState.errors.topics.message}
                </p>
              )}
            </fieldset>
            <fieldset
              className="setup-section"
              style={{ border: 0, margin: 0 }}
            >
              <legend className="sr-only">Duration</legend>
              <h3>04 · Make some time</h3>
              <p>A focused session that fits your day.</p>
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
            <div>
              <div className="eyebrow accent">Your session</div>
              <h2 style={{ marginTop: 13 }}>
                A conversation
                <br />
                with a direction.
              </h2>
            </div>
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
              <p style={{ fontSize: 12 }}>
                You’ll check your microphone before the interview begins.
              </p>
            </div>
            <div style={{ fontSize: 12 }}>
              <div className="check-row">
                <Check size={14} className="accent" />
                Questions that follow your answers
              </div>
              <div className="check-row">
                <Check size={14} className="accent" />A transcript you can
                revisit
              </div>
              <div className="check-row">
                <Check size={14} className="accent" />
                Feedback with a clear next step
              </div>
            </div>
            {capabilities.data && !capabilities.data.llm && (
              <div className="notice">
                The interviewer needs its LLM configuration before a live
                session can begin. You can still prepare your session.
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
              Prepare my interview
            </button>
          </aside>
        </form>
      </Reveal>
    </Workspace>
  );
}
