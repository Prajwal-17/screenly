"use client";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useInterviewStore } from "@/store/interviewStore";
type Draft = { id: string; text: string };
// Keep reconnect drafts even when the browser blocks session storage.
const drafts = new Map<string, Draft>();
export function AnswerComposer({
  interviewId,
  onSubmit,
}: {
  interviewId: string;
  onSubmit: (id: string, text: string) => void;
}) {
  const key = `screenly-answer:${interviewId}`;
  const { connected, status, submitting, savedAnswerId } = useInterviewStore();
  const [draft, setDraft] = useState<Draft>(() => {
    const remembered = drafts.get(interviewId);
    if (remembered) return remembered;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (typeof saved?.id === "string" && typeof saved?.text === "string")
        return saved;
    } catch {
      /* In-memory editing still works if storage is unavailable. */
    }
    return { id: crypto.randomUUID(), text: "" };
  });
  useEffect(() => {
    if (savedAnswerId !== draft.id) return;
    drafts.delete(interviewId);
    setDraft({ id: crypto.randomUUID(), text: "" });
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* Storage is optional. */
    }
  }, [savedAnswerId, draft.id, key, interviewId]);
  return (
    <Card>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              connected &&
              status === "listening" &&
              !submitting &&
              draft.text.trim()
            )
              onSubmit(draft.id, draft.text.trim());
          }}
        >
          <Field>
            <FieldLabel
              htmlFor="answer"
              className="text-xs tracking-normal text-muted-foreground"
            >
              Your answer
            </FieldLabel>
            <Textarea
              id="answer"
              aria-label="Your interview answer"
              aria-describedby="answer-hint"
              placeholder="Explain your approach…"
              className="min-h-36 resize-y leading-[1.7]"
              maxLength={12000}
              value={draft.text}
              disabled={submitting}
              onChange={(event) => {
                const next = { ...draft, text: event.target.value };
                drafts.set(interviewId, next);
                setDraft(next);
                try {
                  sessionStorage.setItem(key, JSON.stringify(next));
                } catch {
                  /* Keep the draft in memory. */
                }
              }}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span
              id="answer-hint"
              className="text-xs text-muted-foreground"
              role="status"
            >
              {!connected
                ? "Reconnect to send. Your draft is kept."
                : submitting
                  ? "Saving answer…"
                  : `${draft.text.length.toLocaleString()} / 12,000`}
            </span>
            <Button
              loading={submitting}
              disabled={
                !connected ||
                status !== "listening" ||
                submitting ||
                !draft.text.trim()
              }
            >
              <Send aria-hidden="true" />
              Send answer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
