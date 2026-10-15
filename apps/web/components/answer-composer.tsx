"use client";
import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
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
    <form
      className="surface answer-composer"
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
      <label htmlFor="answer" className="eyebrow">
        Your answer
      </label>
      <textarea
        id="answer"
        className="input"
        aria-label="Your interview answer"
        placeholder="Explain your approach…"
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
      <div className="between">
        <small>
          {!connected
            ? "Reconnect to send. Your draft is kept."
            : submitting
              ? "Saving answer…"
              : `${draft.text.length.toLocaleString()} / 12,000`}
        </small>
        <button
          className="button"
          disabled={
            !connected ||
            status !== "listening" ||
            submitting ||
            !draft.text.trim()
          }
        >
          {submitting ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <Send size={16} />
          )}
          Send answer
        </button>
      </div>
    </form>
  );
}
