import { Plus, History, Settings2 } from "lucide-react";

export const workspaceNavigation = [
  {
    label: "Screenly",
    items: [
      {
        href: "/interviews/new",
        label: "New interview",
        icon: Plus,
        description: "Start a voice session",
      },
      {
        href: "/history",
        label: "Interviews",
        icon: History,
        description: "Saved conversations and reviews",
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings2,
        description: "Profile, memory and account",
      },
    ],
  },
];
export const workspaceDestinations = workspaceNavigation[0]!.items;
