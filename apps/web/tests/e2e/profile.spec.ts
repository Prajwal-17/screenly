import { emptyProfile } from "@repo/shared";
import { test, expect, now } from "./fixtures";

test.beforeEach(async ({ api }) => {
  api.profile.status = "new";
  api.profile.details = emptyProfile("Alex Morgan");
  api.profile.onboarding = { step: 0, pendingImport: null };
});

test("six manual steps validate, save repeated fields, and finish without losing data", async ({
  page,
  api,
}) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page.getByRole("textbox", { name: "Your name", exact: true }).fill("");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Alex Test");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add another link" }).click();
  await page
    .getByRole("textbox", { name: "Link label", exact: true })
    .fill("Writing");
  await page
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("http://example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "URL", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: "URL", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page
    .getByRole("textbox", { name: "URL", exact: true })
    .fill("https://example.com/writing");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  const project = page.getByRole("dialog", { name: "Project details" });
  await project.getByRole("button", { name: "Done", exact: true }).click();
  await expect(project.getByText("Give this project a name.")).toBeVisible();
  await expect(
    project.getByRole("textbox", { name: "Project name", exact: true }),
  ).toBeFocused();
  await project
    .getByRole("textbox", { name: "Project name", exact: true })
    .fill("Accessible editor");
  const projectUrl = project.getByRole("textbox", {
    name: "Live URL (optional)",
  });
  await projectUrl.fill("http://example.com");
  await project.getByRole("button", { name: "Done", exact: true }).click();
  await expect(projectUrl).toBeFocused();
  await expect(projectUrl).toHaveAttribute("aria-invalid", "true");
  await projectUrl.fill("https://example.com");
  await project.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Backend", exact: true }).click();
  await page.getByRole("radio", { name: "Senior", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review profile", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  expect(api.profile.status).toBe("complete");
  expect(api.profile.details.name).toBe("Alex Test");
  expect(api.profile.details.projects[0]?.name).toBe("Accessible editor");
  expect(api.profile.details.otherLinks).toEqual([
    { label: "Writing", url: "https://example.com/writing" },
  ]);
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
});

for (const source of ["text", "file", "url"] as const) {
  test(`${source} import requires selection and explicit approval; JSON remains available`, async ({
    page,
    api,
  }) => {
    await page.goto("/onboarding");
    if (source === "text") {
      await page.getByRole("tab", { name: "Paste text", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Resume or profile text" })
        .fill(
          "Synthetic resume: I build accessible applications with Python and React.",
        );
      await page
        .getByRole("button", { name: "Analyze text", exact: true })
        .click();
    } else if (source === "file") {
      await expect(
        page.getByLabel("Upload resume", { exact: true }),
      ).toBeEnabled();
      await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
        name: "resume.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(
          "Synthetic resume: I build accessible applications with Python and React.",
        ),
      });
    } else {
      await page
        .getByRole("tab", { name: "Profile link", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Your profile or portfolio URL" })
        .fill("https://github.com/alex-test");
      await page
        .getByRole("button", { name: "Analyze profile", exact: true })
        .click();
    }
    await expect(
      page.getByRole("heading", { name: "Review suggestions", exact: true }),
    ).toBeVisible();
    expect(api.profile.details.name).toBe("Alex Morgan");
    await page
      .getByRole("tab", { name: "Formatted JSON", exact: true })
      .click();
    await expect(page.getByLabel("Formatted AI response")).toContainText(
      "Imported Name",
    );
    await page
      .getByRole("tab", { name: "Profile preview", exact: true })
      .click();
    await page.getByRole("checkbox", { name: "Name", exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Approve & continue", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Your name", exact: true }),
    ).toHaveValue("Alex Morgan");
    await expect(
      page.getByRole("textbox", { name: "Professional headline" }),
    ).toHaveValue("Imported headline");
  });
}

test("import validation, provider failure, cancellation, and empty extraction keep manual entry available", async ({
  page,
  api,
}) => {
  await page.goto("/onboarding");
  await expect(page.getByLabel("Upload resume", { exact: true })).toBeEnabled();
  await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
    name: "image.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid"),
  });
  await expect(
    page.getByText("Choose a PDF, DOCX, DOC, or TXT resume up to 5 MB."),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Profile link", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your profile or portfolio URL" })
    .fill("https://youtube.com/watch?v=test");
  await page
    .getByRole("button", { name: "Analyze profile", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "isn’t a profile or portfolio" }),
  ).toBeVisible();
  expect(api.requests.some((r) => r.path.endsWith("/import"))).toBe(false);
  await page.getByRole("tab", { name: "Paste text", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Resume or profile text" })
    .fill(
      "Synthetic resume with enough text for the profile analysis request.",
    );
  api.importFailure = {
    status: 503,
    error: "Analysis unavailable. Retry or continue manually.",
  };
  await page.getByRole("button", { name: "Analyze text", exact: true }).click();
  await expect(
    page.getByText("Analysis unavailable. Retry or continue manually."),
  ).toBeVisible();
  let release!: () => void;
  api.holds.set(
    "POST /api/profile/import",
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  await page.getByRole("button", { name: /Retry/ }).click();
  await page.getByRole("button", { name: /Cancel/ }).click();
  await expect(
    page.getByRole("button", { name: "Analyze text", exact: true }),
  ).toBeVisible();
  api.holds.delete("POST /api/profile/import");
  release();
  api.importFailure = {
    status: 422,
    error: "No readable profile details were found.",
  };
  await page.getByRole("button", { name: "Analyze text", exact: true }).click();
  await expect(
    page.getByText("No readable profile details were found."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await expect(
    page.getByRole("heading", { name: "About you", exact: true }),
  ).toBeVisible();
});

test("failed autosave recovers device draft across refresh and retries", async ({
  page,
  api,
}) => {
  api.failures.set("PUT /api/profile", { status: 503, error: "Offline" });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Recovered Alex");
  await expect(
    page.getByText("Sync failed.", { exact: false }).filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toHaveValue("Recovered Alex");
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  api.failures.delete("PUT /api/profile");
  await page
    .getByRole("button", { name: "Retry", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByText("All changes saved", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  expect(api.profile.details.name).toBe("Recovered Alex");
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(api.profile.status).toBe("skipped");
});

test("editing a complete profile restores existing values and saves to settings", async ({
  page,
  api,
}) => {
  api.profile.status = "complete";
  api.profile.updatedAt = now;
  api.profile.onboarding.step = 5;
  await page.goto("/onboarding?edit=1");
  await expect(
    page.getByRole("textbox", { name: "Your name", exact: true }),
  ).toHaveValue("Alex Morgan");
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Edited Alex");
  for (let step = 1; step < 5; step++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  expect(api.profile.details.name).toBe("Edited Alex");
  expect(api.profile.status).toBe("complete");
});
