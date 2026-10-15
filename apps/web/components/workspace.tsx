"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, History, Plus, LogOut, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Screenly home">
      <span className="brand-mark" aria-hidden="true">
        <i />
      </span>
      <span>screenly</span>
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
      <div className="loading" role="status" style={{ minHeight: "100dvh" }}>
        <Loader2 size={20} className="spin" />
        Loading…
      </div>
    );
  const nav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/interviews/new", label: "New interview", icon: Plus },
    { href: "/history", label: "History", icon: History },
  ];
  return (
    <div className="workspace">
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${path === href ? "active" : ""}`}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="user-row">
            <span className="avatar" aria-hidden="true">
              {session.user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="user-name" title={session.user.name}>
              {session.user.name}
            </span>
            <button
              className="icon-button"
              aria-label="Sign out"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                setError("");
                try {
                  const result = await authClient.signOut();
                  if (result.error) throw new Error("Sign out failed. Retry.");
                  router.push("/");
                } catch {
                  setError("Could not sign out. Retry.");
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main
        id="workspace-content"
        className="workspace-main content"
        tabIndex={-1}
      >
        <p className="desktop-notice">
          Use a wider window for interview practice.
        </p>
        {children}
      </main>
    </div>
  );
}
