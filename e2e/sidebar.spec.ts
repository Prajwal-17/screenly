import { expect, test } from "@playwright/test";
import { backendURL } from "./environment";

test("structured sidebar, remembered rail, workspace search, and interview focus", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/auth/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Alex Morgan");
  await page
    .getByLabel("Email address")
    .fill(`sidebar-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("sidebar-preview-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const sidebar = page.getByRole("complementary", {
    name: "Screenly workspace",
  });
  const capture = async (name: string) => {
    if (!process.env.CAPTURE_SCREENSHOTS) return;
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `docs/screenshots/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  };
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(256);
  await capture("sidebar-expanded");
  await page.getByRole("button", { name: "Switch workspace" }).click();
  await expect(
    page.getByRole("menuitem", { name: "Personal workspace" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Switch workspace" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Notifications" }).click();
  await expect(
    page.getByText("You’re all caught up", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", {
    name: "Search workspace",
    exact: true,
  });
  await expect(search).toBeVisible();
  const query = page.getByRole("combobox", { name: "Search workspace pages" });
  await expect(query).toBeFocused();
  await query.fill("library");
  await capture("sidebar-search");
  await query.press("Enter");
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    sidebar.getByRole("link", { name: "Question library", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: /Where should this state live/ })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Where should this state live?",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect
    .poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0))
    .toBe(72);
  await sidebar
    .getByRole("link", { name: "Question library", exact: true })
    .hover();
  await expect(page.getByRole("tooltip")).toHaveText("Question library");
  await page.mouse.move(900, 100);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await capture("sidebar-collapsed");
  await page.reload();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(
    page.getByRole("button", { name: "Expand sidebar", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(256);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await sidebar
    .getByRole("link", { name: "New interview", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  const interviewId = page.url().split("/").at(-1)!;
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toBeVisible();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(sidebar).toHaveAttribute("data-focus-mode", "true");
  await expect
    .poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0))
    .toBe(72);
  await capture("sidebar-interview-focus");
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await sidebar.getByRole("link", { name: "History", exact: true }).click();
  await expect(sidebar).toHaveAttribute("data-state", "expanded");
  await expect(sidebar).toHaveAttribute("data-focus-mode", "false");
  await page.request.delete(`${backendURL}/api/interviews/${interviewId}`);

  await page.setViewportSize({ width: 360, height: 800 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Navigation", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Saved answers", exact: true }),
  ).toBeInViewport();
  await capture("sidebar-mobile");
  await page
    .getByRole("button", { name: "Search workspace", exact: true })
    .click();
  await expect(search).toBeVisible();
  await expect(query).toBeFocused();
  await query.fill("settings");
  await query.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your account", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
