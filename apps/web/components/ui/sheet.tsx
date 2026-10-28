"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  side = "right",
  className,
  showHeader = true,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  side?: "left" | "right";
  className?: string;
  showHeader?: boolean;
  onCloseAutoFocus?: React.ComponentProps<
    typeof Dialog.Content
  >["onCloseAutoFocus"];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed inset-y-0 z-50 flex w-[min(480px,100%)] flex-col bg-card shadow-xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            side === "right"
              ? "right-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
              : "left-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
            className,
          )}
        >
          <div
            className={
              showHeader
                ? "flex min-h-20 shrink-0 items-center justify-between gap-4 border-b px-5"
                : "sr-only"
            }
          >
            <div>
              <Dialog.Title className="text-base font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </Dialog.Description>
            </div>
            {showHeader && (
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Close ${title.toLowerCase()}`}
                >
                  <X />
                </Button>
              </Dialog.Close>
            )}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
