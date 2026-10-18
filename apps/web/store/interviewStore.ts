import { create } from "zustand";
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
};
export const useInterviewStore = create<State>(() => initialState);
