"use client";
import { FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
export function ChoiceLabel({
  className,
  ...props
}: React.ComponentProps<typeof FieldLabel>) {
  return (
    <FieldLabel
      className={cn(
        "flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-secondary-hover active:bg-secondary-active has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground has-[[data-state=checked]]:hover:bg-accent-hover has-[[data-state=checked]]:active:bg-accent-active has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-3 has-[:focus-visible]:ring-offset-focus-offset",
        className,
      )}
      {...props}
    />
  );
}
export function ChoiceGroup({
  name,
  label,
  options,
  value,
  onValueChange,
  onBlur,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <RadioGroup
      name={name}
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      onBlur={onBlur}
      className="flex flex-wrap gap-2"
    >
      <>
        {options.map((option) => (
          <ChoiceLabel
            key={option}
            htmlFor={`${name}-${encodeURIComponent(option)}`}
          >
            <RadioGroupItem
              id={`${name}-${encodeURIComponent(option)}`}
              value={option}
            />
            {option}
          </ChoiceLabel>
        ))}
      </>
    </RadioGroup>
  );
}
