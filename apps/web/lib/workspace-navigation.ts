import {
  LayoutDashboard,
  Plus,
  History,
  UserRound,
  Brain,
  Settings2,
} from "lucide-react";

export const workspaceDestinations = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interviews/new", label: "New interview", icon: Plus },
  { href: "/history", label: "Interviews", icon: History },
  { href: "/profile", label: "My profile", icon: UserRound },
  { href: "/memory", label: "Practice memory", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings2 },
];
export const workspaceNavigation = [
  { label: "Screenly", items: workspaceDestinations },
];
