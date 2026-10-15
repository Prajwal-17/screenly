import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
const buttonVariants = cva("button", {
  variants: {
    variant: { default: "", outline: "secondary", secondary: "secondary", ghost: "ghost", destructive: "danger", link: "text-link" },
    size: { default: "", xs: "min-h-6 px-2 text-xs", sm: "min-h-8 px-3 text-xs", lg: "min-h-12 px-6", icon: "icon-button", "icon-xs": "icon-button size-6", "icon-sm": "icon-button size-8", "icon-lg": "icon-button size-12" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
function Button({ className, variant = "default", size = "default", asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" data-variant={variant} data-size={size} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { Button, buttonVariants };
