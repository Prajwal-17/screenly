"use client";

import type { ComponentProps } from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export const DropdownMenuRadioGroup = Primitive.RadioGroup;
export function DropdownMenuRadioItem({
  children,
  className,
  ...props
}: ComponentProps<typeof Primitive.RadioItem>) {
  return (
    <Primitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md py-2 pr-2.5 pl-8 text-[13px] outline-none select-none focus:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex size-4 items-center justify-center">
        <Primitive.ItemIndicator>
          <Check className="size-3.5" />
        </Primitive.ItemIndicator>
      </span>
      {children}
    </Primitive.RadioItem>
  );
}
export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-[60] min-w-56 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl outline-none duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}
export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex min-h-11 cursor-pointer md:min-h-9 [@media(pointer:coarse)]:min-h-11 items-center gap-2.5 rounded-md px-2.5 text-[13px] outline-none select-none focus:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator() {
  return (
    <Primitive.Separator
      data-slot="dropdown-menu-separator"
      className="my-1.5 h-px bg-border"
    />
  );
}
export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2.5 py-2 type-caption font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
