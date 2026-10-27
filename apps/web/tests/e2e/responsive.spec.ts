import { test, expect } from "./fixtures";

test("desktop routes fit the supported widths with long content", async ({
  page,
  api,
}, testInfo) => {
  test.setTimeout(180_000);
  api.profile.details.name =
    "Alexandra Morgan with a long account display name";
  api.interviews[0]!.messages[0]!.content =
    "Describe an accessible, resilient application with long-running requests and the performance trade-offs. ".repeat(
      3,
    );
  for (const width of [1024, 1280, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 768 });
    for (const path of [
      "/",
      "/dashboard",
      "/interviews/new",
      "/history",
      "/interviews/completed/feedback",
      "/settings",
      "/help",
      "/library",
      "/plans",
      "/progress",
      "/saved",
      "/onboarding?edit=1",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path !== "/" && !path.startsWith("/onboarding")) {
        await expect(page.locator("#workspace-content")).toBeFocused();
        await expect(
          page.getByRole("link", { name: "Overview", exact: true }),
        ).toBeVisible();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}px`,
      ).toBe(true);
      if (
        width === 1440 &&
        [
          "/history",
          "/onboarding?edit=1",
          "/interviews/completed/feedback",
        ].includes(path)
      ) {
        const name = `${path.split("/").filter(Boolean).join("-").replace("?edit=1", "")}-${width}.png`;
        const screenshot = await page.screenshot({
          path: testInfo.outputPath(name),
          fullPage: true,
        });
        await testInfo.attach(name, {
          body: screenshot,
          contentType: "image/png",
        });
      }
    }
  }
});

test("short desktop live window keeps the drawer and controls reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/interviews/active");
  const finish = page.getByRole("button", {
    name: "Finish interview",
    exact: true,
  });
  await expect(finish).toBeInViewport();
  const trigger = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await trigger.click();
  const account = page.getByRole("button", {
    name: "Account menu",
    exact: true,
  });
  await account.scrollIntoViewIfNeeded();
  await account.click();
  await expect(
    page.getByRole("menuitem", { name: "Sign out", exact: true }),
  ).toBeInViewport();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(finish).toBeInViewport();
});

test("narrow boundary preserves a live session and reconnects its visible controls on resize", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  const finish = page.getByRole("button", {
    name: "Finish interview",
    exact: true,
  });
  await expect(finish).toBeVisible();
  await expect.poll(() => api.sockets.size).toBe(1);
  const socket = [...api.sockets][0];
  await finish.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.setViewportSize({ width: 1023, height: 768 });
  await expect(
    page.getByRole("heading", { name: "Use a wider window" }),
  ).toBeVisible();
  await expect(finish).toBeHidden();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect(api.sockets.has(socket!)).toBe(true);
  api.send({
    type: "partial",
    text: "A synthetic answer while the window is narrow.",
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(finish).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Current conversation" })
      .getByText("A synthetic answer while the window is narrow."),
  ).toBeVisible();
  expect(api.sockets.has(socket!)).toBe(true);
});

test("portaled tooltips do not accompany the narrow-window guidance", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  const audio = page.getByRole("button", {
    name: "Audio settings",
    exact: true,
  });
  await audio.focus();
  await expect(
    page.getByRole("tooltip", { name: "Audio settings" }),
  ).toBeVisible();
  await expect.poll(() => api.sockets.size).toBe(1);
  const socket = [...api.sockets][0];
  await page.setViewportSize({ width: 1023, height: 768 });
  await expect(
    page.getByRole("heading", { name: "Use a wider window" }),
  ).toBeVisible();
  await expect(
    page.getByRole("tooltip", { name: "Audio settings" }),
  ).toBeHidden();
  expect(api.sockets.has(socket!)).toBe(true);
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(audio).toBeVisible();
  expect(api.sockets.has(socket!)).toBe(true);
});

test("narrow screens show desktop guidance and text scaling reflows history", async ({
  page,
}) => {
  for (const width of [360, 768, 1023]) {
    await page.setViewportSize({ width, height: 768 });
    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "Use a wider window" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Overview", exact: true }),
    ).toBeHidden();
  }
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.getByRole("textbox", { name: "Search interviews", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
