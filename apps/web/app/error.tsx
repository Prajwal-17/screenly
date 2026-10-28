"use client";

import { PageRecovery } from "@/components/page-recovery";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageRecovery title="This page couldn’t load" retry={reset}>
      Try loading it again, or return to your overview to continue.
    </PageRecovery>
  );
}
