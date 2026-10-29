import { test, expect } from "./fixtures";

test("compact navigation and history search remain keyboard accessible", async ({
  page,
}) => {
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveCount(3);
  await page.getByRole("link", { name: "Interviews", exact: true }).click();
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page).toHaveTitle("Interviews · Screenly");
  const search = page.getByRole("textbox", { name: "Search interviews" });
  await search.fill("Frontend");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await search.press("Control+k");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("retired workspace routes redirect intentionally", async ({ page }) => {
  for (const route of [
    "/dashboard",
    "/library",
    "/plans",
    "/progress",
    "/saved",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/interviews\/new$/);
  }
});

test("sign-out failure is recoverable and success returns home", async ({
  page,
  api,
}) => {
  api.failures.set("POST /api/auth/sign-out", {
    status: 503,
    error: "Unavailable",
  });
  await page.goto("/interviews/new");
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not sign out" }),
  ).toHaveText("Could not sign out. Try again.");
  api.failures.delete("POST /api/auth/sign-out");
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("profile failure, expiry, and missing interviews offer recovery", async ({
  page,
  api,
}) => {
  api.failures.set("GET /api/profile", {
    status: 503,
    error: "Private provider details",
  });
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load your profile" }),
  ).toBeVisible();
  await expect(page.getByText("Private provider details")).toHaveCount(0);
  api.failures.delete("GET /api/profile");
  await page.getByRole("button", { name: /Try again|Retry/ }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a role" }),
  ).toBeVisible();
  api.failures.set("GET /api/profile", { status: 401, error: "Expired" });
  await page.reload();
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  api.failures.delete("GET /api/profile");
  await page.goto("/interviews/missing/feedback");
  await expect(
    page.getByText("Interview not found.", { exact: true }),
  ).toBeVisible();
});

test("unknown routes give a safe next action", async ({ page }, testInfo) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  const shot = await page.screenshot({
    path: testInfo.outputPath("not-found.png"),
    fullPage: true,
  });
  await testInfo.attach("not-found", { body: shot, contentType: "image/png" });
  await page.getByRole("link", { name: "New interview" }).click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
});

test("auth availability, retry, development gating, and existing-session redirect", async ({
  page,
  api,
}) => {
  api.authenticated = false;
  api.failures.set("GET /api/capabilities", {
    status: 503,
    error: "Unavailable",
  });
  await page.goto("/auth/sign-in?error=oauth");
  await expect(
    page.getByText("Google sign-in was not completed. Please try again."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  api.failures.delete("GET /api/capabilities");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  await expect(page.getByRole("textbox", { name: /email/i })).toHaveCount(0);
  api.capabilities.google = false;
  await page.reload();
  await expect(
    page.getByText("Google sign-in is unavailable. Please try again later."),
  ).toBeVisible();
  api.authenticated = true;
  await page.reload();
  await expect(page).toHaveURL(/\/interviews\/new$/);
});
