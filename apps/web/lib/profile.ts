"use client";
import { useQuery } from "@tanstack/react-query";
import type {
  ProfileDetails,
  ProfileImport,
  UserProfile,
  OnboardingState,
  ProfileImportEvent,
  ProfileImportStage,
} from "@repo/shared";
import { authClient } from "./auth-client";
import { API_URL, ApiError, request } from "./api";

export class ProfileImportFailure extends ApiError {
  constructor(
    message: string,
    status: number,
    readonly extractedText = "",
  ) {
    super(message, status);
  }
}
export const profileApi = {
  get: (signal?: AbortSignal) =>
    request<UserProfile>("/profile", {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
        : AbortSignal.timeout(10000),
    }),
  save: (
    details: ProfileDetails,
    complete = false,
    onboarding?: OnboardingState,
  ) =>
    request<UserProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify({ details, complete, onboarding }),
    }),
  skip: () =>
    request<UserProfile>("/profile/skip", { method: "POST", body: "{}" }),
  import: async (
    source: File | { url?: string; text?: string },
    signal: AbortSignal,
    progress?: (stage: ProfileImportStage) => void,
  ): Promise<ProfileImport> => {
    const body =
      source instanceof File
        ? (() => {
            const data = new FormData();
            data.set("resume", source);
            return data;
          })()
        : JSON.stringify(source);
    const response = await fetch(`${API_URL}/api/profile/import`, {
      method: "POST",
      credentials: "include",
      signal,
      body,
      headers: {
        Accept: "application/x-ndjson",
        ...(source instanceof File
          ? {}
          : { "Content-Type": "application/json" }),
      },
    });
    if (
      response.ok &&
      response.headers.get("Content-Type")?.includes("application/x-ndjson") &&
      response.body
    ) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: ProfileImport | undefined;
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as ProfileImportEvent;
            if (event.type === "progress") progress?.(event.stage);
            else if (event.type === "result") result = event.result;
            else if (event.type === "error")
              throw new ProfileImportFailure(
                event.error,
                event.status,
                event.extractedText,
              );
          }
          if (done) break;
        }
        if (!result)
          throw new ProfileImportFailure(
            "The import connection ended early. Retry or continue manually.",
            503,
          );
        return result;
      } finally {
        await reader.cancel().catch(() => {});
      }
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ProfileImportFailure(
        result.error ??
          "Could not import this source. Try again or continue manually.",
        response.status,
        result.extractedText,
      );
    return result;
  },
};
export function useUserProfile() {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: !!session,
  });
}
