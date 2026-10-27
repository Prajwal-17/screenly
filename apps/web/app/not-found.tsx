import type { Metadata } from "next";
import { PageRecovery } from "@/components/page-recovery";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <PageRecovery title="Page not found">
      This address may have changed. Return to your overview to find your
      interviews.
    </PageRecovery>
  );
}
