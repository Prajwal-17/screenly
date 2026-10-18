"use client";
import Link from "next/link";
import { safeProfileHref } from "@repo/shared";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserProfile } from "@/lib/profile";

export function ProfileSummary() {
  const profile = useUserProfile();
  const details = profile.data?.details;
  return (
    <section className="border-b py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base">Your profile</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href="/onboarding?edit=1">
            Edit profile
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
      {profile.isPending ? (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          Loading your profile…
        </p>
      ) : profile.isError && !details ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Could not load your profile.{" "}
          <Button
            variant="link"
            size="sm"
            onClick={() => void profile.refetch()}
          >
            Try again
          </Button>
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm">
            {details?.headline ||
              "Add your background to make practice feel more relevant."}
          </p>
          {!!details?.about && (
            <p className="mt-3 max-w-[65ch] whitespace-pre-wrap text-sm text-muted-foreground">
              {details.about}
            </p>
          )}
          {(details?.role || details?.level || details?.location) && (
            <p className="mt-2 text-xs text-muted-foreground">
              {[details.role, details.level, details.location]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {!!details?.stack.length && (
            <ul
              className="mt-4 flex flex-wrap gap-2"
              aria-label="Your technologies"
            >
              {details.stack.map((item) => (
                <li
                  key={item.toLowerCase()}
                  className="max-w-full break-words rounded-md bg-secondary px-2.5 py-1.5 text-xs"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
          {!!details?.goal && (
            <p className="mt-4 max-w-[65ch] whitespace-pre-wrap text-sm text-muted-foreground">
              {details.goal}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-5 text-sm">
            {[
              ["GitHub", details?.githubUrl],
              ["LinkedIn", details?.linkedinUrl],
              ["Portfolio", details?.portfolioUrl],
              ...(details?.otherLinks ?? []).map((link) => [
                link.label,
                link.url,
              ]),
            ].map(([label, url]) =>
              safeProfileHref(url) ? (
                <a
                  key={label}
                  href={safeProfileHref(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link underline-offset-4 hover:underline"
                >
                  {label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null,
            )}
          </div>
          {!!details?.projects.length && (
            <div className="mt-6 border-t pt-5">
              <h3 className="text-sm font-medium">Projects</h3>
              <ul className="mt-3 divide-y">
                {details.projects.map((project, index) => (
                  <li key={index} className="py-3">
                    <p className="text-sm font-medium">{project.name}</p>
                    {project.description && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[project.role, project.stack.join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-2 flex gap-4 text-sm">
                      {[
                        ["Live project", project.url],
                        ["Repository", project.repositoryUrl],
                      ].map(([label, url]) =>
                        safeProfileHref(url) ? (
                          <a
                            key={label}
                            href={safeProfileHref(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link underline-offset-4 hover:underline"
                          >
                            {label}
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : null,
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
