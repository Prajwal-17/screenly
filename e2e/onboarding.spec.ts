import { expect, test, type Page } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { signInForTest } from "./session-fixture";
import { backendURL } from "./environment";

async function fit(page: Page) {
  expect(
    await page.evaluate(() => ({
      horizontal: document.documentElement.scrollWidth <= innerWidth,
      vertical: document.documentElement.scrollHeight <= innerHeight,
    })),
  ).toEqual({ horizontal: true, vertical: true });
  await expect(
    page
      .getByRole("button", {
        name: /^(Continue|Approve|Enter details|Finish setup)/,
      })
      .last(),
  ).toBeInViewport();
}
async function capture(page: Page, name: string) {
  if (!process.env.CAPTURE_ONBOARDING) return;
  if (
    process.env.CAPTURE_ONBOARDING === "settings" &&
    name !== "settings-desktop"
  )
    return;
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.screenshot({
    path: `apps/web/.impeccable/review/onboarding-v2-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function saved(page: Page) {
  await expect(
    page.getByText("All changes saved").filter({ visible: true }),
  ).toBeVisible();
}
async function next(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function manual(page: Page) {
  await page
    .getByRole("button", { name: "Enter details manually", exact: true })
    .click();
}
const resumeText =
  "Maya Chen - Senior Backend Engineer in London. Builds reliable distributed systems using Python, PostgreSQL and Docker. Project Relay: built a queue monitoring dashboard and its Python API. RAW_SOURCE_NOT_TO_STORE. GitHub: https://github.com/example-candidate.";

test("detailed manual onboarding autosaves unfinished fields and projects, resumes the exact step, and seeds practice", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding$/);
  await fit(page);
  await capture(page, "desktop");
  await page.setViewportSize({ width: 360, height: 800 });
  await fit(page);
  await capture(page, "import-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });
  await manual(page);
  await page.getByLabel("Your name", { exact: true }).fill("Ada Lovelace");
  await page.getByLabel("Professional headline").fill("Platform engineer");
  await page.getByLabel("Location", { exact: false }).fill("London");
  await page
    .getByRole("textbox", { name: "About you (optional)", exact: true })
    .fill(
      "I build reliable platforms and enjoy explaining technical trade-offs.",
    );
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "Ada Lovelace",
  );
  await capture(page, "about-desktop");
  await next(page);
  await page.getByLabel("GitHub", { exact: false }).fill("https://github.com/");
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("GitHub", { exact: false })).toHaveValue(
    "https://github.com/",
  );
  await page
    .getByLabel("GitHub", { exact: false })
    .fill("https://github.com/ada");
  await page
    .getByLabel("LinkedIn", { exact: false })
    .fill("https://linkedin.com/in/ada");
  await page.getByRole("button", { name: "Add another link" }).click();
  await page.getByLabel("Link label", { exact: true }).fill("Blog");
  await page
    .getByLabel("URL", { exact: true })
    .fill("https://ada.example/blog");
  await next(page);
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await page
    .getByLabel("Project name", { exact: true })
    .fill("Analytical Engine");
  await page
    .getByLabel("What did you build?")
    .fill("A program that computes Bernoulli numbers.");
  await page.getByLabel("Your contribution").fill("Designed the algorithm");
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Analytical Engine", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Analytical Engine" }).click();
  await expect(page.getByLabel("What did you build?")).toHaveValue(
    "A program that computes Bernoulli numbers.",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Second project");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByText("2 projects added", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove Second project", exact: true })
    .click();
  await capture(page, "projects-desktop");
  await next(page);
  await page.getByRole("radio", { name: "Backend", exact: true }).check();
  await page.getByRole("radio", { name: "Senior", exact: true }).check();
  await page.getByRole("button", { name: "Python", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Add a technology", exact: true })
    .fill("PostgreSQL");
  await page
    .getByRole("button", { name: "Add technology", exact: true })
    .click();
  await page
    .getByLabel("What would you like to work on?")
    .fill("Explain system design trade-offs clearly.");
  await fit(page);
  await capture(page, "focus-desktop");
  await page.setViewportSize({ width: 1280, height: 720 });
  await fit(page);
  expect(
    await page
      .getByLabel("Practice focus content", { exact: true })
      .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  await capture(page, "compact-desktop");
  await page.setViewportSize({ width: 360, height: 800 });
  await fit(page);
  await capture(page, "mobile");
  await next(page);
  await expect(
    page.getByText("Analytical Engine", { exact: false }),
  ).toBeVisible();
  await fit(page);
  await capture(page, "review-mobile");
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Senior", exact: true }),
  ).toBeChecked();
  const data = await (
    await page.request.get(`${backendURL}/api/profile`)
  ).json();
  expect(data.status).toBe("complete");
  expect(data.details.projects[0].name).toBe("Analytical Engine");
  expect(data.details.otherLinks[0].label).toBe("Blog");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings");
  await expect(
    page.getByText("A program that computes Bernoulli numbers."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await page
    .getByLabel("Professional headline")
    .fill("Senior platform engineer");
  for (let i = 0; i < 4; i++) await next(page);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByText("Senior platform engineer", { exact: true }),
  ).toBeVisible();
  await capture(page, "settings-desktop");
});

test("a real compressed PDF streams progress and exposes AI data for approval before applying it", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(
    `<html><body><h1>Maya Chen</h1><p>${resumeText}</p><h2>Projects</h2><p>Relay: queue monitoring dashboard.</p><a href="https://maya.example/hidden-pdf-target">Portfolio</a></body></html>`,
  );
  const pdf = await page.pdf({ format: "A4" });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await expect(page.getByLabel("Upload resume", { exact: true })).toBeEnabled();
  await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await expect(
    page.getByText("Organizing your profile with AI…", { exact: true }),
  ).toBeVisible();
  await capture(page, "processing-desktop");
  await expect(
    page.getByRole("heading", { name: "Here’s what we found." }),
  ).toBeVisible();
  await fit(page);
  await capture(page, "ai-desktop");
  await page.getByRole("tab", { name: "Formatted JSON", exact: true }).click();
  await expect(page.getByLabel("Formatted AI response")).toContainText(
    '"projects"',
  );
  await expect(page.getByLabel("Formatted AI response")).toContainText(
    '"name": "Maya Chen"',
  );
  await page.getByRole("tab", { name: "Profile preview", exact: true }).click();
  await saved(page);
  let data = await (await page.request.get(`${backendURL}/api/profile`)).json();
  expect(data.details.headline).toBe("");
  expect(data.onboarding.pendingImport.suggestions.headline).toBe(
    "Backend engineer",
  );
  expect(data.onboarding.pendingImport.suggestions.portfolioUrl).toBe(
    "https://maya.example/hidden-pdf-target",
  );
  expect(data.onboarding.pendingImport.extractedCharacters).toBeGreaterThan(
    100,
  );
  expect(JSON.stringify(data)).not.toContain("RAW_SOURCE_NOT_TO_STORE");
  await page.getByRole("checkbox", { name: "Location", exact: true }).uncheck();
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Here’s what we found." }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Location", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Approve & continue" }).click();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "Maya Chen",
  );
  await expect(page.getByLabel("Location", { exact: false })).toHaveValue("");
  await expect(page.getByLabel("Professional headline")).toHaveValue(
    "Backend engineer",
  );
  await page.getByLabel("Professional headline").fill("My edited headline");
  for (let i = 0; i < 4; i++) await next(page);
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  data = await (await page.request.get(`${backendURL}/api/profile`)).json();
  expect(data.details.headline).toBe("My edited headline");
  expect(data.details.projects[0].name).toBe("Relay");
  expect(data.onboarding.pendingImport).toBeNull();
});

test("Word DOCX uploads extract real paragraphs and can be discarded without changing the profile", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  const zip = zipSync({
    "word/document.xml": strToU8(
      `<w:document><w:p><w:r><w:t>${resumeText}</w:t></w:r></w:p></w:document>`,
    ),
  });
  await expect(page.getByLabel("Upload resume", { exact: true })).toBeEnabled();
  await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
    name: "resume.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from(zip),
  });
  await expect(
    page.getByRole("heading", { name: "Here’s what we found." }),
  ).toBeVisible();
  await expect(page.getByText(/From DOCX resume/)).toBeVisible();
  await fit(page);
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await manual(page);
  await expect(page.getByLabel("Professional headline")).toHaveValue("");
});

test("wrong URLs, unreadable profiles, invalid files and missing required details show actionable errors", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await page.getByRole("tab", { name: "Profile link", exact: true }).click();
  for (const url of [
    "https://youtube.com/watch?v=abc",
    "https://github.com/ada/a-repo",
    "https://linkedin.com/company/acme",
  ]) {
    await page.getByLabel("Your profile or portfolio URL").fill(url);
    await page
      .getByRole("button", { name: "Analyze profile", exact: true })
      .click();
    await expect(page.locator("main").getByRole("alert")).toBeVisible();
  }
  await page
    .getByLabel("Your profile or portfolio URL")
    .fill("https://youtube.com/watch?v=abc");
  await page
    .getByRole("button", { name: "Analyze profile", exact: true })
    .click();
  await capture(page, "url-error-desktop");
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
    .getByLabel("Your profile or portfolio URL")
    .fill("https://linkedin.com/in/private-profile");
  await page
    .getByRole("button", { name: "Analyze profile", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "isn’t publicly readable",
  );
  await page.unroute("**/api/profile/import");
  await page.getByRole("tab", { name: "Resume", exact: true }).click();
  await expect(page.getByLabel("Upload resume", { exact: true })).toBeEnabled();
  await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
    name: "fake.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "does not appear to be a PDF",
  );
  await manual(page);
  await page.getByLabel("Your name", { exact: true }).fill("");
  await next(page);
  await expect(page.getByText("Enter your name.").last()).toBeVisible();
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("provider errors preserve extracted text, retry, and manual entry", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await page.getByRole("tab", { name: "Paste text", exact: true }).click();
  await page
    .getByLabel("Resume or profile text")
    .fill(`PROFILE_PROVIDER_FAILURE: ${resumeText}`);
  await page.getByRole("button", { name: "Analyze text", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "couldn’t draft your profile",
  );
  await page
    .getByRole("button", { name: "View extracted text", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "RAW_SOURCE_NOT_TO_STORE",
  );
  await page
    .getByRole("button", { name: "Close extracted resume text" })
    .click();
  await expect(page.getByLabel("Resume or profile text")).toHaveValue(
    `PROFILE_PROVIDER_FAILURE: ${resumeText}`,
  );
  await fit(page);
  await capture(page, "error-mobile");
  await manual(page);
  await expect(page.getByLabel("Your name", { exact: true })).toBeVisible();
});

test("failed autosave retains half-entered fields on device and syncs them after retry", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await manual(page);
  await page.route("**/api/profile", (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
  await page.getByLabel("Your name", { exact: true }).fill("Unfinished draft");
  await page
    .getByRole("textbox", { name: "About you (optional)", exact: true })
    .fill("Half-entered background");
  await expect(
    page.getByText("Sync failed.").filter({ visible: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
    "Unfinished draft",
  );
  await expect(
    page.getByRole("textbox", { name: "About you (optional)", exact: true }),
  ).toHaveValue("Half-entered background");
  await expect(
    page.getByText("Sync failed.").filter({ visible: true }),
  ).toBeVisible();
  await page.unroute("**/api/profile");
  await page
    .getByRole("button", { name: "Retry", exact: true })
    .filter({ visible: true })
    .click();
  await saved(page);
  const data = await (
    await page.request.get(`${backendURL}/api/profile`)
  ).json();
  expect(data.details.about).toBe("Half-entered background");
  expect(data.onboarding.step).toBe(1);
});

test("onboarding opens immediately and keeps edits made before account hydration", async ({
  page,
  context,
}) => {
  await signInForTest(context, false);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/get-session", async (route) => {
    await gate;
    await route.continue();
  });
  await page.route("**/api/profile", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: "Let’s start with your story." }),
    ).toBeVisible();
    await manual(page);
    await page.getByLabel("Your name", { exact: true }).fill("My chosen name");
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeDisabled();
    release();
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeEnabled();
    await expect(page.getByLabel("Your name", { exact: true })).toHaveValue(
      "My chosen name",
    );
    await saved(page);
    const profile = await (
      await page.request.get(`${backendURL}/api/profile`)
    ).json();
    expect(profile.details.name).toBe("My chosen name");
    expect(profile.onboarding.step).toBe(1);
  } finally {
    release();
  }
});

test("final setup restores failed saves and prepares the workspace after collecting details", async ({
  page,
  context,
}) => {
  await signInForTest(context, false);
  await page.goto("/onboarding");
  await manual(page);
  await page.getByLabel("Your name", { exact: true }).fill("Ada Lovelace");
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  for (let i = 0; i < 4; i++) await next(page);
  await saved(page);
  await expect(
    page.getByText("Setting up your workspace…", { exact: true }),
  ).toHaveCount(0);
  let fail = true;
  await page.route("**/api/profile", async (route) => {
    if (route.request().method() === "PUT" && fail)
      await route.fulfill({
        status: 503,
        json: { error: "Could not save your profile. Try again." },
      });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Could not save your profile",
  );
  fail = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/interviews", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    const preparation = page.waitForRequest("**/api/interviews");
    await page.getByRole("button", { name: "Finish setup" }).click();
    await preparation;
    await expect(
      page.getByRole("heading", { name: "Setting up your workspace…" }),
    ).toBeVisible();
    release();
    await expect(page).toHaveURL(/\/interviews\/new$/, { timeout: 15000 });
  } finally {
    release();
  }
});
