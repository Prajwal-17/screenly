"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, X, Play, Plus, ChevronsUpDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { workspaceDestinations } from "@/lib/workspace-navigation";
import { api } from "@/lib/api";
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
  const signingOut = useUIStore((state) => state.signingOut);
  const interviews = useQuery({ queryKey: ["interviews"], queryFn: api.list });
  const activeInterview = interviews.data?.find(
    (item) => item.status === "active",
  );
  const closeNavigation = () => setOpenMobile(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const renderItem = ({
    href,
    label,
    icon: Icon,
  }: (typeof workspaceDestinations)[number]) => {
    const active =
      path === href ||
      (href === "/history" &&
        path.startsWith("/interviews/") &&
        path !== "/interviews/new");
    return (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton
          asChild
          isActive={active}
          className="h-9 rounded-md type-ui data-[active=true]:bg-card data-[active=true]:shadow-sm"
          tooltip={label}
        >
          <Link
            href={href}
            onClick={closeNavigation}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            title={label}
          >
            <Icon aria-hidden="true" strokeWidth={1.7} />
            <span className="min-w-0 truncate">{label}</span>
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
      <SidebarHeader className="px-2 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 px-2">
          <Link
            href="/dashboard"
            onClick={closeNavigation}
            className="inline-flex min-h-9 items-center rounded-md"
            aria-label="Screenly"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
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
        </div>
        <nav aria-label="Interview actions" className="mt-4">
          <Button asChild className="w-full justify-start gap-2.5 px-3">
            <Link
              href="/interviews/new"
              onClick={closeNavigation}
              aria-current={path === "/interviews/new" ? "page" : undefined}
            >
              <Plus strokeWidth={1.7} aria-hidden="true" />
              New interview
            </Link>
          </Button>
        </nav>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {workspaceDestinations
                  .filter(
                    (item) =>
                      !["/interviews/new", "/settings", "/profile"].includes(
                        item.href,
                      ),
                  )
                  .map(renderItem)}
              </SidebarMenu>
            </nav>
            {activeInterview && (
              <SidebarMenu className="mt-5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="h-10 rounded-lg type-ui"
                  >
                    <Link
                      href={`/interviews/${activeInterview.id}`}
                      onClick={closeNavigation}
                      title="Resume interview"
                      aria-label="Resume interview"
                    >
                      <Play aria-hidden="true" strokeWidth={1.7} />
                      <span>Resume interview</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-2 pb-3">
        {signOutError && (
          <p role="alert" className="mb-2 px-2 text-xs text-destructive-text">
            {signOutError}
          </p>
        )}
        <nav aria-label="Workspace utilities">
          <SidebarMenu>
            {workspaceDestinations
              .filter((item) => ["/profile", "/settings"].includes(item.href))
              .map(renderItem)}
          </SidebarMenu>
        </nav>
        <div className="mt-1 border-t pt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="h-14 gap-2.5 rounded-lg"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="border bg-card text-xs font-medium text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate type-label">{name}</span>
                      <span className="block truncate type-caption text-muted-foreground">
                        {email}
                      </span>
                    </span>
                    <ChevronsUpDown
                      className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-60">
                  <DropdownMenuLabel className="px-2.5 py-2">
                    <p className="truncate type-label text-foreground">
                      {name}
                    </p>
                    <p className="mt-0.5 truncate type-caption text-muted-foreground">
                      {email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" onClick={closeNavigation}>
                      <Settings2 />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={signingOut}
                    className="text-destructive-text focus:bg-destructive-surface [&_svg]:text-destructive-text"
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
