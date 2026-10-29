export const roles = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Mobile Engineering",
  "DevOps / Platform Engineering",
  "Data Engineering",
] as const;
export const levels = ["Junior", "Mid-level", "Senior"] as const;
export type InterviewRole = (typeof roles)[number];
export type ExperienceLevel = (typeof levels)[number];

export const RUBRIC_VERSION = "screenly-rubric-2.0";
export const PROMPT_VERSION = "screenly-prompts-2.0";
export const DEFAULT_SESSION_MINUTES = 20;
export const MEMORY_SELECTED_LIMIT = 3;
export const MEMORY_RETAINED_LIMIT = 12;
// Conservative input ceiling, not a provider-specific token measurement.
export const LIVE_CONTEXT_CHARACTER_LIMIT = 96_000;
export const REVIEW_CONTEXT_CHARACTER_LIMIT = 160_000;
export const CLOSING_TIMEOUT_MS = 8_000;

export const reviewDimensions = [
  "technical-understanding",
  "decision-reasoning",
  "problem-solving",
  "adaptability",
  "clarity",
] as const;

const focusByRole: Record<InterviewRole, readonly string[]> = {
  Frontend: [
    "State and asynchronous UI",
    "Accessibility and recovery",
    "Browser performance and verification",
  ],
  Backend: [
    "API and ownership boundaries",
    "Data integrity and concurrency",
    "Reliability and recovery",
  ],
  "Full-stack": [
    "End-to-end contracts",
    "State and authentication boundaries",
    "Cross-stack diagnosis and recovery",
  ],
  "Mobile Engineering": [
    "Lifecycle and application state",
    "Offline synchronization",
    "Device constraints and recovery",
  ],
  "DevOps / Platform Engineering": [
    "Safe delivery and rollback",
    "Operational diagnosis",
    "Failure isolation and recovery",
  ],
  "Data Engineering": [
    "Pipeline contracts and quality",
    "Schema evolution and repeated input",
    "Backfills and recovery verification",
  ],
};

export const rolePresets = roles.map((role) => ({
  id: role,
  label: role,
  version: RUBRIC_VERSION,
  objectives: focusByRole[role],
  criterionIds: reviewDimensions.map((dimension) => `${role}:${dimension}`),
}));

export function rolePreset(role: InterviewRole) {
  return rolePresets.find((preset) => preset.id === role)!;
}
