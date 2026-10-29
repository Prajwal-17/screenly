"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Settings2,
  UserRound,
  CircleHelp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { workspaceNavigation } from "@/lib/workspace-navigation";
import { Wordmark } from "@/components/wordmark";
import { useUIStore } from "@/store/uiStore";

export function WorkspaceSidebar({
  name,
  email,
  onSignOut,
  signOutError = "",
}: {
  name: string;
  email: string;
  onSignOut: () => Promise<void>;
  signOutError?: string;
}) {
  const path = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const signingOut = useUIStore((s) => s.signingOut);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const closeNavigation = () => setOpenMobile(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const renderLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: LucideIcon;
  }) => {
    const active =
      path === href ||
      (href === "/history" &&
        path.startsWith("/interviews/") &&
        path !== "/interviews/new");
    return (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton asChild isActive={active} tooltip={label}>
          <Link
            href={href}
            onClick={closeNavigation}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };
  return (
    <Sidebar
      variant="inset"
      collapsible="offcanvas"
      aria-label="Screenly workspace"
    >
      <SidebarHeader className="gap-3 pb-4">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="Screenly home"
                className="gap-2.5"
              >
                <Link
                  href="/dashboard"
                  onClick={closeNavigation}
                  aria-label="Screenly home"
                >
                  <Wordmark />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close navigation"
              onClick={closeNavigation}
            >
              <X />
            </Button>
          )}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search workspace"
              onClick={() => {
                closeNavigation();
                setSearchOpen(true);
              }}
              aria-label="Search workspace"
              className="border bg-card text-muted-foreground group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent"
            >
              <Search aria-hidden="true" />
              <span className="flex-1">Search</span>
              <kbd className="text-[10px] font-normal">Ctrl K</kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {workspaceNavigation[0]?.items.map(renderLink)}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pt-2">
          <details
            key={path}
            className="group/planned"
            open={
              workspaceNavigation
                .slice(1)
                .some((group) =>
                  group.items.some((item) => item.href === path),
                ) || undefined
            }
          >
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              Coming soon
              <ChevronDown
                className="size-3.5 transition-transform group-open/planned:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <nav aria-label="Planned features">
              <SidebarMenu className="mt-1">
                {workspaceNavigation
                  .slice(1)
                  .flatMap((group) => group.items)
                  .map(renderLink)}
              </SidebarMenu>
            </nav>
          </details>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <nav aria-label="Workspace utilities">
          <SidebarMenu>
            {renderLink({ href: "/help", label: "Help", icon: CircleHelp })}
            {renderLink({
              href: "/settings",
              label: "Settings",
              icon: Settings2,
            })}
          </SidebarMenu>
        </nav>
        <div className="border-t pt-2">
          {signOutError && (
            <p role="alert" className="mb-2 px-2 text-xs text-destructive">
              {signOutError}
            </p>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={name}
                    aria-label="Account menu"
                    className="gap-2.5 data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="size-8 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg border bg-secondary text-[11px] font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {email}
                      </span>
                    </span>
                    <ChevronsUpDown
                      className="ml-auto size-3.5!"
                      aria-hidden="true"
                    />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isMobile ? "bottom" : "top"}
                  align="start"
                  className="w-60"
                >
                  <div className="px-2 py-2">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/onboarding?edit=1" onClick={closeNavigation}>
                      <UserRound />
                      Edit profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" onClick={closeNavigation}>
                      <Settings2 />
                      Settings
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
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
