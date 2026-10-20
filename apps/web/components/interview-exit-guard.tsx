"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/uiStore";

// Navigation API types are not yet included in this project's TypeScript DOM lib.
type HistoryNavigationEvent = Event & {
  navigationType: string;
  canIntercept: boolean;
  destination: { url: string; key: string };
  intercept?: (options: {
    precommitHandler: () => Promise<void>;
    handler: () => void;
    focusReset: "manual";
    scroll: "manual";
  }) => void;
};
type BrowserNavigation = EventTarget & {
  traverseTo: (key: string) => { finished: Promise<unknown> };
};

export function useInterviewExitGuard({
  id,
  enabled,
  timerStarted,
  endInterview,
}: {
  id: string;
  enabled: boolean;
  timerStarted: boolean;
  endInterview: () => Promise<unknown>;
}) {
  const router = useRouter();
  const active = useRef(enabled);
  const bypass = useRef(false);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const end = useRef(endInterview);
  const endingForExit = useRef(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    active.current = enabled;
    end.current = endInterview;
  }, [enabled, endInterview]);
  useEffect(() => {
    bypass.current = false;
    endingForExit.current = false;
    return () => {
      pending.current?.(false);
      pending.current = null;
    };
  }, [id]);
  const allowExit = useCallback(() => {
    bypass.current = true;
  }, []);
  const confirmExit = useCallback((): Promise<boolean> => {
    if (!active.current || bypass.current) return Promise.resolve(true);
    // Only the first requested destination may continue after confirmation.
    if (pending.current) return Promise.resolve(false);
    returnFocus.current = document.activeElement as HTMLElement | null;
    useUIStore.setState({ navigationOpen: false, searchOpen: false });
    setError("");
    setOpen(true);
    return new Promise((resolve) => {
      pending.current = resolve;
    });
  }, []);
  const settle = useCallback((accepted: boolean) => {
    if (accepted) returnFocus.current = null;
    const resolve = pending.current;
    pending.current = null;
    setOpen(false);
    resolve?.(accepted);
  }, []);
  const finishAndLeave = async () => {
    if (endingForExit.current) return;
    endingForExit.current = true;
    setSaving(true);
    setError("");
    try {
      await end.current();
      // Keep this flag set until unmount, so late socket events cannot redirect
      // to feedback instead of the destination the candidate chose.
      settle(true);
    } catch {
      endingForExit.current = false;
      setError("Could not end the interview. Try again or leave for now.");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!enabled) return;
    const needsConfirmation = () => active.current && !bypass.current;
    const leavesInterview = (destination: string) => {
      const url = new URL(destination, location.href);
      return (
        url.origin !== location.origin || url.pathname !== location.pathname
      );
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!needsConfirmation()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        !needsConfirmation() ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !leavesInterview(url.href)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void confirmExit().then((accepted) => {
        if (!accepted) return;
        bypass.current = true;
        if (url.origin === location.origin)
          router.push(url.pathname + url.search + url.hash);
        else location.assign(url.href);
      });
    };
    const navigation = (window as Window & { navigation?: BrowserNavigation })
      .navigation;
    const traverse = (raw: Event) => {
      const event = raw as HistoryNavigationEvent;
      if (
        event.navigationType !== "traverse" ||
        !event.canIntercept ||
        !event.cancelable ||
        !needsConfirmation() ||
        !leavesInterview(event.destination.url)
      )
        return;
      if (event.intercept && "NavigationPrecommitController" in window) {
        event.intercept({
          focusReset: "manual",
          scroll: "manual",
          precommitHandler: async () => {
            if (!(await confirmExit())) {
              throw new DOMException(
                "Interview navigation cancelled",
                "AbortError",
              );
            }
          },
          handler: () => {
            bypass.current = true;
            const destination = new URL(event.destination.url);
            router.replace(
              destination.pathname + destination.search + destination.hash,
            );
          },
        });
        return;
      }
      // Cancel before the URL, Next.js tree, or live session changes. Continuing
      // by entry key preserves the browser's Back/Forward stack without duplicates.
      event.preventDefault();
      void confirmExit().then((accepted) => {
        if (accepted) {
          bypass.current = true;
          void navigation
            ?.traverseTo(event.destination.key)
            .finished.catch(() => {
              bypass.current = false;
            });
        }
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    navigation?.addEventListener("navigate", traverse);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      navigation?.removeEventListener("navigate", traverse);
    };
  }, [enabled, confirmExit, router]);

  const dialog = (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !saving) settle(false);
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (bypass.current || !returnFocus.current) return;
          const target = returnFocus.current;
          if (target?.isConnected && target.getClientRects().length)
            target.focus({ preventScroll: true });
          else
            document
              .querySelector<HTMLButtonElement>(
                'button[aria-label="Open navigation"]',
              )
              ?.focus({ preventScroll: true });
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Leave this interview?</AlertDialogTitle>
          <AlertDialogDescription>
            Your saved conversation stays available, but words still being
            transcribed may be lost.{" "}
            {timerStarted
              ? "If you leave for now, the timer keeps running."
              : "Leaving for now does not end this session."}{" "}
            End the interview to stop it and generate feedback.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2">
          <AlertDialogCancel className="sm:col-span-2" disabled={saving}>
            Keep interviewing
          </AlertDialogCancel>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => settle(true)}
          >
            Leave for now
          </Button>
          <Button
            variant="destructive"
            loading={saving}
            onClick={() => void finishAndLeave()}
          >
            {saving ? "Ending interview…" : "End and leave"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirmExit, allowExit, endingForExit, dialog };
}
