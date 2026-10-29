import { test, expect } from "./fixtures";

test("public landing presents labelled transcript and qualitative review at supported screen widths", async ({
  page,
  api,
}) => {
  api.authenticated = false;
  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Practice a technical conversation.",
    );
    await expect(
      page.getByRole("region", { name: "Illustrative transcript and review" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Use a wider window" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "What do I need?" }).click();
  await expect(page.getByText(/1024 pixels wide/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Start an interview" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Use a wider window" }),
  ).toBeVisible();
});

test("all six public roles show role-specific illustrative exchanges", async ({
  page,
}) => {
  await page.goto("/");
  const example = page.getByRole("region", {
    name: "Illustrative transcript and review",
  });
  await expect(example.getByRole("tab")).toHaveCount(6);
  await example.getByRole("tab", { name: "Backend", exact: true }).click();
  const panel = example.getByRole("tabpanel", { name: "Backend", exact: true });
  await expect(panel).toContainText("idempotency key");
  await expect(
    panel.getByRole("heading", { name: "Qualitative review example" }),
  ).toBeVisible();
  await example
    .getByRole("tab", { name: "Data Engineering", exact: true })
    .click();
  await expect(
    example.getByRole("tabpanel", { name: "Data Engineering example" }),
  ).toContainText("backfill");
  await expect(
    example.getByText(/\/ 10|Answer 1|score breakdown/i),
  ).toHaveCount(0);
});
