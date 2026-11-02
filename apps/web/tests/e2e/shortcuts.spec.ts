import { test, expect } from "./fixtures";

test("sidebar destinations remain keyboard accessible without shortcut hints", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  const footer = page.locator('[data-slot="sidebar-footer"]');
  await expect(nav.getByRole("link")).toHaveCount(3);
  const create = page
    .getByRole("navigation", { name: "Interview actions" })
    .getByRole("link", { name: "New interview", exact: true });
  await expect(create).toHaveAttribute("href", "/interviews/new");
  await expect(nav.getByRole("link", { name: "New interview" })).toHaveCount(0);
  await expect(
    nav.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", { name: "Pick up where you left off" }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="sidebar"] kbd')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Keyboard shortcuts" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator('[data-slot="sidebar-content"]')
      .getByRole("link", { name: "Resume interview", exact: true }),
  ).toBeVisible();
  await expect(
    footer.getByRole("button", { name: "Account menu", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("classic-sidebar.png"),
    fullPage: true,
  });
  await create.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await expect(create).toHaveAttribute("aria-current", "page");

  await footer.getByRole("link", { name: "My profile", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole("button", { name: "Edit name", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Practice memory", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/memory$/);
  await expect(
    page.getByText("Explain a concrete profiler trace."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByLabel("Interviewer playback speed")).toBeVisible();
});

test("removed navigation shortcuts no longer intercept keys", async ({
  page,
  api,
}) => {
  api.interviews = api.interviews.filter((item) => item.status !== "active");
  await page.goto("/history");
  await expect(
    page.getByRole("link", { name: "Resume interview", exact: true }),
  ).toHaveCount(0);
  const search = page.getByRole("textbox", { name: "Search interviews" });
  await search.fill("gn?");
  await expect(page).toHaveURL(/\/history$/);
  await search.fill("");
  await search.blur();
  const prevented = await page.evaluate(() =>
    ["g", "n", "?"].map(
      (key) =>
        !window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        ),
    ),
  );
  expect(prevented).toEqual([false, false, false]);
  await page.keyboard.press("g");
  await page.keyboard.press("n");
  await page.keyboard.press("?");
  await expect(page).toHaveURL(/\/history$/);
  await expect(
    page.getByRole("dialog", { name: "Keyboard shortcuts" }),
  ).toHaveCount(0);
});

test("keyboard navigation preserves the live interview exit guard", async ({
  page,
  api,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/interviews/active");
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("g");
  await page.keyboard.press("d");
  await expect(page).toHaveURL(/\/interviews\/active$/);
  await expect(
    page.getByRole("alertdialog", { name: "Leave this interview?" }),
  ).toHaveCount(0);

  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  const drawer = page.getByRole("dialog");
  await expect(
    drawer.getByRole("link", { name: "My profile", exact: true }),
  ).toBeVisible();
  await expect(drawer.locator("kbd")).toHaveCount(0);
  await drawer
    .getByRole("link", { name: "New interview", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("alertdialog", { name: "Leave this interview?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep interviewing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interviews\/active$/);
  expect(api.interviews.find((item) => item.id === "active")?.status).toBe(
    "active",
  );

  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await drawer
    .getByRole("link", { name: "New interview", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Leave for now", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
});
