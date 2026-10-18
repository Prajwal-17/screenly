"use client";

// Adapted from https://www.beautifului.dev/r/streaming-text.json.
// Reveal real incoming tokens; demo loops, sources, and chat actions do not belong in voice captions.
import { cn } from "@/lib/utils";
import styles from "./streaming-text.module.css";

export type StreamingToken = { text: string; id?: string };

export default function StreamingText({
  content,
  isStreaming = false,
  className,
}: {
  content: StreamingToken[];
  isStreaming?: boolean;
  className?: string;
}) {
  return (
    <p
      className={cn("text-[15px] leading-[1.75] text-ink-secondary", className)}
      data-slot="streaming-text"
      aria-live="off"
    >
      {content.map((token, index) => (
        <span
          key={token.id ?? `${index}:${token.text}`}
          className={styles.word}
        >
          {token.text}
        </span>
      ))}
      {isStreaming && <span className={styles.cursor} aria-hidden="true" />}
    </p>
  );
}
