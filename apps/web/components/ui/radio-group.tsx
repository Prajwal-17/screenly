"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  variant?: "default" | "segment";
}) {
  if (variant === "segment") {
    return (
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        className={cn(
          "relative flex min-h-11 min-w-0 items-center justify-center border-r bg-card px-2 text-xs font-medium outline-none transition-colors last:border-r-0 hover:bg-muted focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-muted data-[state=checked]:ring-1 data-[state=checked]:ring-inset data-[state=checked]:ring-choice-border sm:text-sm",
          className,
        )}
        {...props}
      >
        {children}
      </RadioGroupPrimitive.Item>
    );
  }
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:ring-offset-0 group-has-[:focus-visible]/field-label:not-data-[state=checked]:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 focus-visible:ring-offset-focus-offset disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive  data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground group-has-[:focus-visible]/field-label:data-[state=checked]:border-primary",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
