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
        "flex w-fit cursor-pointer items-center gap-2 rounded-md border bg-card min-h-11 px-3 py-2.5 text-[13px] font-normal text-muted-foreground transition-colors hover:border-primary/50 has-[[data-state=checked]]:border-primary/60 has-[[data-state=checked]]:bg-accent has-[[data-state=checked]]:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40",
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
