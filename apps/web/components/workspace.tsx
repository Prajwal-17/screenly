"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, History, Plus, LogOut, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { InlineAlert } from "@/components/common";
import { cn } from "@/lib/utils";
export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 rounded-sm font-sans text-2xl font-medium tracking-[-0.015em]"
      aria-label="Screenly home"
    >
      <svg
        viewBox="0 0 28 28"
        className="size-7"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 3H2v22h6M20 3h6v22h-6"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="14" cy="14" r="3.5" className="fill-primary" />
      </svg>
      <span>Screenly</span>
    </Link>
  );
}
export function Workspace({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const path = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isPending && !session) router.replace("/auth/sign-in");
  }, [isPending, session, router]);
  useEffect(() => {
    if (session) document.getElementById("workspace-content")?.focus();
  }, [path, session]);
  if (isPending || !session)
    return (
      <div
        className="flex min-h-dvh items-center justify-center gap-2 text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-5 animate-spin" />
        Loading…
      </div>
    );
  const nav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/interviews/new", label: "New interview", icon: Plus },
    { href: "/history", label: "History", icon: History },
  ];
  return (
    <div className="min-h-dvh">
      <a
        href="#workspace-content"
        className="fixed top-4 left-4 z-50 -translate-y-24 rounded-md border bg-card px-4 py-2 focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="flex border-b bg-muted px-4 py-4 min-[761px]:fixed min-[761px]:inset-y-0 min-[761px]:left-0 min-[761px]:w-48 min-[761px]:flex-col min-[761px]:overflow-y-auto min-[761px]:border-r min-[761px]:border-b-0 min-[761px]:px-4 min-[761px]:py-8 xl:w-56 max-[760px]:flex-col">
        <div className="min-[761px]:px-3">
          <Brand />
        </div>
        <nav
          className="mt-5 flex flex-wrap gap-1 min-[761px]:mt-16 min-[761px]:flex-col"
          aria-label="Main navigation"
        >
          {nav.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              asChild
              variant="ghost"
              className={cn(
                "justify-start gap-3 border-l-[3px] border-l-transparent px-3",
                path === href &&
                  "border-l-primary bg-accent font-semibold text-accent-foreground hover:bg-accent-hover hover:text-accent-foreground active:bg-accent-active",
              )}
            >
              <Link
                href={href}
                aria-current={path === href ? "page" : undefined}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="mt-4 space-y-4 min-[761px]:mt-auto">
          {error && <InlineAlert>{error}</InlineAlert>}
          <Separator />
          <div className="flex items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="bg-muted text-xs">
                {session.user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className="min-w-0 flex-1 truncate text-xs"
              title={session.user.name}
            >
              {session.user.name}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                setError("");
                try {
                  const result = await authClient.signOut();
                  if (result.error) throw new Error();
                  router.push("/");
                } catch {
                  setError("Could not sign out. Retry.");
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>
      <main
        id="workspace-content"
        tabIndex={-1}
        className="min-w-0 p-4 outline-none sm:p-6 min-[761px]:ml-48 min-[761px]:p-8 xl:ml-56 xl:p-12"
      >
        <div className="mx-auto max-w-[1300px]">{children}</div>
      </main>
    </div>
  );
}
