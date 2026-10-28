"use client";
import {
  Loader2,
  ArrowRight,
  Trash2,
  CircleAlert,
  TriangleAlert,
  Check,
  AudioLines,
  History,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Interview } from "@repo/shared";
import { cn } from "@/lib/utils";
import { formatDate, interviewLink } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function PageIntro({
  description,
  action,
  className,
}: {
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  if (!description && !action) return null;
  return (
    <div
      className={cn(
        "mb-7 flex flex-wrap items-center justify-between gap-4 sm:mb-8",
        className,
      )}
    >
      {description && (
        <p className="max-w-[65ch] text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-5 py-5" role="status">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        {label}
      </div>
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-52" aria-hidden="true" />
    </div>
  );
}
export function ErrorState({
  message,
  retry,
  title = "Could not load this page",
  retryLabel = "Try again",
  retrying = false,
  action,
}: {
  message: string;
  retry?: () => void;
  title?: string;
  retryLabel?: string;
  retrying?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <Alert className="p-5 sm:p-6">
      <CircleAlert className="text-muted-foreground" aria-hidden="true" />
      <AlertTitle>
        <h2 className="text-base font-medium">{title}</h2>
      </AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {(retry || action) && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {retry && (
              <Button
                className="w-full sm:w-auto"
                onClick={retry}
                loading={retrying}
              >
                {retryLabel}
              </Button>
            )}
            {action}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function InlineAlert({
  children,
  variant = "destructive",
  className,
}: {
  children: React.ReactNode;
  variant?: "destructive" | "warning";
  className?: string;
}) {
  return (
    <Alert
      variant={variant}
      role={variant === "warning" ? "status" : "alert"}
      className={className}
    >
      {variant === "warning" ? (
        <TriangleAlert aria-hidden="true" />
      ) : (
        <CircleAlert aria-hidden="true" />
      )}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function EmptyState() {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center border-y px-5 py-8 text-center">
      <span className="mb-4 grid size-11 place-items-center text-muted-foreground">
        <AudioLines className="size-5" aria-hidden="true" />
      </span>
      <h3>No interviews yet</h3>

      <Button asChild size="sm" className="mt-5">
        <Link href="/interviews/new">
          New interview
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep it",
  onConfirm,
  pending,
  destructive = false,
}: {
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function InterviewRows({
  interviews,
  onDelete,
  deleting = false,
  compact = false,
}: {
  interviews: Interview[];
  onDelete?: (interview: Interview) => void;
  deleting?: boolean;
  compact?: boolean;
}) {
  if (!interviews.length) return <EmptyState />;
  if (compact)
    return (
      <ul className="divide-y border-t" aria-label="Recent interviews">
        {interviews.map((item) => (
          <li key={item.id}>
            <Link
              href={interviewLink(item)}
              className="flex items-center gap-3 py-4 text-sm transition-colors hover:bg-muted/50"
            >
              <History
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {item.role} · {item.level}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.topics.slice(0, 2).join(", ")} ·{" "}
                  {formatDate(item.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums">
                {item.status === "active"
                  ? "Resume"
                  : item.status === "draft"
                    ? "Continue setup"
                    : item.feedback?.overallScore != null
                      ? `${item.feedback.overallScore} / 10`
                      : "View"}
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            <TableHead className="pl-4 text-xs text-muted-foreground sm:pl-5">
              Interview
            </TableHead>
            <TableHead className="hidden w-32 text-xs text-muted-foreground lg:table-cell">
              Experience
            </TableHead>
            <TableHead className="hidden w-32 text-xs text-muted-foreground min-[1100px]:table-cell">
              Date
            </TableHead>
            <TableHead className="w-28 text-xs text-muted-foreground">
              Status / score
            </TableHead>
            {onDelete && (
              <TableHead className="w-14">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {interviews.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="py-4 pl-4 sm:pl-5">
                <Link
                  href={interviewLink(item)}
                  className="block rounded-sm text-sm font-medium hover:text-primary"
                >
                  {item.role} interview
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {item.topics.slice(0, 3).join(" · ")}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground min-[1100px]:hidden">
                    {formatDate(item.createdAt)}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">
                  {item.level}
                </span>
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground tabular-nums min-[1100px]:table-cell">
                {formatDate(item.createdAt)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    item.status === "completed"
                      ? "success"
                      : item.status === "active"
                        ? "warning"
                        : "info"
                  }
                >
                  {item.status === "completed" ? (
                    <>
                      <Check aria-hidden="true" />
                      <span className="sr-only">Completed: </span>
                      {item.feedback?.overallScore != null
                        ? `${item.feedback.overallScore}/10`
                        : "Completed"}
                    </>
                  ) : item.status === "active" ? (
                    "Resume"
                  ) : (
                    "Ready"
                  )}
                </Badge>
              </TableCell>
              {onDelete && (
                <TableCell className="pr-3 text-right">
                  <ConfirmAction
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:bg-destructive-surface hover:text-destructive"
                        aria-label={`Delete ${item.role} interview`}
                        disabled={deleting}
                      >
                        <Trash2 />
                      </Button>
                    }
                    title="Delete interview?"
                    description="This removes the session, its conversation, and feedback from your history. This cannot be undone."
                    confirmLabel="Delete interview"
                    destructive
                    pending={deleting}
                    onConfirm={() => onDelete(item)}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
