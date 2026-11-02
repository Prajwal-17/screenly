import { cn } from "@/lib/utils";
import "./profile-theme.css";

export function ProfileTheme({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("profile-surface", className)}>{children}</div>;
}
