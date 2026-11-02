import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test, expect } from "./fixtures";

for (const saved of ["light", "system", "dark"]) {
  test(`dark appearance ignores saved ${saved} and hides all theme choices`, async ({
    page,
    api,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(
      (saved) => localStorage.setItem("screenly:appearance", saved),
      saved,
    );
    await page.goto("/settings");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByRole("radiogroup", { name: "Appearance", exact: true }),
    ).toHaveCount(0);
    for (const name of ["Light", "Dark", "System"]) {
      await expect(page.getByRole("radio", { name, exact: true })).toHaveCount(
        0,
      );
    }
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(
      await page.evaluate(() => localStorage.getItem("screenly:appearance")),
    ).toBe(saved);
    expect(
      api.requests.filter((request) => request.method === "PUT"),
    ).toHaveLength(0);
    const html = await (await page.request.get("/")).text();
    expect(html).toMatch(/<html[^>]*class="dark /);
  });
}

test("dark appearance works when browser storage is unavailable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("button", { name: "Continue to audio", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("dashboard uses owned sessions and has an honest first-session state", async ({
  page,
  api,
}) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Pick up where you left off" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue session", exact: true }),
  ).toHaveAttribute("href", "/interviews/active");
  api.interviews = api.interviews.filter((item) => item.status === "completed");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your next practice" }),
  ).toBeVisible();
  await expect(
    page.getByText("Walk through a specific profiler trace.", { exact: true }),
  ).toBeVisible();
  api.interviews = [];
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Start with a conversation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Choose a role", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent interviews" }),
  ).toHaveCount(0);
});

test("feature previews explain the proposal without creating real state", async ({
  page,
  api,
}) => {
  for (const [route, name] of [
    ["/dashboard", "Practice plan"],
    ["/interviews/new", "Tailor to a job"],
    ["/settings", "Practice reminders"],
  ]) {
    await page.goto(route!);
    const writes = api.requests.filter(
      (request) => request.method !== "GET",
    ).length;
    const opener = page.getByRole("button", {
      name: `${name} preview`,
      exact: true,
    });
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Feature preview", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText(
        "This feature is a design preview. Nothing is created, saved or scheduled.",
      ),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(opener).toBeFocused();
    expect(
      api.requests.filter((request) => request.method !== "GET"),
    ).toHaveLength(writes);
  }
});

test("revamp capture matrix covers the pinned dark theme and all primary surfaces", async ({
  page,
  api,
}) => {
  test.setTimeout(240_000);
  const directory = resolve("../../.impeccable/review/dark-polish");
  await mkdir(directory, { recursive: true });
  for (const theme of ["dark"]) {
    for (const [name, route] of [
      ["dashboard", "/dashboard"],
      ["setup", "/interviews/new"],
      ["audio", "/interviews/draft"],
      ["history", "/history"],
      ["profile", "/profile"],
      ["memory", "/memory"],
      ["review", "/interviews/completed/feedback"],
      ["settings", "/settings"],
      ["live", "/interviews/active"],
      ["landing", "/"],
    ]) {
      await page.goto(route!);
      await expect(page.getByRole("main")).toBeVisible();
      if (route === "/interviews/new")
        await expect(
          page.getByRole("radiogroup", { name: "Interview role" }),
        ).toBeVisible();
      else if (route === "/interviews/active")
        await expect(
          page.getByRole("button", { name: "Finish interview", exact: true }),
        ).toBeVisible();
      else if (route === "/profile")
        await expect(
          page.getByRole("button", { name: "Edit headline", exact: true }),
        ).toBeVisible();
      else if (route === "/history")
        await expect(page.locator("tbody tr")).toHaveCount(3);
      if (route === "/dashboard")
        await expect(
          page.getByRole("heading", { name: "Pick up where you left off" }),
        ).toBeVisible();
      if (route === "/memory")
        await expect(
          page.getByText(api.memory[0]!.practiceFocus, { exact: true }),
        ).toBeVisible();
      if (route?.endsWith("/feedback"))
        await expect(
          page.getByText(api.interviews[0]!.review!.summary, { exact: true }),
        ).toBeVisible();
      if (route === "/")
        await expect(
          page
            .getByRole("navigation", { name: "Main navigation" })
            .getByRole("link", { name: "Go to app", exact: true }),
        ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} ${theme} overflows`,
      ).toBe(true);
      await page.screenshot({
        path: resolve(directory, `${name}-${theme}.png`),
        fullPage: true,
      });
    }
    api.profile.status = "draft";
    api.profile.onboarding.step = 1;
    await page.goto("/onboarding");
    await expect(
      page.getByRole("button", { name: "Import resume", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: resolve(directory, `onboarding-${theme}.png`),
      fullPage: true,
    });
    api.profile.status = "complete";
  }
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("radiogroup", { name: "Interview role" }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(directory, "../desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Tailor to a job preview", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: resolve(directory, "preview-dialog.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  api.authenticated = false;
  await page.goto("/auth/sign-in");
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(directory, "sign-in.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: resolve(directory, "../mobile.png"),
    fullPage: true,
  });
});
