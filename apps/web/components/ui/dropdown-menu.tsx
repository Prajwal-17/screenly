"use client";

import type { ComponentProps } from "react";
import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;
export function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-[60] min-w-56 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
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
      className={cn(
        "flex min-h-11 cursor-pointer md:min-h-10 [@media(pointer:coarse)]:min-h-11 items-center gap-2.5 rounded-md px-2.5 text-[13px] outline-none select-none focus:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
export function DropdownMenuSeparator() {
  return <Primitive.Separator className="my-1.5 h-px bg-border" />;
}
export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <Primitive.Label className="px-2.5 py-2 text-[11px] font-medium text-muted-foreground">
      {children}
    </Primitive.Label>
  );
}
