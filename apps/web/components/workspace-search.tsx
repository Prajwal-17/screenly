"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { workspaceDestinations } from "@/lib/workspace-navigation";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function WorkspaceSearch({
  beforeNavigate,
}: {
  beforeNavigate?: () => Promise<boolean>;
}) {
  const { searchOpen, setSearchOpen, setNavigationOpen } = useUIStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const results = workspaceDestinations.filter((item) =>
    `${item.label} ${item.description}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const go = async (href: string) => {
    if (beforeNavigate && !(await beforeNavigate())) return;
    setSearchOpen(false);
    setNavigationOpen(false);
    setQuery("");
    setActive(0);
    router.push(href);
  };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setNavigationOpen(false);
        setSearchOpen(!useUIStore.getState().searchOpen);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [setNavigationOpen, setSearchOpen]);
  useEffect(() => {
    if (searchOpen)
      document
        .getElementById(`workspace-result-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, searchOpen]);
  return (
    <Dialog
      open={searchOpen}
      onOpenChange={(open) => {
        setSearchOpen(open);
        if (!open) {
          setQuery("");
          setActive(0);
        }
      }}
      title="Search workspace"
      description="Use arrow keys to navigate and Enter to open a page."
      showHeader={false}
      className="max-w-[520px] overflow-hidden rounded-lg"
      focusRef={input}
      onOpenAutoFocus={() => {
        returnFocus.current = document.activeElement as HTMLElement;
      }}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (returnFocus.current?.isConnected) returnFocus.current.focus();
        if (window.matchMedia("(max-width: 767px)").matches)
          document
            .querySelector<HTMLButtonElement>(
              'button[aria-label="Open navigation"]',
            )
            ?.focus();
      }}
    >
      <div className="flex items-center gap-3 border-b pl-4 pr-1">
        <Search
          className="size-[18px] shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={input}
          role="combobox"
          aria-label="Search workspace"
          aria-expanded="true"
          aria-controls="workspace-search-results"
          aria-activedescendant={
            results[active] ? `workspace-result-${active}` : undefined
          }
          autoComplete="off"
          placeholder="Search workspace…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) =>
                Math.max(0, Math.min(value + 1, results.length - 1)),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(0, value - 1));
            }
            if (event.key === "Enter" && results[active]) {
              event.preventDefault();
              go(results[active].href);
            }
          }}
          className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Close search workspace"
          onClick={() => {
            setSearchOpen(false);
            setQuery("");
            setActive(0);
          }}
          className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] leading-4"
            aria-hidden="true"
          >
            Esc
          </span>
        </button>
      </div>
      <div
        id="workspace-search-results"
        role="listbox"
        aria-label="Workspace pages"
        className="max-h-[min(50dvh,360px)] overflow-y-auto p-1.5"
      >
        {results.map(({ href, label, icon: Icon }, index) => (
          <button
            type="button"
            key={href}
            role="option"
            id={`workspace-result-${index}`}
            aria-selected={active === index}
            tabIndex={-1}
            onClick={() => go(href)}
            onMouseMove={() => setActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 text-left outline-none transition-colors md:min-h-10 [@media(pointer:coarse)]:min-h-11",
              active === index && "bg-secondary",
            )}
          >
            <Icon
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-[13px]">{label}</span>
            {active === index && (
              <ArrowRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
        {results.length === 0 && (
          <p
            role="status"
            className="px-2.5 py-5 text-center text-[13px] text-muted-foreground"
          >
            No results.
          </p>
        )}
      </div>
    </Dialog>
  );
}
