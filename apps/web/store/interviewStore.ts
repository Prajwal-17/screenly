import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type {
  InterviewDetail,
  InterviewMessage,
  LiveStatus,
} from "@repo/shared";
type State = {
  interview: InterviewDetail | null;
  messages: InterviewMessage[];
  status: LiveStatus;
  streaming: string;
  caption: { role: "assistant" | "user"; text: string; turn: string } | null;
  partial: string;
  error: string;
  errorScope: "voice" | "speech" | "llm" | "session" | null;
  connected: boolean;
  muted: boolean;
  micActive: boolean;
  starting: boolean;
  level: number;
  paused: boolean;
  playbackRate: number;
};
export const initialState: State = {
  interview: null,
  messages: [],
  status: "connecting",
  streaming: "",
  caption: null,
  partial: "",
  error: "",
  errorScope: null,
  connected: false,
  muted: false,
  micActive: false,
  starting: false,
  level: 0,
  paused: false,
  playbackRate: 1,
};
export const useInterviewStore = create<State>(() => initialState);

// Audio metering is read directly by the orb; it must not reconcile the page
// and its transcript on every microphone chunk.
export function useInterviewView() {
  return useInterviewStore(
    useShallow((state) => ({
      interview: state.interview,
      messages: state.messages,
      status: state.status,
      streaming: state.streaming,
      caption: state.caption,
      partial: state.partial,
      error: state.error,
      errorScope: state.errorScope,
      connected: state.connected,
      muted: state.muted,
      micActive: state.micActive,
      starting: state.starting,
      paused: state.paused,
      playbackRate: state.playbackRate,
    })),
  );
}
