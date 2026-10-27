import { useEffect } from "react";

export function useInterviewShortcuts(actions: {
  mute: () => void;
  replay: () => void;
  transcript: () => void;
  pause: () => void;
}) {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        window.innerWidth < 1024 ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          "input,textarea,select,[contenteditable=true],[role=combobox],[role=textbox]",
        )
      )
        return;
      if (
        [
          ...document.querySelectorAll(
            '[role="dialog"],[role="alertdialog"],[role="menu"]',
          ),
        ].some((node) => node.getClientRects().length > 0)
      )
        return;
      const key = event.key.toLowerCase();
      if (key === " " && target?.closest("button,a,[role=button]")) return;
      const action =
        key === "m"
          ? actions.mute
          : key === "r"
            ? actions.replay
            : key === "t"
              ? actions.transcript
              : key === " "
                ? actions.pause
                : null;
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [actions]);
}
