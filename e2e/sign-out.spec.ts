import { expect, test } from "@playwright/test";
import { backendURL, webURL } from "./environment";
import { signInForTest } from "./session-fixture";

for (const width of [1440, 360]) {
  test(`sign-out shows immediate feedback and redirects without waiting for session refresh at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await signInForTest(context);
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Overview", exact: true }),
    ).toBeVisible();
    if (width < 768)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: "Account menu" }).click();

    let releaseSignOut!: () => void;
    const signOutGate = new Promise<void>((resolve) => {
      releaseSignOut = resolve;
    });
    let releaseRefresh!: () => void;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    await page.route("**/api/auth/sign-out", async (route) => {
      await signOutGate;
      await route.continue();
    });
    await page.route("**/api/auth/get-session", async (route) => {
      await refreshGate;
      await route.continue();
    });
    try {
      await page
        .getByRole("menuitem", { name: "Sign out", exact: true })
        .click();
      await expect(page.getByRole("status")).toHaveText("Signing out…");
      await expect(
        page.getByText("Loading your workspace…", { exact: true }),
      ).toHaveCount(0);
      releaseSignOut();
      await expect(page).toHaveURL(`${webURL}/`);
      await expect(
        page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Sign in", exact: true }),
      ).toBeVisible();
      const session = await page.request.get(
        `${backendURL}/api/auth/get-session`,
      );
      expect(await session.json()).toBeNull();
    } finally {
      releaseSignOut();
      releaseRefresh();
    }
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
  });
}

test("failed sign-out restores the workspace with a working retry", async ({
  page,
  context,
}) => {
  await signInForTest(context);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.route("**/api/auth/sign-out", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Temporarily unavailable" },
    }),
  );
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("complementary").getByRole("alert")).toHaveText(
    "Could not sign out. Try again.",
  );
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/auth/sign-out");
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(`${webURL}/`);
});
