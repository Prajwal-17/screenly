"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Gauge,
  Headphones,
  Mic,
  Pause,
  Play,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInterviewView } from "@/store/interviewStore";
import type { Session } from "@/lib/interview-session";
import styles from "./live-interview.module.css";

export function InterviewAudioMenu({
  controller,
  disabled,
}: {
  controller: RefObject<Session | null>;
  disabled: boolean;
}) {
  const state = useInterviewView();
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [panel, setPanel] = useState<
    "main" | "speed" | "microphone" | "speaker"
  >("main");
  const menu = useRef<HTMLDivElement>(null);
  const previousPanel = useRef(panel);
  useEffect(() => {
    if (previousPanel.current === panel) return;
    previousPanel.current = panel;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [panel]);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerSupported, setSpeakerSupported] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch {
      setError("Could not list audio devices. Close Audio and try again.");
    }
  }, []);
  useEffect(() => {
    setSpeakerSupported("setSinkId" in AudioContext.prototype);
  }, []);
  useEffect(() => {
    if (!open) return;
    void refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, [open, refresh]);
  const changeDevice = async (kind: "microphone" | "speaker", id: string) => {
    if (changing) return;
    setChanging(true);
    setError("");
    try {
      if (kind === "microphone") await controller.current?.setMicrophone(id);
      else await controller.current?.setSpeaker(id);
      await refresh();
    } catch {
      setError(
        `Could not change your ${kind}. Your previous device is still selected.`,
      );
    } finally {
      setChanging(false);
    }
  };
  const deviceOptions = (kind: MediaDeviceKind) => [
    { deviceId: "default", label: "System default" },
    ...devices
      .filter(
        (device) =>
          device.kind === kind &&
          device.deviceId &&
          device.deviceId !== "default",
      )
      .map((device, index) => ({
        deviceId: device.deviceId,
        label:
          device.label ||
          `${kind === "audioinput" ? "Microphone" : "Speaker"} ${index + 1}`,
      })),
  ];
  return (
    <Tooltip open={tooltipOpen && !open} onOpenChange={setTooltipOpen}>
      <DropdownMenu
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setTooltipOpen(false);
          if (!next) {
            setPanel("main");
            setError("");
          }
        }}
      >
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className={styles.audio}
              data-control="audio"
              disabled={disabled}
              aria-label="Audio settings"
            >
              <Headphones aria-hidden="true" />
              <span>Audio</span>
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <DropdownMenuContent
          ref={menu}
          side="top"
          align="center"
          collisionPadding={8}
          className="w-64 max-w-[calc(100vw-1rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto"
        >
          {panel === "main" ? (
            <>
              <DropdownMenuItem
                disabled={state.pausePending || !state.connected}
                onSelect={() => void controller.current?.pauseAudio()}
                aria-keyshortcuts="Space"
              >
                {state.paused ? <Play /> : <Pause />}
                <span className="flex-1">
                  {state.paused ? "Resume interview" : "Pause interview"}
                </span>
                <kbd className="text-xs text-muted-foreground">Space</kbd>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                aria-label={`Interviewer playback speed, ${state.playbackRate}×`}
                onSelect={(event) => {
                  event.preventDefault();
                  setPanel("speed");
                }}
              >
                <Gauge />
                <span className="flex-1">Playback speed</span>
                <span className="text-muted-foreground tabular-nums">
                  {state.playbackRate}×
                </span>
                <ChevronRight />
              </DropdownMenuItem>
              {(["microphone", "speaker"] as const).map((kind) => {
                const selected =
                  kind === "microphone" ? state.microphoneId : state.speakerId;
                const options = deviceOptions(
                  kind === "microphone" ? "audioinput" : "audiooutput",
                );
                return (
                  <DropdownMenuItem
                    key={kind}
                    disabled={
                      changing || (kind === "speaker" && !speakerSupported)
                    }
                    aria-label={
                      kind === "microphone"
                        ? "Microphone device"
                        : "Speaker device"
                    }
                    onSelect={(event) => {
                      event.preventDefault();
                      setPanel(kind);
                    }}
                  >
                    {kind === "microphone" ? <Mic /> : <Volume2 />}
                    <span className="min-w-0 flex-1 py-1.5">
                      <span className="block capitalize">{kind}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {options.find((device) => device.deviceId === selected)
                          ?.label ?? "Selected device unavailable"}
                      </span>
                    </span>
                    <ChevronRight />
                  </DropdownMenuItem>
                );
              })}
              {!speakerSupported && (
                <DropdownMenuLabel>
                  Speaker output follows your browser or system settings.
                </DropdownMenuLabel>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                <span className="flex justify-between gap-3">
                  <span>
                    <kbd>M</kbd> Mute
                  </span>
                  <span>
                    <kbd>R</kbd> Replay
                  </span>
                  <span>
                    <kbd>T</kbd> Transcript
                  </span>
                </span>
              </DropdownMenuLabel>
            </>
          ) : (
            <>
              <DropdownMenuItem
                aria-label="Back to Audio"
                onSelect={(event) => {
                  event.preventDefault();
                  setPanel("main");
                }}
              >
                <ArrowLeft />
                <span className="font-medium">
                  {panel === "speed"
                    ? "Playback speed"
                    : panel === "microphone"
                      ? "Microphone"
                      : "Speaker"}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {panel === "speed" ? (
                <DropdownMenuRadioGroup
                  value={String(state.playbackRate)}
                  onValueChange={(value) =>
                    controller.current?.setPlaybackRate(Number(value))
                  }
                >
                  {[1, 1.25, 1.5, 2].map((rate) => (
                    <DropdownMenuRadioItem
                      key={rate}
                      value={String(rate)}
                      aria-label={`${rate}×${rate === 1 ? " Normal" : ""}`}
                    >
                      {rate}×{rate === 1 ? " · Normal" : ""}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              ) : (
                <DropdownMenuRadioGroup
                  value={
                    panel === "microphone"
                      ? state.microphoneId
                      : state.speakerId
                  }
                >
                  {deviceOptions(
                    panel === "microphone" ? "audioinput" : "audiooutput",
                  ).map((device) => (
                    <DropdownMenuRadioItem
                      key={device.deviceId}
                      value={device.deviceId}
                      disabled={changing}
                      onSelect={(event) => {
                        event.preventDefault();
                        void changeDevice(panel, device.deviceId);
                      }}
                    >
                      <span className="min-w-0 truncate">{device.label}</span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="px-2.5 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {changing && (
            <p
              role="status"
              className="px-2.5 py-2 text-xs text-muted-foreground"
            >
              Changing audio device…
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Audio settings</TooltipContent>
    </Tooltip>
  );
}
