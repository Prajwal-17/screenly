"use client";
import { useEffect, useRef } from "react";
import type { InterviewMessage } from "@repo/shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/common";
import { cn } from "@/lib/utils";
export function TranscriptMessage({ message }: { message: InterviewMessage }) {
  return (
    <div
      className={cn(
        "text-[13px]",
        message.role === "user" && "rounded-md bg-muted/70 px-4 py-3.5",
      )}
    >
      <Eyebrow
        className={cn(
          "mb-2 block text-[10px]",
          message.role === "assistant" && "text-primary",
        )}
      >
        {message.role === "assistant" ? "Interviewer" : "You"}
        {message.status === "interrupted" ? " · interrupted" : ""}
      </Eyebrow>
      <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
    <Card role="region" aria-label="Conversation">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <h2 className="text-lg">Conversation</h2>
        <Badge variant="outline">{messages.length} turns</Badge>
      </CardHeader>
      <CardContent>
        <div
          ref={transcript}
          className="flex h-[360px] flex-col gap-6 overflow-y-auto overscroll-contain rounded-sm pr-1 outline-offset-4 [scrollbar-width:thin] lg:h-[clamp(360px,61vh,700px)] focus-visible:outline-2 focus-visible:outline-ring"
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
            <p className="text-muted-foreground">
              Waiting for the first question…
            </p>
          )}
          {messages.map((message) => (
            <TranscriptMessage key={message.id} message={message} />
          ))}
          {streaming && (
            <div aria-hidden="true" className="text-[13px]">
              <Eyebrow className="mb-2 block text-[10px] text-primary">
                Interviewer · responding
              </Eyebrow>
              <p className="leading-relaxed whitespace-pre-wrap">{streaming}</p>
            </div>
          )}
          {partial && (
            <div
              aria-hidden="true"
              className="rounded-md bg-muted/70 px-4 py-3.5 text-[13px] text-muted-foreground italic"
            >
              <Eyebrow className="mb-2 block text-[10px]">
                You · transcribing
              </Eyebrow>
              <p className="leading-relaxed whitespace-pre-wrap">{partial}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
