"use client";
import { Loader2, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Interview } from "@repo/shared";
import { formatDate, interviewLink } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function Eyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium tracking-widest text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div>
        <h1>{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-4 py-8" role="status">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not load this page</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
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
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function EmptyState() {
  return (
    <Card>
      <CardContent className="py-6 text-center">
        <h3>No interviews yet</h3>
        <p className="mt-2 mb-5 text-muted-foreground">
          Choose a focus to start practicing.
        </p>
        <Button asChild>
          <Link href="/interviews/new">
            New interview <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
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
}: {
  interviews: Interview[];
  onDelete?: (interview: Interview) => void;
  deleting?: boolean;
}) {
  if (!interviews.length) return <EmptyState />;
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6">Interview</TableHead>
            <TableHead className="hidden lg:table-cell">Experience</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead>Status / score</TableHead>
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
              <TableCell className="py-5 pl-6">
                <Link
                  className="block rounded-sm font-medium hover:text-primary"
                  href={interviewLink(item)}
                >
                  {item.role} interview
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {item.topics.slice(0, 3).join(" · ")}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline">{item.level}</Badge>
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground tabular-nums md:table-cell">
                {formatDate(item.createdAt)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={item.status === "completed" ? "success" : "warning"}
                >
                  {item.status === "completed"
                    ? item.feedback?.overallScore != null
                      ? `${item.feedback.overallScore}/10`
                      : "Completed"
                    : item.status === "active"
                      ? "Resume"
                      : "Ready"}
                </Badge>
              </TableCell>
              {onDelete && (
                <TableCell className="pr-4 text-right">
                  <ConfirmAction
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive-soft hover:text-destructive"
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
    </Card>
  );
}
