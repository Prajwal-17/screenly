import { expect, test } from "@playwright/test";

test("Google is the only sign-in option and unavailable configuration is explained", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Google sign-in is unavailable",
  );
});

test("OAuth callback errors offer a retry without exposing provider details", async ({
  page,
}) => {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({ json: { google: true, voice: false, llm: false } }),
  );
  await page.goto("/auth/sign-in?error=access_denied");
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Google sign-in was not completed",
  );
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("provider availability failures can be retried", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/capabilities", (route) => {
    requests++;
    return requests <= 2
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { google: true, voice: false, llm: false } });
  });
  await page.goto("/auth/sign-in");
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
});

test("production UI omits local email entry even when a server advertises it", async ({
  page,
}) => {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      json: { google: true, devLogin: true, voice: false, llm: false },
    }),
  );
  await page.goto("/auth/sign-in");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByText("Local development", { exact: true }),
  ).toHaveCount(0);
});
