import { test, expect } from "./fixtures";

test("expanded navigation ignores stale collapse preference and editing shortcuts", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "screenly-workspace-ui",
      JSON.stringify({ state: { sidebarCollapsed: true }, version: 0 }),
    ),
  );
  await page.goto("/dashboard");
  const overview = page.getByRole("link", { name: "Overview", exact: true });
  await expect(overview).toBeVisible();
  await expect(
    page.getByRole("button", { name: /toggle sidebar/i }),
  ).toHaveCount(0);
  await page.keyboard.press("Control+b");
  await expect(overview).toBeVisible();
  await page.getByRole("link", { name: "Interviews", exact: true }).click();
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page).toHaveTitle("Interviews · Screenly");
  const search = page.getByRole("textbox", {
    name: "Search interviews",
    exact: true,
  });
  await search.fill("React");
  await search.press("Control+k");
  await search.press("Control+b");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("workspace search opens a destination and returns focus when dismissed", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const opener = page.getByRole("button", {
    name: "Search workspace",
    exact: true,
  });
  await opener.click();
  const search = page.getByRole("combobox", {
    name: "Search workspace",
    exact: true,
  });
  await expect(search).toBeFocused();
  await search.fill("no such destination");
  await expect(page.getByText("No results.", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await opener.click();
  await search.fill("question library");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("main")).toBeFocused();
});

test("sign-out failure is recoverable and success returns home", async ({
  page,
  api,
}) => {
  api.failures.set("POST /api/auth/sign-out", {
    status: 503,
    error: "Unavailable",
  });
  await page.goto("/dashboard");
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
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load your profile" }),
  ).toBeVisible();
  await expect(page.getByText("Private provider details")).toHaveCount(0);
  api.failures.delete("GET /api/profile");
  await page.getByRole("button", { name: /Try again|Retry/ }).click();
  await expect(
    page.getByRole("heading", { name: "Start an interview" }),
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
  await page.getByRole("link", { name: "Go to overview" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
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
  await expect(page).toHaveURL(/\/dashboard$/);
});
