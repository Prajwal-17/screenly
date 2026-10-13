"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  History,
  Plus,
  LogOut,
  Loader2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Forma home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        forma
        <span className="accent" style={{ fontSize: 18 }}>
          .
        </span>
      </span>
    </Link>
  );
}
export function Workspace({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!isPending && !session) router.replace("/auth/sign-in");
  }, [isPending, session, router]);
  if (isPending || !session)
    return (
      <div className="loading" style={{ minHeight: "100dvh" }}>
        <Loader2 size={20} className="spin" />
        Opening your workspace…
      </div>
    );
  const nav = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/interviews/new", label: "New interview", icon: Plus },
    { href: "/history", label: "History", icon: History },
  ];
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <p className="sidebar-caption">
          A little practice. A lot of possibility.
        </p>
        <nav className="nav-links" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${path === href ? "active" : ""}`}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="practice-note">
            <p className="eyebrow" style={{ marginBottom: 9 }}>
              Keep showing up
            </p>
            <p>Confidence grows one conversation at a time.</p>
            <Link
              className="text-link"
              href="/interviews/new"
              style={{ marginTop: 12 }}
            >
              Find your next level <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="user-row">
            <span className="avatar">
              {session.user.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <div className="user-name">{session.user.name}</div>
              <small style={{ fontSize: 10 }}>Personal workspace</small>
            </div>
            <button
              className="icon-button"
              style={{ border: 0, width: 28, marginLeft: "auto" }}
              aria-label="Sign out"
              onClick={async () => {
                await authClient.signOut();
                router.push("/");
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <Brand />
          <span
            className="topbar-crumb"
            style={{ fontSize: 12, color: "var(--subtle)" }}
          >
            Workspace{" "}
            <span style={{ margin: "0 12px", color: "#52624d" }}>/</span>{" "}
            {path === "/dashboard"
              ? "Overview"
              : path === "/history"
                ? "Interview history"
                : path === "/interviews/new"
                  ? "New interview"
                  : "Your interview"}
          </span>
          <span className="tag green">
            <span className="dot" />
            Your next chapter starts here
          </span>
          <button
            className="icon-button mobile-signout"
            aria-label="Sign out"
            onClick={async () => {
              await authClient.signOut();
              router.push("/");
            }}
          >
            <LogOut size={17} />
          </button>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
