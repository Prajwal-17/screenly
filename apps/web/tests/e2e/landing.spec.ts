import { test, expect } from "./fixtures";

test("public landing adapts to small screens without exposing the desktop boundary", async ({
  page,
  api,
}) => {
  api.authenticated = false;
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your next interview.A real conversation.",
    );
    await expect(
      page.getByRole("heading", { name: "Use a wider window" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Interactive interview example" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("link", { name: "Start an interview", exact: true })
        .first(),
    ).toHaveAttribute("href", "/interviews/new");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    ).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const question = page.getByRole("button", {
    name: "What do I need to get started?",
  });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("region", { name: "What do I need to get started?" }),
  ).toContainText("1024 pixels");
  await question.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("heading", { name: "Ready when you are." }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Start an interview", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Use a wider window" }),
  ).toBeVisible();
});

test("example roles and follow-ups work with keyboard and reset when changing roles", async ({
  page,
}) => {
  await page.goto("/");
  const example = page.getByRole("region", {
    name: "Interactive interview example",
  });
  await expect(
    example.getByText("Interactive example", { exact: true }),
  ).toBeVisible();
  await example.getByRole("tab", { name: "Frontend", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  const backend = example.getByRole("tab", { name: "Backend", exact: true });
  await expect(backend).toBeFocused();
  await expect(backend).toHaveAttribute("aria-selected", "true");
  const panel = example.getByRole("tabpanel", { name: "Backend", exact: true });
  await expect(panel).toContainText(
    "How would you make sure a payment isn’t processed twice?",
  );

  const followUp = panel.getByRole("button", { name: "See the follow-up" });
  await followUp.focus();
  await page.keyboard.press("Enter");
  await expect(
    panel.getByRole("button", { name: "First question" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(panel.locator('[aria-live="polite"]')).toHaveText(
    "What would happen if two requests with the same key arrived at the same time?",
  );

  await example.getByRole("tab", { name: "Full-stack", exact: true }).click();
  const fullStack = example.getByRole("tabpanel", {
    name: "Full-stack",
    exact: true,
  });
  await expect(
    fullStack.getByRole("button", { name: "See the follow-up" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(fullStack.locator('[aria-live="polite"]')).toContainText(
    "dashboard up to date",
  );
  await fullStack.getByRole("button", { name: "See the follow-up" }).click();
  await expect(fullStack.locator('[aria-live="polite"]')).toContainText(
    "connection was offline",
  );
  await fullStack.getByRole("button", { name: "First question" }).click();
  await expect(fullStack.locator('[aria-live="polite"]')).toContainText(
    "dashboard up to date",
  );

  await page
    .getByRole("link", { name: "Start an interview", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/interviews\/new$/);
  await expect(
    page.getByRole("radio", { name: "Frontend", exact: true }),
  ).toBeVisible();
});
