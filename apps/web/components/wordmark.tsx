import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 font-sans text-xl leading-none font-semibold tracking-[-0.04em] text-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="size-7 shrink-0 text-primary"
        aria-hidden="true"
        data-slot="screenly-mark"
      >
        <path
          d="M42 5H19C10.7 5 4 11.7 4 20s6.7 15 15 15h6l8-8H19a7 7 0 0 1 0-14h15L42 5Z"
          fill="currentColor"
        />
        <path
          d="M6 43h23c8.3 0 15-6.7 15-15s-6.7-15-15-15h-6l-8 8h14a7 7 0 0 1 0 14H14l-8 8Z"
          fill="currentColor"
        />
      </svg>
      <span className="sr-only">Screenly</span>
      <span aria-hidden="true">screenly</span>
    </span>
  );
}
