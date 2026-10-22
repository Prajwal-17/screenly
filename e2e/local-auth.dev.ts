import { expect, test } from "@playwright/test";
import { backendURL } from "./environment";

test("local email entry opens a real persistent workspace without Google", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  const input = page.getByRole("textbox", { name: "Development email" });
  await expect(input).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeDisabled();
  await expect(page.getByText("Disabled in production.")).toBeVisible();
  const email = `local-${Date.now()}@example.com`;
  await input.fill(email);
  await page.getByRole("button", { name: "Enter local workspace" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const session = await (
    await page.request.get(`${backendURL}/api/auth/get-session`)
  ).json();
  expect(session.user.email).toBe(email);
  const create = await page.request.post(`${backendURL}/api/interviews`, {
    data: { role: "Backend", level: "Junior", topics: ["APIs"], duration: 10 },
  });
  expect(create.status()).toBe(201);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("link", { name: /Backend/ }).first(),
  ).toBeVisible();
  await page.request.post(`${backendURL}/api/auth/sign-out`, {
    headers: { Origin: new URL(page.url()).origin },
    data: {},
  });
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page
    .getByRole("textbox", { name: "Development email" })
    .fill(email.toUpperCase());
  await page.getByRole("button", { name: "Enter local workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const again = await (
    await page.request.get(`${backendURL}/api/auth/get-session`)
  ).json();
  expect(again.user.id).toBe(session.user.id);
});

test("local email failures retain the entered address and allow retry", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  const input = page.getByRole("textbox", { name: "Development email" });
  await input.fill("developer@example.com");
  await page.route("**/api/auth/sign-in/development", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Local sign-in is unavailable. Try again." },
    }),
  );
  await page.getByRole("button", { name: "Enter local workspace" }).click();
  await expect(
    page
      .locator("main")
      .getByRole("alert")
      .filter({ hasText: "Local sign-in is unavailable" }),
  ).toBeVisible();
  await expect(input).toHaveValue("developer@example.com");
  await expect(
    page.getByRole("button", { name: "Enter local workspace" }),
  ).toBeEnabled();
});
