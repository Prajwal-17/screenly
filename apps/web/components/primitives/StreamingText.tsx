"use client";

// Adapted from https://www.beautifului.dev/r/streaming-text.json.
// Full readable text with a visual speaking highlight; this never controls audio.
import type { CSSProperties } from "react";
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
      className={cn(
        "text-[15px] leading-[1.75] text-ink-secondary",
        isStreaming && styles.speaking,
        className,
      )}
      data-slot="streaming-text"
      data-speaking={isStreaming}
      aria-live="off"
    >
      {content.map((token, index) => (
        <span
          key={token.id ?? `${index}:${token.text}`}
          className={styles.word}
          style={{ "--word-index": index } as CSSProperties}
        >
          {token.text}
        </span>
      ))}
    </p>
  );
}
