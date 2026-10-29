"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, X, CircleHelp } from "lucide-react";
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
import { workspaceDestinations } from "@/lib/workspace-navigation";
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
  const closeNavigation = () => setOpenMobile(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <Sidebar
      variant="inset"
      collapsible="offcanvas"
      aria-label="Screenly workspace"
    >
      <SidebarHeader className="pb-4">
        <div className="flex items-center gap-1">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip="Screenly"
                className="gap-2.5"
              >
                <Link
                  href="/interviews/new"
                  onClick={closeNavigation}
                  aria-label="Screenly"
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {workspaceDestinations.map(({ href, label, icon: Icon }) => {
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
                        tooltip={label}
                      >
                        <Link
                          href={href}
                          onClick={closeNavigation}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon aria-hidden="true" strokeWidth={1.7} />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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
                  <DropdownMenuItem asChild>
                    <Link href="/settings" onClick={closeNavigation}>
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help" onClick={closeNavigation}>
                      <CircleHelp /> Help
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
