import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { Locator } from "@playwright/test";
import { test, expect } from "./fixtures";

async function readable(node: Locator) {
  const colors = await node.evaluate((element) => {
    let current: Element | null = element;
    let background = "rgba(0, 0, 0, 0)";
    while (current && background === "rgba(0, 0, 0, 0)") {
      background = getComputedStyle(current).backgroundColor;
      current = current.parentElement;
    }
    return [getComputedStyle(element).color, background];
  });
  const values = colors.map((color) => {
    const [r, g, b] = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
  });
  expect(
    (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05),
  ).toBeGreaterThanOrEqual(4.5);
}

test("import, initials and selected practice choices retain readable dark-theme contrast", async ({
  page,
  api,
}) => {
  test.setTimeout(120_000);
  const directory = resolve("../../.impeccable/review/dark-polish-states");
  await mkdir(directory, { recursive: true });
  for (const theme of ["Dark"]) {
    api.profile.status = "complete";
    for (const width of [1440, 1024]) {
      await page.setViewportSize({ width, height: width === 1024 ? 600 : 900 });
      api.profile.status = "complete";
      await page.goto("/profile");
      const initials = page.locator(
        '.profile-surface [aria-hidden="true"].bg-accent',
      );
      await expect(initials).toContainText("AM");
      await readable(initials);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: resolve(directory, `profile-${theme.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
      api.profile.status = "draft";
      api.profile.onboarding.step = 1;
      await page.goto("/onboarding");
      const action = page.getByRole("button", {
        name: "Import resume",
        exact: true,
      });
      await expect(action).toBeEnabled();
      await readable(action);
      await action.hover();
      await readable(action);
      await page.mouse.down();
      await readable(action);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await page.screenshot({
        path: resolve(directory, `import-${theme.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
      let release!: () => void;
      api.holds.set(
        "POST /api/profile/import",
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      try {
        await page.getByLabel("Upload resume", { exact: true }).setInputFiles({
          name: "synthetic-resume.txt",
          mimeType: "text/plain",
          buffer: Buffer.from(
            "Synthetic profile: I build accessible applications.",
          ),
        });
        const icon = page.locator('div[aria-busy="true"] .bg-accent');
        await expect(icon).toBeVisible();
        await readable(icon);
        await page.screenshot({
          path: resolve(
            directory,
            `import-progress-${theme.toLowerCase()}-${width}.png`,
          ),
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "Cancel import", exact: true })
          .click();
      } finally {
        api.holds.delete("POST /api/profile/import");
        release();
      }
      api.profile.onboarding.step = 4;
      await page.goto("/onboarding");
      for (const name of ["Role", "Experience"]) {
        const group = page.getByRole("radiogroup", { name, exact: true });
        const selected = group.locator(
          '[data-slot="field-label"]:has([role="radio"][data-state="checked"])',
        );
        await expect(selected).toBeVisible();
        await readable(selected);
        await selected.hover();
        await readable(selected);
      }
      await page.mouse.move(0, 0);
      await page.screenshot({
        path: resolve(
          directory,
          `practice-${theme.toLowerCase()}-${width}.png`,
        ),
        fullPage: true,
      });
    }
  }
});
