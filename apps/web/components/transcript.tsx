"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, ArrowDown, CornerDownLeft } from "lucide-react";
import type { InterviewMessage } from "@repo/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function MessageBubble({
  role,
  content,
  createdAt,
  interrupted = false,
  live = false,
}: {
  role: InterviewMessage["role"];
  content: string;
  createdAt?: number;
  interrupted?: boolean;
  live?: boolean;
}) {
  const candidate = role === "user";
  const Icon = candidate ? Mic : AudioLines;
  const date = createdAt == null ? null : new Date(createdAt);
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2.5",
        candidate && "flex-row-reverse",
      )}
      data-speaker={role}
    >
      <span
        className={cn(
          "mt-1 grid size-8 shrink-0 place-items-center rounded-full",
          candidate
            ? "bg-candidate-surface text-candidate"
            : "bg-accent text-accent-foreground",
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div
        className={cn(
          "min-w-0 max-w-[calc(100%-2.75rem)] flex-1",
          candidate && "flex flex-col items-end",
        )}
      >
        <div
          className={cn(
            "mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-normal text-muted-foreground",
            candidate && "justify-end",
          )}
        >
          <span className="font-medium text-foreground">
            {candidate ? "You" : "Interviewer"}
            {live ? (candidate ? " · transcribing" : " · responding") : ""}
          </span>
          {date && (
            <time dateTime={date.toISOString()} className="tabular-nums">
              {date.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          )}
          {interrupted && (
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="size-3" aria-hidden="true" />
              Interrupted
            </span>
          )}
        </div>
        <div
          className={cn(
            "min-w-0 max-w-full rounded-xl border px-3.5 py-3",
            candidate
              ? "rounded-tr-sm border-transparent bg-candidate-surface/60"
              : "rounded-tl-sm bg-card",
            live && "border-dashed border-input",
          )}
        >
          <p className="max-w-[75ch] text-[15px] leading-[1.7] whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TranscriptMessage({ message }: { message: InterviewMessage }) {
  return (
    <MessageBubble
      role={message.role}
      content={message.content}
      createdAt={message.createdAt}
      interrupted={message.status === "interrupted"}
    />
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
  const content = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [atLatest, setAtLatest] = useState(true);
  useEffect(() => {
    if (transcript.current && follow.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages, streaming, partial]);
  useEffect(() => {
    const viewport = transcript.current;
    const turns = content.current;
    if (!viewport || !turns) return;
    const observer = new ResizeObserver(() => {
      if (follow.current) viewport.scrollTop = viewport.scrollHeight;
    });
    observer.observe(viewport);
    observer.observe(turns);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      role="region"
      aria-label="Conversation"
    >
      <div className="flex items-center justify-between border-b bg-muted/60 px-5 py-3">
        <p className="text-xs text-muted-foreground">Read-only conversation</p>
        <Badge variant="outline" className="bg-card">
          {messages.length} {messages.length === 1 ? "turn" : "turns"}
        </Badge>
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={transcript}
          className="h-full min-h-0 overflow-y-auto overscroll-contain p-4 outline-offset-[-4px] sm:p-5 focus-visible:outline-2 focus-visible:outline-ring"
          role="log"
          aria-label="Saved conversation"
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
          onScroll={(event) => {
            const el = event.currentTarget;
            const latest =
              el.scrollHeight - el.scrollTop - el.clientHeight < 64;
            follow.current = latest;
            setAtLatest(latest);
          }}
        >
          <div
            ref={content}
            className="flex min-w-0 flex-col gap-6 pb-12 [&>div]:shrink-0"
          >
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                <AudioLines className="size-6" aria-hidden="true" />
                <p className="max-w-[28ch] text-sm">
                  Your conversation will appear here when the interview begins.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <TranscriptMessage key={message.id} message={message} />
            ))}
            {streaming && (
              <div aria-hidden="true" data-live-message="interviewer">
                <MessageBubble role="assistant" content={streaming} live />
              </div>
            )}
            {partial && (
              <div aria-hidden="true" data-live-message="candidate">
                <MessageBubble role="user" content={partial} live />
              </div>
            )}
          </div>
        </div>
        {!atLatest && (
          <div className="absolute right-0 bottom-4 left-0 flex justify-center px-4">
            <Button
              variant="outline"
              size="sm"
              className="bg-card shadow-sm"
              onClick={() => {
                follow.current = true;
                setAtLatest(true);
                if (transcript.current)
                  transcript.current.scrollTop =
                    transcript.current.scrollHeight;
              }}
            >
              <ArrowDown />
              Jump to latest
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
