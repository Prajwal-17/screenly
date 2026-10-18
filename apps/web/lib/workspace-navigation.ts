import {
  LayoutDashboard,
  Plus,
  History,
  BookOpen,
  Layers3,
  ChartNoAxesCombined,
  Bookmark,
  Settings2,
  CircleHelp,
} from "lucide-react";

export const workspaceNavigation = [
  {
    label: "Workspace",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        description: "Your practice at a glance",
      },
      {
        href: "/interviews/new",
        label: "New interview",
        icon: Plus,
        description: "Start a focused voice session",
      },
      {
        href: "/history",
        label: "History",
        icon: History,
        description: "Revisit sessions and feedback",
      },
    ],
  },
  {
    label: "Practice",
    items: [
      {
        href: "/library",
        label: "Question library",
        icon: BookOpen,
        description: "Explore technical interview prompts",
        preview: true,
      },
      {
        href: "/plans",
        label: "Practice plans",
        icon: Layers3,
        description: "Find a path for your next role",
        preview: true,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/progress",
        label: "Progress",
        icon: ChartNoAxesCombined,
        description: "See how your practice develops",
        preview: true,
      },
      {
        href: "/saved",
        label: "Saved answers",
        icon: Bookmark,
        description: "Keep useful answers close",
        preview: true,
      },
    ],
  },
];

export const workspaceUtilities = [
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
    description: "Account and workspace preferences",
  },
  {
    href: "/help",
    label: "Help & feedback",
    icon: CircleHelp,
    description: "Get comfortable with Screenly",
  },
];
export const workspaceDestinations = [
  ...workspaceNavigation.flatMap((group) => group.items),
  ...workspaceUtilities,
];
