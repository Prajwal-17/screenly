import { interviewElapsedMs } from "@repo/shared";
import type {
  Capabilities,
  Interview,
  InterviewDetail,
  InterviewSettings,
} from "@repo/shared";
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error ?? "Could not complete the request.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const api = {
  capabilities: () => request<Capabilities>("/capabilities"),
  list: () => request<Interview[]>("/interviews"),
  detail: (id: string) => request<InterviewDetail>(`/interviews/${id}`),
  create: (settings: InterviewSettings) =>
    request<Interview>("/interviews", {
      method: "POST",
      body: JSON.stringify(settings),
    }),
  finish: (id: string, generateFeedback = true) =>
    request<InterviewDetail>(`/interviews/${id}/finish`, {
      method: "POST",
      body: JSON.stringify({ generateFeedback }),
    }),
  retryFeedback: (id: string) =>
    request(`/interviews/${id}/feedback`, { method: "POST" }),
  remove: (id: string) => request(`/interviews/${id}`, { method: "DELETE" }),
};
export function interviewLink(interview: Interview) {
  return `/interviews/${interview.id}${interview.status === "completed" ? "/feedback" : ""}`;
}
export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}
export function elapsed(interview: Interview, now = Date.now()) {
  return Math.floor(interviewElapsedMs(interview, now) / 1000);
}
export function clock(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
