"use client";
import {
  type ProfileDetails,
  type ProfileImport,
  type ProfileSuggestions,
} from "@repo/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const labels: Record<string, string> = {
  name: "Name",
  headline: "Headline",
  location: "Location",
  about: "About you",
  role: "Target role",
  level: "Experience",
  stack: "Technologies",
  githubUrl: "GitHub",
  linkedinUrl: "LinkedIn",
  portfolioUrl: "Portfolio",
  otherLinks: "Other links",
  projects: "Projects",
  goal: "Practice goal",
};
function display(key: string, value: unknown) {
  if (key === "projects")
    return (value as ProfileDetails["projects"])
      .map((x) =>
        [
          x.name,
          x.description,
          x.role,
          x.stack.join(", "),
          x.url,
          x.repositoryUrl,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n");
  if (key === "otherLinks")
    return (value as ProfileDetails["otherLinks"])
      .map((x) => `${x.label}: ${x.url}`)
      .join("\n");
  return Array.isArray(value) ? value.join(", ") : String(value);
}
export function ImportReview({
  result,
  onSelection,
  selection,
}: {
  result: ProfileImport;
  selection: string[];
  onSelection: (keys: string[]) => void;
}) {
  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">
        From {result.source} · {result.extractedCharacters.toLocaleString()}{" "}
        characters read. Choose what to use.
      </p>
      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Profile preview</TabsTrigger>
          <TabsTrigger value="json">Formatted JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <div className="divide-y">
            {Object.entries(result.suggestions)
              .filter(([, value]) =>
                Array.isArray(value) ? value.length : !!value,
              )
              .map(([key, value]) => (
                <div key={key} className="flex gap-3 py-4 first:pt-0">
                  <Checkbox
                    id={`import-${key}`}
                    checked={selection.includes(key)}
                    onCheckedChange={(checked) =>
                      onSelection(
                        checked
                          ? [...selection, key]
                          : selection.filter((x) => x !== key),
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`import-${key}`}>
                      {labels[key] ?? key}
                    </Label>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-secondary">
                      {display(key, value)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
        <TabsContent value="json">
          <pre
            className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all"
            aria-label="Formatted AI response"
          >
            {JSON.stringify(result.suggestions, null, 2)}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}
export function mergeSuggestions(
  prior: ProfileDetails,
  suggestions: ProfileSuggestions,
  selection: string[],
): ProfileDetails {
  const next = { ...prior };
  for (const key of selection) {
    const value = suggestions[key as keyof ProfileSuggestions];
    if (value !== undefined) Object.assign(next, { [key]: value });
  }
  return next;
}
export function ProfileReview({
  details,
  onEdit,
}: {
  details: ProfileDetails;
  onEdit?: (step: number) => void;
}) {
  const sections = [
    {
      title: "About you",
      step: 1,
      entries: [
        details.name,
        details.headline,
        details.location,
        details.about,
      ],
    },
    {
      title: "Your links",
      step: 2,
      entries: [
        details.githubUrl,
        details.linkedinUrl,
        details.portfolioUrl,
        ...details.otherLinks.map((x) => `${x.label}: ${x.url}`),
      ],
    },
    {
      title: "Projects",
      step: 3,
      entries: details.projects.map((x) =>
        [
          x.name,
          x.description,
          x.role,
          x.stack.join(", "),
          x.url,
          x.repositoryUrl,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    },
    {
      title: "Practice focus",
      step: 4,
      entries: [
        [details.role, details.level].filter(Boolean).join(" · "),
        details.stack.join(", "),
        details.goal,
      ],
    },
  ];
  return (
    <div className="divide-y">
      {sections.map((section) => (
        <section key={section.title} className="py-5 first:pt-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{section.title}</h2>
            {onEdit && (
              <button
                type="button"
                className="relative min-h-9 rounded-sm px-2 text-xs text-link underline-offset-4 hover:underline"
                onClick={() => onEdit(section.step)}
              >
                Edit
                <span className="sr-only"> {section.title.toLowerCase()}</span>
              </button>
            )}
          </div>
          {section.entries.filter(Boolean).length ? (
            section.entries.filter(Boolean).map((entry, index) => (
              <p
                key={index}
                className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-secondary"
              >
                {entry}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Not added</p>
          )}
        </section>
      ))}
    </div>
  );
}
