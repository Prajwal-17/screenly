"use client";

import type { ComponentProps } from "react";
import { Tooltip as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function TooltipProvider({
  delayDuration = 350,
  ...props
}: ComponentProps<typeof Primitive.Provider>) {
  return <Primitive.Provider delayDuration={delayDuration} {...props} />;
}

export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 10,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-[70] max-w-64 rounded-lg bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 duration-100 max-[1024px]:hidden",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
