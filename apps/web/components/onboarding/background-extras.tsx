"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  normalizeProfileLink,
  type ProfileDetails,
  type ProfileProject,
} from "@repo/shared";
import { Button } from "@/components/ui/button";
import { ProfileField, ProjectEditor } from "./profile-fields";

export function BackgroundExtras({
  details,
  onChange,
  errors,
  disabled,
  projectIndex,
  onProjectIndex,
  initiallyOpen = false,
}: {
  details: ProfileDetails;
  onChange: (next: ProfileDetails) => void;
  errors: Record<string, string>;
  disabled: boolean;
  projectIndex: number | null;
  onProjectIndex: (index: number | null) => void;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const hasErrors = Object.keys(errors).some((key) =>
    /^(githubUrl|linkedinUrl|portfolioUrl|otherLinks|projects)/.test(key),
  );
  const link = (
    key: "githubUrl" | "linkedinUrl" | "portfolioUrl",
    label: string,
  ) => (
    <ProfileField
      id={"profile-" + key}
      label={label}
      value={details[key]}
      maxLength={2048}
      disabled={disabled}
      error={errors[key]}
      onChange={(value) => onChange({ ...details, [key]: value })}
      onBlur={() =>
        onChange({ ...details, [key]: normalizeProfileLink(details[key]) })
      }
    />
  );
  return (
    <details
      open={open || hasErrors}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="mt-6"
    >
      <summary className="w-fit cursor-pointer rounded-sm text-sm text-link underline-offset-4 hover:underline">
        Links and projects
      </summary>
      <div className="mt-6 space-y-8">
        <section className="space-y-5" aria-label="Profile links">
          {link("githubUrl", "GitHub")}
          {link("linkedinUrl", "LinkedIn")}
          {link("portfolioUrl", "Portfolio")}
          {details.otherLinks.map((item, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="grid min-w-0 flex-1 gap-4 xl:grid-cols-[140px_1fr]">
                <ProfileField
                  id={"extra-label-" + index}
                  label="Link label"
                  value={item.label}
                  maxLength={40}
                  disabled={disabled}
                  error={errors["otherLinks." + index + ".label"]}
                  onChange={(value) =>
                    onChange({
                      ...details,
                      otherLinks: details.otherLinks.map((link, i) =>
                        i === index ? { ...link, label: value } : link,
                      ),
                    })
                  }
                />
                <ProfileField
                  id={"extra-url-" + index}
                  label="URL"
                  value={item.url}
                  maxLength={2048}
                  disabled={disabled}
                  error={errors["otherLinks." + index + ".url"]}
                  onChange={(value) =>
                    onChange({
                      ...details,
                      otherLinks: details.otherLinks.map((link, i) =>
                        i === index ? { ...link, url: value } : link,
                      ),
                    })
                  }
                  onBlur={() =>
                    onChange({
                      ...details,
                      otherLinks: details.otherLinks.map((link, i) =>
                        i === index
                          ? { ...link, url: normalizeProfileLink(link.url) }
                          : link,
                      ),
                    })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={"Remove " + (item.label || "extra link")}
                onClick={() =>
                  onChange({
                    ...details,
                    otherLinks: details.otherLinks.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || details.otherLinks.length >= 8}
            onClick={() =>
              onChange({
                ...details,
                otherLinks: [...details.otherLinks, { label: "", url: "" }],
              })
            }
          >
            <Plus aria-hidden="true" />
            Add another link
          </Button>
        </section>
        <section aria-labelledby="onboarding-projects">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="onboarding-projects" className="type-section-title">
              Projects
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || details.projects.length >= 10}
              onClick={() => {
                onChange({
                  ...details,
                  projects: [
                    ...details.projects,
                    {
                      name: "",
                      description: "",
                      role: "",
                      stack: [],
                      url: "",
                      repositoryUrl: "",
                    },
                  ],
                });
                onProjectIndex(details.projects.length);
              }}
            >
              <Plus aria-hidden="true" />
              Add project
            </Button>
          </div>
          <ul className="divide-y">
            {details.projects.map((project, index) => (
              <li key={index} className="flex items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-base font-medium">
                    {project.name || "Untitled project"}
                  </h3>
                  {project.description && (
                    <p className="mt-2 line-clamp-2 type-ui text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  aria-label={"Edit " + (project.name || "project")}
                  onClick={() => onProjectIndex(index)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  aria-label={"Remove " + (project.name || "project")}
                  onClick={() =>
                    onChange({
                      ...details,
                      projects: details.projects.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <ProjectEditor
        project={
          projectIndex === null
            ? null
            : (details.projects[projectIndex] ?? null)
        }
        onClose={() => onProjectIndex(null)}
        onChange={(project: ProfileProject) =>
          onChange({
            ...details,
            projects: details.projects.map((item, index) =>
              index === projectIndex ? project : item,
            ),
          })
        }
        validationErrors={Object.fromEntries(
          Object.entries(errors)
            .filter(([key]) => key.startsWith("projects." + projectIndex + "."))
            .map(([key, message]) => [key.split(".")[2]!, message]),
        )}
      />
    </details>
  );
}
