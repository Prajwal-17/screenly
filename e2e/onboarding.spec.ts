import { expect, test, type Page } from "@playwright/test";
import { signInForTest } from "./session-fixture";
import { backendURL } from "./environment";

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function capture(page: Page, name: string) {
  if (!process.env.CAPTURE_ONBOARDING) return;
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `apps/web/.impeccable/review/onboarding-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

test("new members can complete, resume, and edit a personal profile", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(
    page.getByRole("heading", { name: "A good place to start." }),
  ).toBeVisible();
  await capture(page, "import-desktop");
  await page.setViewportSize({ width: 360, height: 800 });
  await noOverflow(page);
  await capture(page, "import-mobile");
  await page.getByRole("button", { name: "Enter details myself" }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Ada Lovelace");
  await page
    .getByLabel("Headline (optional)", { exact: true })
    .fill("Platform engineer");
  await page.getByLabel("Location (optional)", { exact: true }).fill("London");
  await page
    .getByLabel("GitHub", { exact: true })
    .fill("https://github.com/ada");
  await page
    .getByLabel("LinkedIn", { exact: true })
    .fill("https://linkedin.com/in/ada");
  await noOverflow(page);
  await capture(page, "profile-mobile");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "Ada Lovelace",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Target role", { exact: true }).selectOption("Backend");
  await page
    .getByLabel("Experience level", { exact: true })
    .selectOption("Senior");
  await page.getByRole("button", { name: "Python", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Add a technology", exact: true })
    .fill("PostgreSQL");
  await page
    .getByRole("button", { name: "Add technology", exact: true })
    .click();
  await page
    .getByLabel("What would you like to work on? (optional)")
    .fill("Explain system design trade-offs clearly.");
  await noOverflow(page);
  await capture(page, "focus-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "focus-desktop");
  await page.getByRole("button", { name: "Continue to practice" }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Senior", exact: true }),
  ).toBeChecked();
  const saved = await (
    await page.request.get(`${backendURL}/api/profile`)
  ).json();
  expect(saved.status).toBe("complete");
  expect(saved.details.stack).toEqual(["Python", "PostgreSQL"]);
  await page.goto("/settings");
  await expect(
    page.getByText("Platform engineer", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "Ada Lovelace",
  );
  await page
    .getByLabel("Headline (optional)", { exact: true })
    .fill("Senior platform engineer");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByText("Senior platform engineer", { exact: true }),
  ).toBeVisible();
  await capture(page, "settings-desktop");
});

test("resume import uses AI, remains editable, and never stores the original source", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Senior backend engineer in London. Python and SQL. RAW_RESUME_MARKER_NOT_TO_STORE. Experienced at building reliable systems.",
    ),
  });
  await expect(
    page.getByLabel("Headline (optional)", { exact: true }),
  ).toHaveValue("Backend engineer");
  await expect(
    page.getByText("Drafted from resume.", { exact: false }),
  ).toBeVisible();
  await capture(page, "review-desktop");
  await page
    .getByLabel("Headline (optional)", { exact: true })
    .fill("My edited headline");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Target role", { exact: true })).toHaveValue(
    "Backend",
  );
  await expect(
    page.getByRole("button", { name: "Remove Python", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to practice" }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  const saved = await (
    await page.request.get(`${backendURL}/api/profile`)
  ).json();
  expect(saved.details.headline).toBe("My edited headline");
  expect(JSON.stringify(saved)).not.toContain("RAW_RESUME_MARKER_NOT_TO_STORE");
});

test("unreadable links and unavailable providers leave manual entry and skip available", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await page.route("**/api/profile/import", (route) =>
    route.fulfill({
      status: 422,
      json: {
        error:
          "That profile isn’t publicly readable. Upload a resume or paste your profile text instead.",
      },
    }),
  );
  await page
    .getByLabel("Or use a profile link", { exact: true })
    .fill("https://linkedin.com/in/private-profile");
  await page.getByRole("button", { name: "Use link", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "isn’t publicly readable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enter details myself" }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("pasted source analysis failures keep the source and a retry path", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await page.getByText("Paste profile text instead", { exact: true }).click();
  const text =
    "PROFILE_PROVIDER_FAILURE: A senior backend engineer with Python and SQL experience in London.";
  await page
    .getByRole("textbox", { name: "Profile or resume text" })
    .fill(text);
  await page.getByRole("button", { name: "Draft my profile" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "couldn’t draft your profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Profile or resume text" }),
  ).toHaveValue(text);
  await expect(
    page.getByRole("button", { name: "Enter details myself" }),
  ).toBeEnabled();
});
