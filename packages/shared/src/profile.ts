import { z } from "zod";

const link = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use a full https:// link.");
const host = (value: string) => {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
};
const github = link.refine(
  (value) => !value || ["github.com", "www.github.com"].includes(host(value)),
  "Use a github.com profile link.",
);
const linkedin = link.refine(
  (value) => !value || /(^|\.)linkedin\.com$/.test(host(value)),
  "Use a linkedin.com profile link.",
);

export const profileDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(80),
    headline: z.string().trim().max(120),
    location: z.string().trim().max(120),
    role: z.enum(["", "Frontend", "Backend", "Full-stack"]),
    level: z.enum(["", "Junior", "Mid-level", "Senior"]),
    stack: z
      .array(z.string().trim().min(1).max(40))
      .max(30)
      .transform((values) => [
        ...new Map(
          values.map((value) => [value.toLowerCase(), value]),
        ).values(),
      ]),
    githubUrl: github,
    linkedinUrl: linkedin,
    portfolioUrl: link,
    goal: z.string().trim().max(500),
  })
  .strict();
export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
export const profileSuggestionsSchema = profileDetailsSchema.partial();
export type ProfileSuggestions = z.infer<typeof profileSuggestionsSchema>;
export const profileSaveSchema = z
  .object({
    details: profileDetailsSchema,
    complete: z.boolean().default(false),
  })
  .strict();
export type UserProfile = {
  details: ProfileDetails;
  status: "new" | "draft" | "complete" | "skipped";
  completedAt: number | null;
  updatedAt: number | null;
};
export type ProfileImport = {
  suggestions: ProfileSuggestions;
  source: string;
};
export function emptyProfile(name = ""): ProfileDetails {
  return {
    name,
    headline: "",
    location: "",
    role: "",
    level: "",
    stack: [],
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    goal: "",
  };
}
