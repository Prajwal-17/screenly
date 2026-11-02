import { test, expect, type FixtureApi } from "./fixtures";

function hold(api: FixtureApi, key: string) {
  let release!: () => void;
  api.holds.set(
    key,
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  return () => {
    api.holds.delete(key);
    release();
  };
}

test("initial session loading belongs to the workspace frame and session failure can retry", async ({
  page,
  api,
}, testInfo) => {
  const release = hold(api, "GET /api/auth/get-session");
  try {
    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "Interviews", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-workspace-placeholder] [data-loading-layout="history"]',
      ),
    ).toBeVisible();
    await expect(
      page.getByText("No interviews yet", { exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("session-loading.png"),
      fullPage: true,
    });
  } finally {
    release();
  }
  await expect(page.getByRole("table")).toBeVisible();
  api.failures.set("GET /api/auth/get-session", {
    status: 503,
    error: "Private auth details",
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "We couldn’t check your session" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText("Private auth details")).toHaveCount(0);
  api.failures.delete("GET /api/auth/get-session");
  await page.getByRole("button", { name: "Retry session" }).click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("slow sections use their actual page layout without showing empty or editable content early", async ({
  page,
  api,
}, testInfo) => {
  test.setTimeout(180_000);
  const cases = [
    ["/history", "GET /api/interviews", "history"],
    ["/profile", "GET /api/profile", "profile"],
    ["/memory", "GET /api/profile/memory", "memory"],
    [
      "/interviews/completed/feedback",
      "GET /api/interviews/completed",
      "review",
    ],
    ["/interviews/active", "GET /api/interviews/active", "interview"],
    ["/interviews/new", "GET /api/profile", "entry"],
    ["/onboarding?edit=1", "GET /api/profile", "onboarding"],
  ];
  for (const [path, key, layout] of cases) {
    const release = hold(api, key!);
    let entryBounds: { x: number; width: number } | null = null;
    try {
      await page.setViewportSize({
        width:
          ["review", "interview"].includes(layout!) ||
          path!.includes("onboarding")
            ? 1024
            : 1440,
        height:
          ["review", "interview"].includes(layout!) ||
          path!.includes("onboarding")
            ? 600
            : 900,
      });
      await page.goto(path!);
      const loading = page.locator(`[data-loading-layout="${layout}"]`).first();
      await expect(loading).toBeVisible();
      if (layout === "entry")
        entryBounds = await loading
          .locator("[data-loading-roles]")
          .boundingBox();
      await expect(loading.getByRole("status")).not.toBeEmpty();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (layout === "interview") {
        const status = await loading.getByRole("status").boundingBox();
        const trigger = await page
          .locator('[data-slot="sidebar-trigger"]')
          .boundingBox();
        expect(status).not.toBeNull();
        expect(trigger).not.toBeNull();
        expect(
          status!.y >= trigger!.y + trigger!.height ||
            status!.x >= trigger!.x + trigger!.width,
        ).toBe(true);
      }

      await expect(
        page.getByText("No interviews yet", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("No retained findings yet.", { exact: true }),
      ).toHaveCount(0);
      if (path!.includes("onboarding"))
        await expect(
          page.getByRole("button", { name: "Enter details manually" }),
        ).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(
          `loading-${layout}-${path!.includes("onboarding") ? "onboarding" : "page"}.png`,
        ),
        fullPage: true,
      });
    } finally {
      release();
    }
    await expect(page.locator("[data-loading-layout]")).toHaveCount(0);
    if (entryBounds) {
      const choices = page.getByRole("radiogroup", { name: "Interview role" });
      await expect(choices).toBeVisible();
      const bounds = await choices.boundingBox();
      expect(Math.abs(bounds!.x - entryBounds.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(bounds!.width - entryBounds.width)).toBeLessThanOrEqual(
        1,
      );
    }
  }
});

test("cold failure keeps its recovery panel and labelled busy action mounted through retry", async ({
  page,
  api,
}, testInfo) => {
  api.failures.set("GET /api/interviews", {
    status: 503,
    error: "Private stack trace",
  });
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "We couldn’t load your interviews" }),
  ).toBeVisible();
  await expect(page.getByText("Private stack trace")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("history-error.png"),
    fullPage: true,
  });
  const release = hold(api, "GET /api/interviews");
  api.failures.delete("GET /api/interviews");
  try {
    const retry = page.getByRole("button", { name: "Try again", exact: true });
    await retry.click();
    await expect(retry).toBeDisabled();
    await expect(retry).toHaveAttribute("aria-busy", "true");
    await expect(retry).toContainText("Trying again…");
    await expect(
      page.getByRole("heading", { name: "We couldn’t load your interviews" }),
    ).toBeVisible();
    await expect(page.locator("[data-loading-layout]")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("retry-busy.png"),
      fullPage: true,
    });
  } finally {
    release();
  }
  await expect(page.getByRole("table")).toBeVisible();
});

test("failed refresh preserves loaded interviews, memory and review with inline recovery", async ({
  page,
  api,
}, testInfo) => {
  for (const [path, endpoint, content] of [
    ["/history", "GET /api/interviews", "table"],
    ["/memory", "GET /api/profile/memory", "memory"],
    [
      "/interviews/completed/feedback",
      "GET /api/interviews/completed",
      "review",
    ],
  ]) {
    await page.goto(path!);
    const saved =
      content === "table"
        ? page.getByRole("table")
        : content === "memory"
          ? page.getByText("Explain a concrete profiler trace.")
          : page.getByRole("heading", { name: "Session review", exact: true });
    await expect(saved).toBeVisible();
    api.failures.set(endpoint!, {
      status: 503,
      error: "Private refresh details",
    });
    const current = await page.evaluate(() => Date.now());
    await page.clock.setFixedTime(new Date(current + 20_000));
    await page.evaluate(() =>
      window.dispatchEvent(new Event("visibilitychange")),
    );
    await expect(
      page.getByRole("button", { name: "Retry refresh", exact: true }),
    ).toBeVisible();
    await expect(saved).toBeVisible();
    await expect(page.getByText("Private refresh details")).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`refresh-${content}.png`),
      fullPage: true,
    });
    api.failures.delete(endpoint!);
    await page
      .getByRole("button", { name: "Retry refresh", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Retry refresh", exact: true }),
    ).toHaveCount(0);
    await expect(saved).toBeVisible();
  }
});
