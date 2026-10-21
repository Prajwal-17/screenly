"use client";

import { memo } from "react";
import { AudioLines, Mic, CornerDownLeft, X } from "lucide-react";
import type { InterviewMessage } from "@repo/shared";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
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

const TranscriptLine = memo(function TranscriptLine({
  message,
  live = false,
}: {
  message: Pick<InterviewMessage, "role" | "content"> &
    Partial<InterviewMessage>;
  live?: boolean;
}) {
  const candidate = message.role === "user";
  return (
    <Message
      from={message.role}
      className={candidate ? "max-w-[90%]" : "max-w-full"}
      data-speaker={message.role}
      role="article"
      aria-label={candidate ? "Your message" : "AI message"}
    >
      <MessageContent>
        {candidate ? (
          <p className="text-sm leading-[1.75] whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <MessageResponse
            mode={live ? "streaming" : "static"}
            isAnimating={live}
            controls={false}
            className="text-sm leading-[1.75]"
          >
            {message.content}
          </MessageResponse>
        )}
      </MessageContent>
      {message.status === "interrupted" && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <CornerDownLeft className="size-3" aria-hidden="true" />
          Interrupted
        </span>
      )}
    </Message>
  );
});

export function LiveTranscript({
  messages,
  streaming,
  partial,
  onClose,
  fit = false,
}: {
  messages: InterviewMessage[];
  streaming: string;
  partial: string;
  onClose?: () => void;
  fit?: boolean;
}) {
  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col", fit && "h-full")}
      role="region"
      aria-label="Conversation"
    >
      <div
        data-slot="transcript-heading"
        className={cn(
          "flex shrink-0 items-center justify-between gap-3",
          fit ? "pb-3" : "pb-5",
        )}
      >
        <h2 className="text-base font-medium">Transcript</h2>
        <div className="flex items-center gap-1.5">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close transcript"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <Conversation
        className={cn(
          "min-h-0",
          fit ? "h-full" : "h-[min(66dvh,680px)] flex-none",
        )}
      >
        <ConversationContent
          data-slot="transcript-content"
          viewportClassName="pt-1 pr-2"
          className={cn(
            "min-w-0 gap-5 p-0 [&>div]:shrink-0",
            fit ? "pb-2" : "pb-12",
          )}
        >
          {messages.length === 0 && !streaming && (
            <ConversationEmptyState
              className={cn(
                "text-muted-foreground",
                fit ? "px-0 py-4" : "px-0 py-16",
              )}
            >
              <AudioLines className="size-6" aria-hidden="true" />
              <p className="max-w-[28ch] text-sm">
                Your conversation will appear here when the interview begins.
              </p>
            </ConversationEmptyState>
          )}
          {messages.map((message) => (
            <TranscriptLine key={message.id} message={message} />
          ))}
          {streaming && (
            <div aria-hidden="true" data-live-message="interviewer">
              <TranscriptLine
                message={{ role: "assistant", content: streaming }}
                live
              />
            </div>
          )}
          {partial && (
            <div aria-hidden="true" data-live-message="candidate">
              <TranscriptLine
                message={{ role: "user", content: partial }}
                live
              />
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </section>
  );
}
