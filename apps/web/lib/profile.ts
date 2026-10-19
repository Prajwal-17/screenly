"use client";
import { useQuery } from "@tanstack/react-query";
import type { ProfileDetails, ProfileImport, UserProfile } from "@repo/shared";
import { authClient } from "./auth-client";
import { API_URL, ApiError, request } from "./api";

export const profileApi = {
  get: () => request<UserProfile>("/profile"),
  save: (details: ProfileDetails, complete = false) =>
    request<UserProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify({ details, complete }),
    }),
  skip: () =>
    request<UserProfile>("/profile/skip", { method: "POST", body: "{}" }),
  import: async (
    source: File | { url?: string; text?: string },
    signal: AbortSignal,
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
      headers:
        source instanceof File ? {} : { "Content-Type": "application/json" },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ApiError(
        result.error ??
          "Could not import this source. Try again or continue manually.",
        response.status,
      );
    return result;
  },
};
export function useUserProfile() {
  const { data: session } = authClient.useSession();
  return useQuery({
    queryKey: ["profile", session?.user.id],
    queryFn: profileApi.get,
    enabled: !!session,
  });
}
