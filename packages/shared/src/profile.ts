import { z } from "zod";

const hostIs = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);
export function profileURLIssue(
  value: string,
  kind: "source" | "github" | "linkedin" | "portfolio" = "source",
) {
  if (!value.trim()) return "Enter a profile or portfolio link.";
  let url: URL;
  try {
    const text = value.trim();
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
  } catch {
    return "Enter a valid https:// profile or portfolio link.";
  }
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !host.includes(".") ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) ||
    /^[\d.]+$/.test(host) ||
    host.includes(":")
  )
    return "Use a public https:// profile or portfolio link.";
  if (kind === "github" || (kind === "source" && hostIs(host, "github.com"))) {
    if (
      !["github.com", "www.github.com"].includes(host) ||
      !/^\/[a-z\d](?:[a-z\d-]{0,38})\/?$/i.test(url.pathname) ||
      /^(settings|login|signup|explore|features|topics|marketplace|organizations|orgs|collections|sponsors)$/i.test(
        url.pathname.split("/")[1] ?? "",
      )
    )
      return "Use your GitHub profile, such as github.com/your-name, rather than a repository or another page.";
  }
  if (
    kind === "linkedin" ||
    (kind === "source" && hostIs(host, "linkedin.com"))
  ) {
    if (!hostIs(host, "linkedin.com") || !/^\/in\/[^/]+\/?$/.test(url.pathname))
      return "Use your personal LinkedIn profile, such as linkedin.com/in/your-name.";
  }
  if (kind === "source" || kind === "portfolio") {
    if (
      [
        "youtube.com",
        "youtu.be",
        "tiktok.com",
        "instagram.com",
        "facebook.com",
        "twitter.com",
        "x.com",
        "vimeo.com",
        "spotify.com",
        "netflix.com",
        "amazon.com",
        "google.com",
        "bing.com",
        "reddit.com",
        "pinterest.com",
        "bit.ly",
        "t.co",
        "tinyurl.com",
      ].some((domain) => hostIs(host, domain))
    )
      return "That link isn’t a profile or portfolio. Use a personal website, GitHub profile, or LinkedIn profile.";
    if (/\.(mp4|mp3|png|jpe?g|gif|zip|exe|pdf|docx?)(?:$)/i.test(url.pathname))
      return "Use a profile webpage. Upload resume documents using the Resume option.";
  }
  return null;
}
export function normalizeProfileLink(value: string) {
  const text = value.trim();
  if (!text) return "";
  try {
    return new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`,
    ).toString();
  } catch {
    return text;
  }
}
export function safeProfileHref(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}
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
const profileLink = (kind: "github" | "linkedin" | "portfolio") =>
  link.refine((value) => !value || !profileURLIssue(value, kind), {
    error: (issue) =>
      profileURLIssue(String(issue.input), kind) ?? "Use a valid profile link.",
  });
const stack = z
  .array(z.string().trim().min(1).max(40))
  .max(30)
  .transform((values) => [
    ...new Map(values.map((value) => [value.toLowerCase(), value])).values(),
  ]);
export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Give this project a name.").max(100),
    description: z.string().trim().max(1000).default(""),
    role: z.string().trim().max(100).default(""),
    stack: stack.default([]),
    url: link.default(""),
    repositoryUrl: link
      .refine(
        (value) =>
          !value || /^https:\/\/(www\.)?github\.com\/[^/]+\/[^/]+/.test(value),
        "Use a GitHub repository link.",
      )
      .default(""),
  })
  .strict();
export type ProfileProject = z.infer<typeof projectSchema>;
export const otherLinkSchema = z
  .object({
    label: z.string().trim().min(1, "Add a link label.").max(40),
    url: link.refine(Boolean, "Add a link."),
  })
  .strict();
export const profileDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(80),
    headline: z.string().trim().max(120),
    location: z.string().trim().max(120),
    about: z.string().trim().max(1500).default(""),
    role: z.enum(["", "Frontend", "Backend", "Full-stack"]),
    level: z.enum(["", "Junior", "Mid-level", "Senior"]),
    stack,
    githubUrl: profileLink("github"),
    linkedinUrl: profileLink("linkedin"),
    portfolioUrl: profileLink("portfolio"),
    otherLinks: z.array(otherLinkSchema).max(8).default([]),
    projects: z.array(projectSchema).max(10).default([]),
    goal: z.string().trim().max(500),
  })
  .strict();
export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
// Drafts accept unfinished names and links; completion uses strict validation.
export const profileDraftSchema = profileDetailsSchema.extend({
  name: z.string().max(80),
  githubUrl: z.string().max(2048),
  linkedinUrl: z.string().max(2048),
  portfolioUrl: z.string().max(2048),
  projects: z
    .array(
      projectSchema.extend({
        name: z.string().max(100),
        url: z.string().max(2048),
        repositoryUrl: z.string().max(2048),
      }),
    )
    .max(10)
    .default([]),
  otherLinks: z
    .array(
      z
        .object({ label: z.string().max(40), url: z.string().max(2048) })
        .strict(),
    )
    .max(8)
    .default([]),
});
export const profileSuggestionsSchema = profileDetailsSchema.partial();
export type ProfileSuggestions = z.infer<typeof profileSuggestionsSchema>;
export const profileImportSchema = z
  .object({
    suggestions: profileSuggestionsSchema,
    source: z.string().max(100),
    extractedCharacters: z.number().int().min(0).max(30000).default(0),
  })
  .strict();
export type ProfileImport = z.infer<typeof profileImportSchema>;
export const onboardingStateSchema = z
  .object({
    step: z.number().int().min(0).max(5).default(0),
    pendingImport: profileImportSchema.nullable().default(null),
    importSelection: z.array(z.string().max(32)).max(14).optional(),
  })
  .strict();
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export const profileSaveSchema = z
  .object({
    details: profileDraftSchema,
    complete: z.boolean().default(false),
    onboarding: onboardingStateSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.complete) {
      const result = profileDetailsSchema.safeParse(value.details);
      if (!result.success)
        for (const issue of result.error.issues)
          ctx.addIssue({ ...issue, path: ["details", ...issue.path] });
      if (value.onboarding?.pendingImport)
        ctx.addIssue({
          code: "custom",
          path: ["onboarding"],
          message: "Review or discard your AI suggestions before finishing.",
        });
    }
  });
export type UserProfile = {
  details: ProfileDetails;
  status: "new" | "draft" | "complete" | "skipped";
  onboarding: OnboardingState;
  completedAt: number | null;
  updatedAt: number | null;
};
export type ProfileImportStage = "uploading" | "extracting" | "analyzing";
export type ProfileImportEvent =
  | { type: "progress"; stage: ProfileImportStage }
  | { type: "result"; result: ProfileImport }
  | { type: "error"; error: string; status: number; extractedText?: string };
export function emptyProfile(name = ""): ProfileDetails {
  return {
    name,
    headline: "",
    location: "",
    about: "",
    role: "",
    level: "",
    stack: [],
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    otherLinks: [],
    projects: [],
    goal: "",
  };
}
