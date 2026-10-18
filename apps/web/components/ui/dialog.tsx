"use client";

import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  focusRef,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  focusRef?: React.RefObject<HTMLElement | null>;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-50 bg-foreground/25 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Primitive.Content
          onOpenAutoFocus={(event) => {
            onOpenAutoFocus?.(event);
            if (focusRef?.current && !event.defaultPrevented) {
              event.preventDefault();
              focusRef.current.focus();
            }
          }}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed top-[min(18vh,140px)] left-1/2 z-50 max-h-[75dvh] w-[calc(100%_-_32px)] max-w-[540px] -translate-x-1/2 overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
            <div>
              <Primitive.Title className="text-base font-semibold">
                {title}
              </Primitive.Title>
              <Primitive.Description className="mt-1 text-xs text-muted-foreground">
                {description}
              </Primitive.Description>
            </div>
            <Primitive.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-2 -mr-2"
                aria-label={`Close ${title.toLowerCase()}`}
              >
                <X className="size-4" />
              </Button>
            </Primitive.Close>
          </div>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
