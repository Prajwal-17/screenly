"use client";
import { useEffect, useRef } from "react";
import type { InterviewMessage } from "@repo/shared";
export function TranscriptMessage({ message }: { message: InterviewMessage }) {
  return (
    <div
      className={`transcript-message ${message.role === "user" ? "candidate" : ""}`}
    >
      <div
        className={`eyebrow ${message.role === "assistant" ? "accent" : ""}`}
      >
        {message.role === "assistant" ? "Interviewer" : "You"}
        {message.status === "interrupted" ? " · interrupted" : ""}
      </div>
      <p>{message.content}</p>
    </div>
  );
}
export function LiveTranscript({
  messages,
  streaming,
  partial,
}: {
  messages: InterviewMessage[];
  streaming: string;
  partial: string;
}) {
  const transcript = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    if (transcript.current && follow.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages, streaming, partial]);
  return (
    <section className="surface transcript-panel" aria-label="Conversation">
      <div className="between">
        <h2 style={{ fontSize: 17 }}>Conversation</h2>
        <span className="tag">{messages.length} turns</span>
      </div>
      <div
        className="transcript-list"
        ref={transcript}
        role="log"
        aria-label="Saved conversation"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          follow.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <
            80;
        }}
      >
        {messages.length === 0 && !streaming && (
          <p>Waiting for the first question…</p>
        )}
        {messages.map((message) => (
          <TranscriptMessage key={message.id} message={message} />
        ))}
        {streaming && (
          <div className="transcript-message" aria-hidden="true">
            <div className="eyebrow accent">Interviewer · responding</div>
            <p>{streaming}</p>
          </div>
        )}
        {partial && (
          <div
            className="transcript-message candidate partial"
            aria-hidden="true"
          >
            <div className="eyebrow">You · transcribing</div>
            <p>{partial}</p>
          </div>
        )}
      </div>
    </section>
  );
}
