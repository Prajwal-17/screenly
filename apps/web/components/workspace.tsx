"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AudioLines,
  LayoutDashboard,
  History,
  Plus,
  LogOut,
  Loader2,
  Menu,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-md text-xl font-semibold tracking-[-0.04em]"
      aria-label="Screenly home"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <AudioLines className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      Screenly
    </Link>
  );
}

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/interviews/new", label: "New interview", icon: Plus },
  { href: "/history", label: "History", icon: History },
];

function Sidebar({
  name,
  email,
  onNavigate,
}: {
  name: string;
  email: string;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Brand />
      </div>
      <div className="px-3 pt-6">
        <nav className="space-y-1" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 text-[13px] font-medium transition-colors hover:bg-secondary",
                  active
                    ? "border-border bg-card text-foreground shadow-[0_1px_2px_rgb(20_19_18/0.03)]"
                    : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("size-[17px]", active && "text-primary")}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-3">
        {error && (
          <p role="alert" className="mb-3 px-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center gap-2.5 border-t px-2 pt-4 pb-1">
          <Avatar className="size-9 shrink-0 rounded-lg">
            <AvatarFallback className="rounded-lg border bg-card text-xs font-medium">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium" title={name}>
              {name}
            </p>
            <p
              className="mt-0.5 truncate text-[11px] text-muted-foreground"
              title={email}
            >
              {email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            loading={signingOut}
            onClick={async () => {
              setSigningOut(true);
              setError("");
              try {
                const result = await authClient.signOut();
                if (result.error) throw new Error();
                onNavigate?.();
                router.push("/");
              } catch {
                setError("Could not sign out. Try again.");
              } finally {
                setSigningOut(false);
              }
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function Workspace({
  children,
  title,
  actions,
  voice = false,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  voice?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const path = usePathname();
  const { navigationOpen, setNavigationOpen } = useUIStore();
  useEffect(() => {
    if (!isPending && !session) router.replace("/auth/sign-in");
  }, [isPending, session, router]);
  useEffect(() => {
    if (session) document.getElementById("workspace-content")?.focus();
  }, [path, session]);
  const context =
    title ??
    (path === "/dashboard"
      ? "Overview"
      : path === "/history"
        ? "History"
        : path === "/interviews/new"
          ? "New interview"
          : path.endsWith("/feedback")
            ? "Feedback"
            : "Interview");
  if (isPending || !session)
    return (
      <div
        className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-4 animate-spin" />
        Loading your workspace…
      </div>
    );
  return (
    <div className="min-h-dvh">
      <a
        href="#workspace-content"
        className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-md border bg-card px-4 py-2 text-sm focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar md:flex"
        aria-label="Screenly workspace"
      >
        <Sidebar name={session.user.name} email={session.user.email} />
      </aside>
      <div className="min-w-0 md:ml-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <Sheet
              open={navigationOpen}
              onOpenChange={setNavigationOpen}
              side="left"
              title="Navigation"
              description="Your Screenly workspace"
              className="w-[min(280px,85vw)] bg-sidebar"
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              }
            >
              <Sidebar
                name={session.user.name}
                email={session.user.email}
                onNavigate={() => setNavigationOpen(false)}
              />
            </Sheet>
            <h1
              id="workspace-title"
              className="truncate text-sm leading-normal font-medium tracking-normal"
            >
              {context}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">{actions}</div>
        </header>
        <main
          id="workspace-content"
          aria-labelledby="workspace-title"
          tabIndex={-1}
          className={cn(
            "min-w-0 outline-none",
            voice
              ? "px-4 py-6 sm:px-8"
              : "px-4 py-7 sm:px-6 sm:py-9 lg:px-8 xl:px-10",
          )}
        >
          <div
            className={cn(
              "mx-auto",
              voice ? "max-w-[1280px]" : "max-w-[1160px]",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
