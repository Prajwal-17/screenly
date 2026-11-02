import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect } from "./fixtures";

function luminance(color: string) {
  const [r, g, b] = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number)
    .map((value) => {
      const v = value / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
}

test("charcoal setup keeps its action reachable, readable and separate from preview actions", async ({
  page,
  api,
}) => {
  test.setTimeout(150_000);
  const directory = resolve("../../.impeccable/review/dark-polish-setup");
  await mkdir(directory, { recursive: true });
  for (const theme of ["Dark"]) {
    for (const width of [1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: width === 1024 ? 600 : 900 });
      await page.goto("/interviews/new");
      const group = page.getByRole("radiogroup", {
        name: "Interview role",
        exact: true,
      });
      await expect(group.getByRole("radio")).toHaveCount(6);
      const action = page.getByRole("button", {
        name: "Continue to audio",
        exact: true,
      });
      await expect(action).toBeInViewport();
      await expect(action).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page
          .locator("body")
          .evaluate((node) => getComputedStyle(node).fontFamily),
      ).toMatch(/geistSans/i);
      expect(
        await page
          .getByRole("heading", { name: "Set up your interview" })
          .evaluate((node) => getComputedStyle(node).fontFamily),
      ).toMatch(/geistSans/i);
      for (const selector of [
        "#session-brief-title",
        '[aria-label="Interview role"] [role="radio"][data-state="checked"]',
      ]) {
        const colors = await page.locator(selector).evaluate((node) => {
          const foreground = getComputedStyle(node).color;
          let current: Element | null = node;
          let background = "rgba(0, 0, 0, 0)";
          while (current && background === "rgba(0, 0, 0, 0)") {
            background = getComputedStyle(current).backgroundColor;
            current = current.parentElement;
          }
          return [foreground, background];
        });
        const [a, b] = colors.map(luminance);
        expect(
          (Math.max(a!, b!) + 0.05) / (Math.min(a!, b!) + 0.05),
        ).toBeGreaterThanOrEqual(4.5);
      }
      for (const state of ["default", "hover"]) {
        if (state === "hover") await action.hover();
        const colors = await action.evaluate((node) => {
          const s = getComputedStyle(node);
          return [s.color, s.backgroundColor];
        });
        const [a, b] = colors.map(luminance);
        expect(
          (Math.max(a!, b!) + 0.05) / (Math.min(a!, b!) + 0.05),
        ).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: resolve(directory, `setup-${theme.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
    }
    api.profile.details.level = "";
    await page.goto("/interviews/new");
    const action = page.getByRole("button", {
      name: "Continue to audio",
      exact: true,
    });
    await expect(action).toBeDisabled();
    await expect(action).toBeInViewport();
    await page.getByRole("radio", { name: "Junior", exact: true }).click();
    await expect(action).toBeEnabled();
    await page
      .getByRole("textbox", { name: "Practice goal", exact: false })
      .fill("Explain the trade-offs behind my design decisions.");
    await expect(
      page.getByText("Saved to your profile when you continue."),
    ).toBeVisible();
    await expect(action).toBeInViewport();
    await page.screenshot({
      path: resolve(directory, `missing-experience-${theme.toLowerCase()}.png`),
      fullPage: true,
    });
    api.profile.details.level = "Mid-level";
  }
  expect(
    api.requests.filter((request) => request.method !== "GET"),
  ).toHaveLength(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  api.capabilities.llm = false;
  await page.goto("/interviews/new");
  await expect(
    page.getByText("The interviewer is unavailable. Try again later."),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(directory, "service-unavailable.png"),
    fullPage: true,
  });
});

test("dark surfaces retain readable text through onboarding, examples and session loading", async ({
  page,
  api,
}) => {
  const directory = resolve("../../.impeccable/review/dark-polish-setup");
  await mkdir(directory, { recursive: true });
  for (const theme of ["Dark"]) {
    api.profile.status = "draft";
    api.profile.onboarding.step = 1;
    await page.goto("/onboarding");
    const caret = await page
      .getByRole("textbox", { name: "Name", exact: true })
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.caretColor, style.backgroundColor];
      });
    const [caretInk, caretGround] = caret.map(luminance);
    expect(
      (Math.max(caretInk!, caretGround!) + 0.05) /
        (Math.min(caretInk!, caretGround!) + 0.05),
    ).toBeGreaterThanOrEqual(3);
    const rail = page.locator("aside");
    await expect(rail.getByText("Your profile", { exact: true })).toBeVisible();
    for (const node of [
      rail.getByText("Your profile", { exact: true }),
      ...(await rail.getByRole("button").all()),
    ]) {
      const colors = await node.evaluate((element) => {
        let parent: Element | null = element;
        let background = "rgba(0, 0, 0, 0)";
        while (parent && background === "rgba(0, 0, 0, 0)") {
          background = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        return [getComputedStyle(element).color, background];
      });
      const [a, b] = colors.map(luminance);
      expect(
        (Math.max(a!, b!) + 0.05) / (Math.min(a!, b!) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
    api.profile.status = "complete";
    await page.goto("/");
    const example = page.getByText("Illustrative conversation and review", {
      exact: true,
    });
    await expect(example).toBeVisible();
    const colors = await example.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.color, style.backgroundColor];
    });
    const [a, b] = colors.map(luminance);
    expect(
      (Math.max(a!, b!) + 0.05) / (Math.min(a!, b!) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
    let release!: () => void;
    api.holds.set(
      "GET /api/auth/get-session",
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    try {
      await page.goto("/history");
      const placeholder = page.locator("[data-workspace-placeholder]");
      await expect(placeholder).toBeVisible();
      const colors = await placeholder
        .getByText("Screenly", { exact: true })
        .evaluate((element) => {
          const root = element.closest("[data-workspace-placeholder]")!;
          return [
            getComputedStyle(element).color,
            getComputedStyle(root).backgroundColor,
          ];
        });
      const [a, b] = colors.map(luminance);
      expect(
        (Math.max(a!, b!) + 0.05) / (Math.min(a!, b!) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({
        path: resolve(directory, `session-loading-${theme.toLowerCase()}.png`),
        fullPage: true,
      });
    } finally {
      api.holds.delete("GET /api/auth/get-session");
      release();
    }
    await expect(page.getByRole("table")).toBeVisible();
  }
});
