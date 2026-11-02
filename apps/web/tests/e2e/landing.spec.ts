import { test, expect } from "./fixtures";

test("returning users see Go to app after the session check without a sign-in flash", async ({
  page,
  api,
}, testInfo) => {
  let releaseSession = () => {};
  api.holds.set(
    "GET /api/auth/get-session",
    new Promise<void>((resolve) => {
      releaseSession = resolve;
    }),
  );
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  try {
    await expect(
      navigation.getByRole("status", { name: "Checking sign-in status" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toHaveCount(0);
  } finally {
    api.holds.delete("GET /api/auth/get-session");
    releaseSession();
  }
  const goToApp = navigation.getByRole("link", {
    name: "Go to app",
    exact: true,
  });
  await expect(goToApp).toHaveAttribute("href", "/interviews/new");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Go to app" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
  await expect(
    navigation.getByRole("link", { name: "Get started" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("landing-signed-in.png"),
    fullPage: true,
  });
  await goToApp.click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await expect(
    page.getByRole("radiogroup", { name: "Interview role" }),
  ).toBeVisible();
});

test("signed-out visitors can sign in from the homepage", async ({
  page,
  api,
}, testInfo) => {
  api.authenticated = false;
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("link", { name: "Get started" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to app" })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("landing-signed-out.png"),
    fullPage: true,
  });
  await navigation.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/, { timeout: 45_000 });
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("public landing presents labelled transcript and qualitative review at supported screen widths", async ({
  page,
  api,
}) => {
  api.authenticated = false;
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Practice the conversation. Follow the evidence.",
    );
    await expect(
      page.getByRole("region", { name: "Illustrative transcript and review" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Use a wider window" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "What do I need?" }).click();
  await expect(page.getByText(/1024 pixels wide/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Start an interview" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Use a wider window" }),
  ).toBeVisible();
});

test("all six public roles show role-specific illustrative exchanges", async ({
  page,
}) => {
  await page.goto("/");
  const example = page.getByRole("region", {
    name: "Illustrative transcript and review",
  });
  await expect(example.getByRole("tab")).toHaveCount(6);
  await example.getByRole("tab", { name: "Backend", exact: true }).click();
  const panel = example.getByRole("tabpanel");
  await expect(panel).toContainText("idempotency key");
  await expect(
    panel.getByRole("heading", { name: "Qualitative review example" }),
  ).toBeVisible();
  await example
    .getByRole("tab", { name: "Data Engineering", exact: true })
    .click();
  await expect(example.getByRole("tabpanel")).toContainText("backfill");
  await expect(
    example.getByText(/\/ 10|Answer 1|score breakdown/i),
  ).toHaveCount(0);
});
