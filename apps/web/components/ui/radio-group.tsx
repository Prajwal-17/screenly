"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { Check } from "lucide-react";

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
  icon,
  description,
  children,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  variant?: "default" | "segment" | "row" | "option";
  icon?: React.ReactNode;
  description?: React.ReactNode;
}) {
  if (variant === "option") {
    return (
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        className={cn(
          "group/option flex min-h-16 min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left outline-none transition-colors duration-150 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-muted-foreground data-[state=checked]:[&>svg]:text-accent-foreground",
          className,
        )}
        {...props}
      >
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block type-ui font-medium">{children}</span>
          {description && (
            <span className="mt-0.5 block type-caption text-muted-foreground group-data-[state=checked]/option:text-accent-foreground">
              {description}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-full border border-input text-accent-foreground group-data-[state=checked]/option:border-current"
        >
          <RadioGroupPrimitive.Indicator>
            <Check className="size-3.5" />
          </RadioGroupPrimitive.Indicator>
        </span>
      </RadioGroupPrimitive.Item>
    );
  }
  if (variant === "row") {
    return (
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        className={cn(
          "group/radio-row flex min-h-11 min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left type-ui text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 disabled:pointer-events-none disabled:text-disabled-foreground data-[state=checked]:bg-accent data-[state=checked]:font-medium data-[state=checked]:text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        )}
        {...props}
      >
        {children}
        <RadioGroupPrimitive.Indicator className="ml-auto shrink-0">
          <Check className="size-3.5" aria-hidden="true" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
    );
  }
  if (variant === "segment") {
    return (
      <RadioGroupPrimitive.Item
        data-slot="radio-group-item"
        className={cn(
          "relative flex min-h-11 min-w-0 items-center justify-center border-r bg-card px-2 text-xs font-medium outline-none transition-colors last:border-r-0 hover:bg-muted focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:ring-1 data-[state=checked]:ring-inset data-[state=checked]:ring-choice-border sm:text-sm",
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
