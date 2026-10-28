import type { ReactNode } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InterviewNotice({
  children,
  action,
  warning = false,
}: {
  children: ReactNode;
  action: ReactNode;
  warning?: boolean;
}) {
  const Icon = warning ? TriangleAlert : CircleAlert;
  return (
    <Alert
      variant="default"
      role={warning ? "status" : "alert"}
      className="@container mx-auto max-w-4xl min-w-0 gap-x-3 px-4 py-3 [&>svg]:row-span-1 [&>svg]:self-center [&>svg]:translate-y-0"
      data-interview-notice=""
    >
      <Icon
        aria-hidden="true"
        className={warning ? "text-warning!" : "text-destructive!"}
      />
      <AlertDescription className="flex min-w-0 flex-col items-start gap-3 text-foreground @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:gap-5">
        <p className="mb-0! min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]">
          {children}
        </p>
        <div className="w-full shrink-0 [&>button]:w-full @min-[640px]:w-auto @min-[640px]:[&>button]:w-auto">
          {action}
        </div>
      </AlertDescription>
    </Alert>
  );
}
