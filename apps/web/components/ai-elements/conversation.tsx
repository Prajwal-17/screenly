"use client";

// Adapted from AI Elements: https://elements.ai-sdk.dev/components/conversation

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="instant"
    resize="instant"
    {...props}
  />
);

// Expose the actual scroll viewport for keyboard access and log announcements.
export type ConversationContentProps = ComponentProps<"div"> & {
  viewportClassName?: string;
};

export const ConversationContent = ({
  className,
  viewportClassName,
  ...props
}: ConversationContentProps) => {
  const { scrollRef, contentRef, scrollToBottom, state } =
    useStickToBottomContext();
  const following = useRef(true);
  const measured = useRef({ width: 0, height: 0, content: 0 });
  const frame = useRef(0);
  const followBottom = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport || !following.current) return;
    state.scrollTop = viewport.scrollHeight;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (following.current) scrollToBottom({ animation: "instant" });
    });
  }, [scrollRef, scrollToBottom, state]);
  useEffect(() => {
    const viewport = scrollRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    // The library observes content growth. The studio also resizes its viewport
    // when rotating or opening panels, even when the content height is unchanged.
    const observer = new ResizeObserver(() => {
      measured.current = {
        width: viewport.clientWidth,
        height: viewport.clientHeight,
        content: viewport.scrollHeight,
      };
      followBottom();
    });
    observer.observe(viewport);
    observer.observe(content);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [scrollRef, contentRef, followBottom]);
  return (
    <div
      ref={scrollRef}
      role="log"
      aria-label="Saved conversation"
      aria-live="polite"
      aria-relevant="additions"
      tabIndex={0}
      onScroll={(event) => {
        const viewport = event.currentTarget;
        const reflowed =
          measured.current.width !== viewport.clientWidth ||
          measured.current.height !== viewport.clientHeight ||
          measured.current.content !== viewport.scrollHeight;
        measured.current = {
          width: viewport.clientWidth,
          height: viewport.clientHeight,
          content: viewport.scrollHeight,
        };
        // Resize can clamp scrollTop before observers run; it is not a reader
        // scrolling back. Ordinary scroll events still release follow.
        if (reflowed && following.current) followBottom();
        else
          following.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            64;
      }}
      className={cn(
        "h-full min-h-0 overflow-y-auto overscroll-contain outline-offset-[-4px] focus-visible:outline-2 focus-visible:outline-ring",
        viewportClassName,
      )}
    >
      <div
        ref={contentRef}
        className={cn("flex flex-col gap-8 p-4", className)}
        {...props}
      />
    </div>
  );
};

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom({ animation: "instant" });
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 bg-card shadow-sm",
          className,
        )}
        onClick={handleScrollToBottom}
        size="sm"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
        Jump to latest
      </Button>
    )
  );
};
