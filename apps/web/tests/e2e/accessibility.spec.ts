import { test, expect } from "./fixtures";

function luminance(color: string) {
  const channels = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number)
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

test("rendered status text and destructive hover retain readable contrast", async ({
  page,
}) => {
  await page.goto("/history");
  await expect(page.getByRole("table")).toBeVisible();
  for (const badge of await page.locator('[data-slot="badge"]').all()) {
    const colors = await badge.evaluate((node) => {
      const style = getComputedStyle(node);
      return { text: style.color, background: style.backgroundColor };
    });
    const a = luminance(colors.text),
      b = luminance(colors.background);
    expect(
      (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    ).toBeGreaterThanOrEqual(4.5);
  }
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .first()
    .click();
  const action = page.getByRole("button", {
    name: "Delete interview",
    exact: true,
  });
  await action.hover();
  const colors = await action.evaluate((node) => {
    const style = getComputedStyle(node);
    return { text: style.color, background: style.backgroundColor };
  });
  const a = luminance(colors.text),
    b = luminance(colors.background);
  expect(
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
  ).toBeGreaterThanOrEqual(4.5);
});

test("search traps focus and setup radios support arrow keys", async ({
  page,
}) => {
  await page.goto("/interviews/new");
  const role = page.getByRole("radio", { name: "Frontend", exact: true });
  await role.focus();
  await page.keyboard.down("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await page.keyboard.up("ArrowRight");
  await page.getByRole("main").focus();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", {
    name: "Search workspace",
    exact: true,
  });
  await expect(search).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("settings omit the old collapse preference and the legacy route redirects", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByText("Keep sidebar collapsed")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page.goto("/session");
  await expect(page).toHaveURL(/\/interviews\/new$/);
});
