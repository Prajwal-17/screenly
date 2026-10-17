import { expect, test } from "@playwright/test";

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const [r, g, b] = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((v) => {
        const channel = v / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  };
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

test("Jade actions, mobile reading, keyboard focus, loading recovery, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("body")).toHaveCSS("font-size", "16px");
  await expect(page.locator("h1")).toHaveCSS("font-weight", "500");
  const primary = page.getByRole("link", { name: "Start practicing" });
  await expect(primary).toHaveCSS("background-color", "rgb(8, 127, 104)");
  const colors = await primary.evaluate((node) => {
    const style = getComputedStyle(node);
    return { text: style.color, background: style.backgroundColor };
  });
  expect(contrast(colors.text, colors.background)).toBeGreaterThanOrEqual(4.5);
  await primary.hover();
  await expect(primary).toHaveCSS("background-color", "rgb(9, 107, 89)");
  for (const width of [360, 640, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  const email = page.getByLabel("Email address");
  await expect(email).toHaveCSS("font-size", "16px");
  await email.focus();
  await page.keyboard.press("Tab");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toBeFocused();
  const focus = await password.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      shadow: style.boxShadow,
      color: style.getPropertyValue("--ring").trim(),
      boundary: style.borderColor,
      background: style.backgroundColor,
    };
  });
  expect(focus.shadow).toContain("rgb(8, 127, 104)");
  expect(focus.color).toBe("#087f68");
  expect(contrast(focus.boundary, focus.background)).toBeGreaterThanOrEqual(3);
  const submit = page.getByRole("button", { name: "Sign in", exact: true });
  expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await email.fill("candidate@example.com");
  await password.fill("incorrect-password");
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/auth/sign-in/email", async (route) => {
    requests++;
    await pending;
    await route.fulfill({
      status: 401,
      json: {
        message: "Check your email and password, then try again.",
        code: "INVALID_EMAIL_OR_PASSWORD",
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
    "Check your email and password",
  );
  await expect(submit).toBeEnabled();
  await expect(email).toHaveValue("candidate@example.com");
  await expect(password).toHaveValue("incorrect-password");
  expect(requests).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
