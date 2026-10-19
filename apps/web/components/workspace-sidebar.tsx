"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Tooltip } from "radix-ui";
import {
  AudioLines,
  Search,
  ChevronsUpDown,
  Check,
  Plus,
  ArrowUpRight,
  LogOut,
  Settings2,
  Bell,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  workspaceNavigation,
  workspaceUtilities,
} from "@/lib/workspace-navigation";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

function Hint({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="z-[70] rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-sm duration-100 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          {label}
          <Tooltip.Arrow className="fill-foreground" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function WorkspaceSidebar({
  name,
  email,
  collapsed = false,
  onNavigate,
  onSignOut,
  signOutError = "",
}: {
  name: string;
  email: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onSignOut: () => Promise<void>;
  signOutError?: string;
}) {
  const path = usePathname();
  const signingOut = useUIStore((state) => state.signingOut);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const initial = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const row = cn(
    "relative flex items-center outline-none transition-colors hover:bg-secondary-hover focus-visible:ring-2 focus-visible:ring-ring",
    collapsed
      ? "mx-auto size-11 justify-center rounded-lg"
      : "min-h-11 w-full gap-3 rounded-md px-3 text-[13px] font-medium md:min-h-10 [@media(pointer:coarse)]:min-h-11",
  );
  const navigate = () => onNavigate?.();
  const openSearch = () => {
    onNavigate?.();
    setSearchOpen(true);
  };
  const renderLink = ({
    href,
    label,
    icon: Icon,
    preview = false,
  }: {
    href: string;
    label: string;
    icon: LucideIcon;
    preview?: boolean;
  }) => {
    const active =
      path === href || (href === "/history" && path.endsWith("/feedback"));
    return (
      <Hint key={href} label={label} enabled={collapsed}>
        <Link
          href={href}
          onClick={navigate}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            row,
            "group",
            active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {active && (
            <motion.span
              layoutId={
                onNavigate
                  ? "mobile-navigation-active"
                  : "desktop-navigation-active"
              }
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "absolute inset-0",
                collapsed
                  ? "rounded-lg bg-accent"
                  : "rounded-md border border-border/70 bg-card shadow-[0_1px_2px_rgb(20_19_18/0.04)]",
              )}
              aria-hidden="true"
            />
          )}
          <Icon
            className={cn(
              "relative size-[18px] shrink-0",
              active
                ? "text-primary"
                : "text-muted-foreground group-hover:text-ink-secondary",
            )}
            strokeWidth={1.7}
            aria-hidden="true"
          />
          {!collapsed && (
            <>
              <span className="relative min-w-0 flex-1 truncate">{label}</span>
              {preview ? (
                <span
                  aria-hidden="true"
                  className="relative rounded border border-border/70 px-1 text-[9px] leading-[15px] font-normal text-muted-foreground"
                >
                  Preview
                </span>
              ) : href === "/interviews/new" ? (
                <ArrowUpRight
                  className="relative size-3.5 text-muted-foreground/70"
                  aria-hidden="true"
                />
              ) : null}
            </>
          )}
        </Link>
      </Hint>
    );
  };
  return (
    <Tooltip.Provider
      delayDuration={100}
      skipDelayDuration={250}
      disableHoverableContent
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          collapsed ? "w-[calc(4rem_-_1px)]" : "w-full",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b",
            collapsed ? "justify-center px-2" : "px-2.5",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Switch workspace"
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary",
                  collapsed && "size-11 flex-none justify-center p-0",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14)]">
                  <AudioLines className="size-[19px]" strokeWidth={1.8} />
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold tracking-[-0.025em]">
                        Screenly
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        Personal workspace
                      </span>
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side={collapsed ? "right" : "bottom"}
              className="w-64"
            >
              <DropdownMenuLabel>Your workspaces</DropdownMenuLabel>
              <DropdownMenuItem>
                <span className="grid size-7 place-items-center rounded-md border bg-accent text-primary">
                  <AudioLines />
                </span>
                <span className="flex-1">Personal workspace</span>
                <Check />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={navigate}>
                  <Settings2 />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings?tab=workspace" onClick={navigate}>
                  <Plus />
                  Create a workspace
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Preview
                  </span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onNavigate && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-1 shrink-0"
              aria-label="Close navigation"
              onClick={onNavigate}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        <div
          className={cn(
            "shrink-0",
            collapsed ? "px-2 pt-2 pb-1" : "px-2.5 pt-3 pb-2",
          )}
        >
          <Hint label="Search workspace · Ctrl K" enabled={collapsed}>
            <button
              aria-label="Search workspace"
              onClick={openSearch}
              className={cn(
                "flex items-center rounded-lg text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                collapsed
                  ? "mx-auto size-11 justify-center hover:bg-secondary-hover hover:text-foreground"
                  : "h-11 w-full gap-2.5 border bg-card/70 px-3 text-left text-[13px] hover:border-input hover:bg-card md:h-10",
              )}
            >
              <Search
                className={cn("shrink-0", collapsed ? "size-[18px]" : "size-4")}
                strokeWidth={1.7}
                aria-hidden="true"
              />
              {!collapsed && (
                <>
                  <span className="flex-1">Find anything…</span>
                  <kbd className="rounded border bg-sidebar px-1.5 py-0.5 font-sans text-[10px] leading-4">
                    Ctrl K
                  </kbd>
                </>
              )}
            </button>
          </Hint>
        </div>

        <nav
          aria-label="Main navigation"
          className={cn(
            "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pt-1 pb-3",
            collapsed ? "px-2" : "px-2.5",
          )}
        >
          {workspaceNavigation.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn(
                groupIndex > 0 && (collapsed ? "mt-2" : "mt-3 border-t pt-2"),
              )}
            >
              {!collapsed && (
                <p className="px-3 pt-2 pb-1.5 text-[10px] leading-4 font-medium tracking-[0.06em] text-muted-foreground uppercase">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">{group.items.map(renderLink)}</div>
            </div>
          ))}
          <div
            className={cn(
              "space-y-0.5",
              collapsed ? "mt-2" : "mt-3 border-t pt-2",
            )}
          >
            {workspaceUtilities.map(renderLink)}
          </div>
        </nav>

        <div className={cn("shrink-0 border-t", collapsed ? "p-2" : "p-2.5")}>
          {signOutError && (
            <p role="alert" className="mb-2 px-2 text-xs text-destructive">
              {signOutError}
            </p>
          )}
          <div
            className={cn(
              "flex items-center gap-1",
              collapsed && "justify-center",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Account menu"
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 text-left outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary",
                    collapsed && "size-11 flex-none justify-center p-0",
                  )}
                >
                  <Avatar
                    className={cn(
                      "shrink-0 rounded-full",
                      collapsed ? "size-7" : "size-8",
                    )}
                  >
                    <AvatarFallback
                      className={cn(
                        "rounded-full text-[10px] font-medium",
                        collapsed
                          ? "bg-accent text-primary"
                          : "bg-card text-ink-secondary",
                      )}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">
                          {name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          Personal account
                        </span>
                      </span>
                      <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-64">
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-medium">{name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" onClick={navigate}>
                    <UserRound />
                    Your account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings?tab=workspace" onClick={navigate}>
                    <Settings2 />
                    Preferences
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={signingOut}
                  className="text-destructive focus:bg-destructive-surface [&_svg]:text-destructive"
                  onSelect={() => void onSignOut()}
                >
                  <LogOut />
                  {signingOut ? "Signing out…" : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!collapsed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Notifications"
                    className="shrink-0 rounded-full"
                  >
                    <Bell className="size-4" strokeWidth={1.7} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="end"
                  className="w-64 p-4"
                >
                  <p className="text-xs font-medium">You’re all caught up</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Updates about your workspace will appear here.
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
