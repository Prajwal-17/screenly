"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, ArrowDown, CornerDownLeft } from "lucide-react";
import type { InterviewMessage } from "@repo/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
            ? "bg-muted text-muted-foreground"
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
            "min-w-0 max-w-full rounded-xl border px-4 py-3",
            candidate
              ? "rounded-tr-sm border-transparent bg-muted"
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
    <Card
      role="region"
      aria-label="Conversation"
      className="gap-0 overflow-hidden py-0"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg">Conversation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Read along as you speak.
          </p>
        </div>
        <Badge variant="outline">
          {messages.length} {messages.length === 1 ? "turn" : "turns"}
        </Badge>
      </CardHeader>
      <CardContent className="relative px-0">
        <div
          ref={transcript}
          className="flex h-[360px] min-w-0 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-6 outline-offset-[-4px] [scrollbar-width:thin] sm:px-5 lg:h-[clamp(360px,64dvh,640px)] focus-visible:outline-2 focus-visible:outline-ring [&>div]:shrink-0"
          role="log"
          aria-label="Saved conversation"
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
          onScroll={(event) => {
            const element = event.currentTarget;
            const latest =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              64;
            follow.current = latest;
            setAtLatest(latest);
          }}
        >
          <div
            ref={content}
            className="flex min-w-0 flex-col gap-6 [&>div]:shrink-0"
          >
            {messages.length === 0 && !streaming && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <AudioLines className="size-6" aria-hidden="true" />
                <p className="max-w-[26ch] text-sm">
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
      </CardContent>
    </Card>
  );
}
