import { test, expect } from "./fixtures";

test("returning users enter the app without a Google sign-in flash", async ({
  page,
  api,
}) => {
  let releaseSession = () => {};
  api.holds.set(
    "GET /api/auth/get-session",
    new Promise<void>((resolve) => {
      releaseSession = resolve;
    }),
  );
  await page.goto("/");
  try {
    await expect(
      page.getByRole("status", { name: "Checking sign-in status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toHaveCount(0);
  } finally {
    api.holds.delete("GET /api/auth/get-session");
    releaseSession();
  }
  const entry = page.getByRole("link", { name: "Go to app", exact: true });
  await expect(entry).toHaveAttribute("href", "/interviews/new");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toHaveCount(0);
  await entry.click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await expect(
    page.getByRole("radiogroup", { name: "Interview role" }),
  ).toBeVisible();
});

test("Google entry keeps onboarding callbacks and recovers from failure", async ({
  page,
  api,
}) => {
  api.authenticated = false;
  let requestBody: Record<string, string> = {};
  let calls = 0;
  await page.route("**/api/auth/sign-in/social", async (route) => {
    calls++;
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      status: 503,
      json: { code: "UNAVAILABLE", message: "Unavailable" },
    });
  });
  await page.goto("/");
  const google = page.getByRole("button", { name: "Continue with Google" });
  await expect(google).toBeEnabled();
  await google.click();
  await expect(
    page.getByRole("complementary", { name: "Get started" }).getByRole("alert"),
  ).toContainText("Google sign-in failed. Please try again.");
  await expect(google).toBeEnabled();
  expect(requestBody).toMatchObject({
    provider: "google",
    callbackURL: "http://127.0.0.1:3106/interviews/new",
    newUserCallbackURL: "http://127.0.0.1:3106/onboarding",
    errorCallbackURL: "http://127.0.0.1:3106/auth/sign-in?error=oauth",
  });
  expect(calls).toBe(1);
});

test("landing availability and session failures have retry actions", async ({
  page,
  api,
}) => {
  api.authenticated = false;
  api.failures.set("GET /api/auth/get-session", {
    status: 503,
    error: "Unavailable",
  });
  await page.goto("/");
  await expect(
    page.getByRole("complementary", { name: "Get started" }).getByRole("alert"),
  ).toContainText("Could not check your session");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toHaveCount(0);
  api.failures.delete("GET /api/auth/get-session");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  api.failures.set("GET /api/capabilities", {
    status: 503,
    error: "Unavailable",
  });
  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "Get started" }).getByRole("alert"),
  ).toContainText("Could not check sign-in availability");
  api.failures.delete("GET /api/capabilities");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("approved single-screen entry fits desktop and stacks on narrow screens", async ({
  page,
  api,
}, testInfo) => {
  api.authenticated = false;
  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [768, 900],
    [1280, 720],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Technical interviews.Practiced out loud.",
    );
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeEnabled();
    await expect(
      page.getByText(/Desktop or laptop|Microphone required|New here/),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Illustrative transcript and review" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Use a wider window" }),
    ).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No horizontal overflow at ${width}`,
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight,
      ),
      `Single screen at ${width}×${height}`,
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`landing-${width}.png`),
      fullPage: true,
    });
  }
});
