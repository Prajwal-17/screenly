"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { workspaceDestinations } from "@/lib/workspace-navigation";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

export function WorkspaceSearch() {
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
  const go = (href: string) => {
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
      description="Jump to a page or find your next practice session."
      className="max-w-[560px]"
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
      <div className="flex items-center gap-3 border-y px-5">
        <Search className="size-[18px] shrink-0 text-muted-foreground" />
        <input
          ref={input}
          role="combobox"
          aria-label="Search workspace pages"
          aria-expanded="true"
          aria-controls="workspace-search-results"
          aria-activedescendant={
            results[active] ? `workspace-result-${active}` : undefined
          }
          autoComplete="off"
          placeholder="Where would you like to go?"
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
          className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div
        id="workspace-search-results"
        role="listbox"
        aria-label="Workspace pages"
        className="max-h-[min(48dvh,400px)] overflow-y-auto p-2"
      >
        {results.map(({ href, label, description, icon: Icon }, index) => (
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
              "flex min-h-14 w-full items-center gap-3 rounded-md px-3 text-left outline-none transition-colors",
              active === index && "bg-secondary",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground">
              <Icon className="size-4" strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {description}
              </span>
            </span>
            {active === index ? (
              <CornerDownLeft className="size-3.5 text-muted-foreground" />
            ) : (
              <ArrowUpRight className="size-3.5 text-muted-foreground/50" />
            )}
          </button>
        ))}
        {results.length === 0 && (
          <p
            role="status"
            className="px-3 py-10 text-center text-sm text-muted-foreground"
          >
            No pages match “{query}”.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-5 py-2.5 text-[10px] text-muted-foreground">
        <span>
          ↑ ↓ Navigate <span className="ml-3">↵ Open</span>
        </span>
        <span>Esc to close</span>
      </div>
    </Dialog>
  );
}
