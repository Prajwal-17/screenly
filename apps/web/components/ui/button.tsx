import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex max-w-full shrink-0 items-center justify-center gap-2 rounded-md border border-transparent type-label whitespace-normal transition-[background-color,color,box-shadow,transform] duration-150 [&:active:not([aria-haspopup]):not(:disabled)]:scale-[0.98] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 focus-visible:ring-offset-focus-offset disabled:pointer-events-none disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        filter:
          "rounded-none border-b-2 border-b-transparent px-0 text-muted-foreground hover:text-foreground aria-pressed:border-b-primary aria-pressed:text-foreground aria-pressed:font-medium",
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active active:shadow-none",
        outline:
          "border-input/50 bg-card text-foreground shadow-sm hover:bg-secondary-hover active:bg-secondary-active",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active",
        ghost:
          "text-muted-foreground hover:bg-secondary-hover hover:text-foreground active:bg-secondary-active",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active",
        link: "rounded-sm text-link underline-offset-4 hover:text-link-hover hover:underline active:text-link-hover",
      },
      size: {
        default: "min-h-10 px-3.5 py-2 [@media(pointer:coarse)]:min-h-11",
        sm: "min-h-11 gap-2 px-3 py-2 sm:min-h-8 [@media(pointer:coarse)]:min-h-11",
        xs: "min-h-11 gap-1 px-2 py-1 text-xs sm:min-h-8 [@media(pointer:coarse)]:min-h-11",
        lg: "min-h-12 px-6 py-3",
        icon: "size-11 p-0",
        "icon-xs": "size-11 p-0 sm:size-8 [@media(pointer:coarse)]:size-11",
        "icon-sm": "size-11 p-0 sm:size-9 [@media(pointer:coarse)]:size-11",
        "icon-lg": "size-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingLabel?: string;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <Loader2
            className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="inline-flex min-w-0 items-center justify-center gap-2 [&>svg]:hidden">
            {loadingLabel ?? children}
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
export { Button, buttonVariants };
