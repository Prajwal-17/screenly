import { expect, test } from "@playwright/test";
import { signInForTest } from "./session-fixture";

test("profile failures retain navigation and recover in place on desktop and mobile", async ({
  page,
  context,
}, testInfo) => {
  await signInForTest(context);
  let fail = true;
  let requests = 0;
  let release!: () => void;
  let holding = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/profile", async (route) => {
    requests++;
    if (holding) await gate;
    if (fail)
      await route.fulfill({
        status: 503,
        json: { error: "Profile temporarily unavailable" },
      });
    else await route.continue();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/interviews/new");
    const retry = page.getByRole("button", {
      name: "Retry loading profile",
      exact: true,
    });
    await expect(
      page.getByRole("heading", { name: "We couldn’t load your profile" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "New interview", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to overview" }),
    ).toHaveAttribute("href", "/dashboard");
    const error = page.locator("main").getByRole("alert");
    await page.screenshot({
      path: testInfo.outputPath("profile-error-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(retry).toBeInViewport();
    expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("profile-error-mobile.png"),
      fullPage: true,
    });
    const height = (await error.boundingBox())!.height;
    const before = requests;
    holding = true;
    fail = false;
    await retry.click();
    await expect(retry).toBeDisabled();
    await expect(retry).toHaveAttribute("aria-busy", "true");
    await expect(
      page.getByRole("heading", { name: "We couldn’t load your profile" }),
    ).toBeVisible();
    expect((await error.boundingBox())!.height).toBe(height);
    await expect.poll(() => requests).toBe(before + 1);
    await page.keyboard.press("Control+b");
    await expect(
      page.getByRole("dialog", { name: "Navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    release();
    await expect(
      page.getByRole("heading", { name: "What would you like to practice?" }),
    ).toBeVisible();
    await expect(error).toHaveCount(0);
    await expect(page.locator("#workspace-content")).toBeFocused();
  } finally {
    release();
  }
});

test("a failed background profile refresh preserves the interview setup and its selections", async ({
  page,
  context,
}, testInfo) => {
  await signInForTest(context);
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("heading", { name: "What would you like to practice?" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Backend", exact: true }).click();
  await page.getByRole("radio", { name: "Senior", exact: true }).click();
  await page.getByRole("radio", { name: "30 minutes", exact: true }).click();
  let fail = true;
  let requests = 0;
  await page.route("**/api/profile", async (route) => {
    requests++;
    if (fail)
      await route.fulfill({
        status: 503,
        json: { error: "Profile temporarily unavailable" },
      });
    else await route.continue();
  });
  // Expire the query's 15-second freshness window, then refocus the app.
  await page.clock.install();
  await page.clock.fastForward(16000);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await expect.poll(() => requests).toBeGreaterThan(0);
  await page.clock.runFor(1500);
  await expect(
    page.getByText(
      "Your profile couldn’t refresh. Using your last loaded details.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Senior", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "30 minutes", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Continue to setup check" }),
  ).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("profile-refresh-error.png"),
    fullPage: true,
  });
  fail = false;
  await page
    .getByRole("button", { name: "Retry profile", exact: true })
    .click();
  await expect(
    page.getByText(
      "Your profile couldn’t refresh. Using your last loaded details.",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Senior", exact: true }),
  ).toBeChecked();
});

test("an expired session offers sign-in instead of a misleading profile retry", async ({
  page,
  context,
}) => {
  await signInForTest(context);
  let requests = 0;
  await page.route("**/api/profile", async (route) => {
    requests++;
    await route.fulfill({
      status: 401,
      json: { error: "Sign in to continue." },
    });
  });
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("heading", { name: "Sign in to continue", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in again" }),
  ).toHaveAttribute("href", "/auth/sign-in");
  await expect(
    page.getByRole("button", { name: "Retry loading profile" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  expect(requests).toBe(1);
});

test("offline profile loading explains the wait and resumes when the connection returns", async ({
  page,
  context,
}) => {
  await signInForTest(context);
  let fail = true;
  await page.route("**/api/profile", async (route) => {
    if (fail) await route.abort("internetdisconnected");
    else await route.continue();
  });
  try {
    await page.goto("/interviews/new");
    await expect(
      page.getByRole("heading", { name: "New interview", exact: true }),
    ).toBeVisible();
    await context.setOffline(true);
    await expect(
      page.getByRole("heading", { name: "You’re offline", exact: true }),
    ).toBeVisible();
    fail = false;
    await context.setOffline(false);
    await expect(
      page.getByRole("heading", { name: "What would you like to practice?" }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
