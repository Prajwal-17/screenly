import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your profile" };
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
