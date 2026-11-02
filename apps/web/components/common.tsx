"use client";
import {
  RefreshCw,
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
export { Loading } from "@/components/loading-state";
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
  title,
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  if (!title && !description && !action) return null;
  return (
    <div
      className={cn(
        "mb-7 flex flex-wrap items-center justify-between gap-4 sm:mb-8",
        className,
      )}
    >
      <div className="min-w-0">
        {title && <h2 className="type-page-title">{title}</h2>}
        {description && (
          <p
            className={cn(
              "max-w-[65ch] type-ui text-muted-foreground",
              title && "mt-2",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="ml-auto">{action}</div>}
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
    <Alert className="max-w-3xl gap-x-3 p-5 sm:p-6 [overflow-wrap:anywhere]">
      <CircleAlert className="text-destructive-text" aria-hidden="true" />
      <AlertTitle>
        <h2 className="type-subsection-title">{title}</h2>
      </AlertTitle>
      <AlertDescription>
        <p className="max-w-[65ch] leading-relaxed">{message}</p>
        {(retry || action) && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {retry && (
              <Button
                className="w-full sm:w-auto"
                onClick={retry}
                loading={retrying}
                aria-label={retryLabel}
                loadingLabel="Trying again…"
              >
                <RefreshCw aria-hidden="true" />
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
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  variant?: "destructive" | "warning";
  className?: string;
}) {
  return (
    <Alert
      variant={variant}
      role={variant === "warning" ? "status" : "alert"}
      className={cn("min-w-0 [overflow-wrap:anywhere]", className)}
    >
      {variant === "warning" ? (
        <TriangleAlert aria-hidden="true" />
      ) : (
        <CircleAlert aria-hidden="true" />
      )}
      <AlertDescription className="min-w-0">
        {children}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </AlertDescription>
    </Alert>
  );
}
export function RefreshNotice({
  message,
  retry,
  retrying = false,
}: {
  message: string;
  retry: () => void;
  retrying?: boolean;
}) {
  return (
    <div
      role="status"
      className="mb-5 flex min-w-0 flex-col items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 text-muted-foreground [overflow-wrap:anywhere]">
        {message}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={retry}
        loading={retrying}
        loadingLabel="Refreshing…"
        aria-label="Retry refresh"
      >
        <RefreshCw aria-hidden="true" />
        Retry refresh
      </Button>
    </div>
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
                  {formatDate(item.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums">
                {item.status === "active"
                  ? "Resume"
                  : item.status === "draft"
                    ? "Continue setup"
                    : item.review || item.feedback
                      ? "View review"
                      : "View transcript"}
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
            <TableHead className="w-40 text-xs text-muted-foreground">
              Status
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
                  className="block rounded-sm text-sm font-medium hover:text-link"
                >
                  {item.role} interview
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
                      ? "secondary"
                      : item.status === "active"
                        ? "warning"
                        : "info"
                  }
                >
                  {item.status === "completed" ? (
                    <>
                      <Check aria-hidden="true" />
                      <span className="sr-only">Completed: </span>
                      {item.review || item.feedback
                        ? "Review ready"
                        : item.feedbackStatus === "failed"
                          ? "Review failed"
                          : item.feedbackStatus === "generating" ||
                              item.feedbackStatus === "pending"
                            ? "Review pending"
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
                        className="hover:bg-destructive-surface hover:text-destructive-text"
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
