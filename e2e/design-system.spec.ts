import { expect, test } from "@playwright/test";

import { contrast } from "./contrast";

test("Fern actions, mobile reading, keyboard focus, loading recovery, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveCSS("font-size", "16px");
  await expect(page.locator("h1")).toHaveCSS("font-weight", "600");
  const primary = page.getByRole("link", { name: "Start practicing" });
  await expect(primary).toHaveCSS("background-color", "rgb(36, 92, 60)");
  const colors = await primary.evaluate((node) => {
    const style = getComputedStyle(node);
    return { text: style.color, background: style.backgroundColor };
  });
  expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
  await primary.hover();
  await expect(primary).toHaveCSS("background-color", "rgb(28, 76, 48)");
  for (const width of [360, 640, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({ json: { google: true, voice: true, llm: true } }),
  );
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  const submit = page.getByRole("button", { name: "Continue with Google" });
  await expect(submit).toBeEnabled();
  await submit.focus();
  await expect(submit).toBeFocused();
  expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/auth/sign-in/social", async (route) => {
    requests++;
    await pending;
    await route.fulfill({
      status: 401,
      json: {
        message: "Google sign-in failed. Please try again.",
        code: "OAUTH_FAILED",
      },
    });
  });
  const before = (await submit.boundingBox())!;
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("aria-busy", "true");
  const during = (await submit.boundingBox())!;
  expect(Math.abs(during.width - before.width)).toBeLessThan(1);
  expect(Math.abs(during.height - before.height)).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(submit.locator("svg.animate-spin")).toHaveCSS(
    "animation-duration",
    "1e-05s",
  );
  release();
  await expect(page.locator("[data-slot=alert][role=alert]")).toContainText(
    "Google sign-in failed",
  );
  await expect(submit).toBeEnabled();
  expect(requests).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
