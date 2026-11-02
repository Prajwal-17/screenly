import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import setupStyles from "@/components/interview-setup.module.css";
import { Wordmark } from "@/components/wordmark";

export type LoadingLayout =
  | "content"
  | "dashboard"
  | "entry"
  | "history"
  | "onboarding"
  | "profile"
  | "memory"
  | "review"
  | "interview"
  | "settings"
  | "none";

function TextLines() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function Loading({
  label = "Loading…",
  layout = "content",
}: {
  label?: string;
  layout?: LoadingLayout;
}) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        layout === "entry" ? cn(setupStyles.page, "py-0") : "py-6",
      )}
      data-loading-layout={layout}
    >
      <p
        role="status"
        className={cn(
          "mb-6 flex items-center gap-2 type-ui text-muted-foreground",
          layout === "entry" && "sr-only",
        )}
      >
        <Loader2
          className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        {label}
      </p>
      <div aria-hidden="true">
        {layout === "dashboard" ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-6 border-b pb-8">
              <div className="w-2/3 space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-5">
                <Skeleton className="h-5 w-52" />
                <div className="space-y-5 rounded-xl border p-6">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-36" />
                </div>
              </div>
              <div className="space-y-5">
                <Skeleton className="h-5 w-32" />
                <TextLines />
              </div>
            </div>
            <div className="space-y-5 border-t pt-7">
              <Skeleton className="h-5 w-40" />
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="flex justify-between gap-5 border-b pb-4"
                >
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
        ) : layout === "history" ? (
          <div className="space-y-5">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-9 w-52" />
              <Skeleton className="h-9 w-64" />
            </div>
            <div className="divide-y border-y">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-6 py-6">
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="hidden h-4 w-28 sm:block" />
                  <Skeleton className="size-8" />
                </div>
              ))}
            </div>
          </div>
        ) : layout === "entry" ? (
          <div>
            <div className={setupStyles.header}>
              <Skeleton className="h-8 w-64" />
            </div>
            <div className={setupStyles.grid}>
              <div className={setupStyles.roles}>
                <Skeleton className="mb-3 h-6 w-36" />
                <div className={setupStyles.choices} data-loading-roles="">
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div
                      key={item}
                      className={cn(
                        setupStyles.roleOption,
                        "flex items-center gap-3 px-3 py-3",
                      )}
                    >
                      <Skeleton className="size-[18px] shrink-0" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="size-5 shrink-0 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
              <div className={setupStyles.brief}>
                <div>
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="mt-3 h-4 w-36" />
                </div>
                <Skeleton className="h-5 w-40" />
                <div className={setupStyles.goal}>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className={cn(setupStyles.goalInput, "w-full")} />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ) : layout === "memory" ? (
          <div className="max-w-3xl divide-y border-y">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex gap-6 py-6">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <TextLines />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="size-9" />
              </div>
            ))}
          </div>
        ) : layout === "onboarding" ? (
          <div className="max-w-2xl space-y-6">
            <Skeleton className="h-14 w-full" />
            {[0, 1].map((item) => (
              <div key={item} className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-28 w-full" />
            </div>
            <div className="flex justify-end border-t pt-5">
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
        ) : layout === "profile" ? (
          <div className="space-y-9">
            <div className="flex gap-4">
              <Skeleton className="size-14 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-9 w-56" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_264px]">
              <div className="space-y-8">
                <Skeleton className="h-6 w-24" />
                <TextLines />
                <div className="space-y-5 border-b py-6">
                  <Skeleton className="h-6 w-32" />
                  <TextLines />
                </div>
              </div>
              <div className="space-y-6 border-l pl-6">
                <Skeleton className="h-6 w-28" />
                {[0, 1, 2].map((row) => (
                  <div key={row} className="space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : layout === "review" ? (
          <div className="space-y-8">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5 border-y py-7">
                <Skeleton className="h-6 w-40" />
                <TextLines />
              </div>
              <div className="space-y-4 rounded-xl bg-muted p-6">
                <Skeleton className="h-5 w-32" />
                <TextLines />
                <Skeleton className="h-9 w-36" />
              </div>
            </div>
            <div className="max-w-3xl space-y-6">
              <Skeleton className="h-6 w-32" />
              <TextLines />
              <TextLines />
            </div>
          </div>
        ) : layout === "interview" ? (
          <div className="mx-auto max-w-2xl space-y-6 py-6">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-44" />
            <div className="border-y">
              <div className="flex justify-between gap-4 py-5">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-9 w-24" />
              </div>
              <div className="flex h-28 items-center justify-center">
                <Skeleton className="h-1 w-2/3" />
              </div>
              <div className="flex justify-between gap-4 border-t py-5">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div className="flex justify-between gap-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-11 w-40" />
            </div>
          </div>
        ) : layout === "settings" ? (
          <div className="max-w-3xl space-y-6">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-52" />
            <div className="grid gap-6 border-y py-7 lg:grid-cols-[200px_minmax(0,1fr)]">
              <Skeleton className="h-5 w-28" />
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((choice) => (
                  <Skeleton key={choice} className="h-11" />
                ))}
              </div>
            </div>
            <Skeleton className="h-11 w-28" />
            <div className="space-y-4 border-t pt-6">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ) : layout === "content" ? (
          <div className="max-w-3xl space-y-5">
            <Skeleton className="h-6 w-48" />
            <TextLines />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function routeLoading(path: string): {
  layout: LoadingLayout;
  label: string;
} {
  if (path === "/dashboard")
    return { layout: "dashboard", label: "Opening your workspace…" };
  if (path === "/history")
    return { layout: "history", label: "Loading your interviews…" };
  if (path === "/profile")
    return { layout: "profile", label: "Loading your profile…" };
  if (path === "/memory")
    return { layout: "memory", label: "Loading practice memory…" };
  if (path === "/settings")
    return { layout: "settings", label: "Loading your settings…" };
  if (path === "/interviews/new")
    return { layout: "entry", label: "Preparing your interview…" };
  if (path.endsWith("/feedback"))
    return { layout: "review", label: "Loading your interview review…" };
  return { layout: "interview", label: "Loading your interview…" };
}

export function WorkspacePlaceholder({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-dvh bg-sidebar p-2"
      data-workspace-placeholder=""
    >
      <div
        className="hidden w-[232px] shrink-0 flex-col pr-4 pb-3 md:flex"
        aria-hidden="true"
      >
        <div className="px-4 pt-4 pb-5">
          <Wordmark />
        </div>
        <div className="px-2 pb-4">
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-3 px-2">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-9 w-full" />
          ))}
        </div>
        <div className="mt-auto space-y-3 px-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div className="min-w-0 flex-1 rounded-xl border bg-card">
        <header className="flex h-[52px] items-center border-b px-6">
          <h1 className="type-label">{title}</h1>
        </header>
        <main
          id="workspace-content"
          tabIndex={-1}
          className="px-5 py-7 outline-none sm:px-8 sm:py-8"
        >
          <div className="mx-auto max-w-[1080px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
