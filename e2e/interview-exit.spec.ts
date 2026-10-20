import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { signInForTest } from "./session-fixture";
import { backendURL, voiceURL } from "./environment";

async function setup(page: Page, context: BrowserContext) {
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const target = window as Window & {
      exitTracks: MediaStreamTrack[];
      exitSockets: WebSocket[];
    };
    target.exitTracks = [];
    target.exitSockets = [];
    const debug = window as Window & {
      exitNavigationEvents: unknown[];
      navigation?: EventTarget;
    };
    debug.exitNavigationEvents = [];
    debug.navigation?.addEventListener("navigate", (raw) => {
      const event = raw as Event & {
        navigationType: string;
        canIntercept: boolean;
        destination: { url: string };
      };
      debug.exitNavigationEvents.push({
        type: event.navigationType,
        canIntercept: event.canIntercept,
        cancelable: event.cancelable,
        to: new URL(event.destination.url).pathname,
        from: location.pathname,
      });
    });
    const capture = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await capture(constraints);
      target.exitTracks.push(...stream.getAudioTracks());
      return stream;
    };
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/")) target.exitSockets.push(this);
      }
    };
  });
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 20, automaticAnswer: false },
  });
  await signInForTest(context);
  const created = await page.request.post(`${backendURL}/api/interviews`, {
    data: {
      role: "Backend",
      level: "Mid-level",
      topics: ["APIs"],
      duration: 10,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  // Real client transitions retain a same-document Back/Forward history.
  await page.goto("/history");
  await page.getByRole("link", { name: /^Backend interview/ }).click();
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible({ timeout: 15000 }); // Includes the first local ONNX/WASM load.
  return id as string;
}
const warning = (page: Page) =>
  page.getByRole("alertdialog", { name: "Leave this interview?", exact: true });
async function chooseHistory(page: Page) {
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Navigation", exact: true })
    .getByRole("link", { name: "History", exact: true })
    .click();
}
async function cleanup(page: Page, context: BrowserContext, id: string) {
  // Preserve navigation diagnostics without cookies, headers or session secrets.
  if (!page.isClosed())
    await test.info().attach("navigation-events", {
      body: JSON.stringify(
        await page.evaluate(() => {
          const target = window as Window & {
            exitNavigationEvents?: unknown[];
            navigation?: {
              currentEntry?: { index: number; key: string; url: string };
              entries(): { index: number; key: string; url: string }[];
            };
          };
          return {
            precommit: "NavigationPrecommitController" in window,
            events: target.exitNavigationEvents ?? [],
            current: target.navigation?.currentEntry
              ? {
                  index: target.navigation.currentEntry.index,
                  key: target.navigation.currentEntry.key,
                  path: new URL(target.navigation.currentEntry.url).pathname,
                }
              : null,
            entries: target.navigation
              ?.entries()
              .map(({ index, key, url }) => ({
                index,
                key,
                path: new URL(url).pathname,
              })),
          };
        }),
      ),
      contentType: "application/json",
    });
  // Force-close only in teardown; actual browser exit warnings are exercised below.
  await page.close();
  await context.request.delete(`${backendURL}/api/interviews/${id}`);
  await context.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 45, automaticAnswer: true },
  });
}

test("active interview confirms links, search and sign-out without interrupting on cancel", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const id = await setup(page, context);
  try {
    const originalURL = page.url();
    const startedAt = (
      await (
        await page.request.get(`${backendURL}/api/interviews/${id}`)
      ).json()
    ).startedAt;
    await chooseHistory(page);
    await expect(warning(page)).toBeVisible();
    await expect(page).toHaveURL(originalURL);
    await expect(warning(page)).toContainText(
      "words still being transcribed may be lost",
    );
    await expect(warning(page)).toContainText("timer keeps running");
    await expect(
      warning(page).getByRole("button", { name: "Keep interviewing" }),
    ).toBeFocused();
    await mkdir(".impeccable/review", { recursive: true });
    await page.screenshot({
      path: ".impeccable/review/interview-exit-desktop.png",
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: ".impeccable/review/interview-exit-mobile.png",
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Keep interviewing", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Open navigation", exact: true }),
    ).toBeFocused();
    expect(
      await page.evaluate(() => {
        const target = window as Window & {
          exitTracks: MediaStreamTrack[];
          exitSockets: WebSocket[];
        };
        return (
          target.exitTracks.some(
            (track) => track.readyState === "live" && track.enabled,
          ) && target.exitSockets.at(-1)?.readyState === WebSocket.OPEN
        );
      }),
    ).toBe(true);
    expect(
      (
        await (
          await page.request.get(`${backendURL}/api/interviews/${id}`)
        ).json()
      ).startedAt,
    ).toBe(startedAt);

    await page.keyboard.press("Control+k");
    await page
      .getByRole("combobox", { name: "Search workspace" })
      .fill("Progress");
    await page.keyboard.press("Enter");
    await expect(warning(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(warning(page)).not.toBeVisible();
    await expect(page).toHaveURL(originalURL);

    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Navigation", exact: true })
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(warning(page)).toBeVisible();
    await page
      .getByRole("button", { name: "Keep interviewing", exact: true })
      .click();
    expect(
      (await page.request.get(`${backendURL}/api/interviews/${id}`)).status(),
    ).toBe(200);
    await expect(
      page.getByRole("button", { name: "Mute", exact: true }),
    ).toBeEnabled();

    let signOutCalls = 0;
    await page.route("**/api/auth/sign-out", async (route) => {
      signOutCalls++;
      await route.fulfill({ status: 503, json: { message: "Try again" } });
    });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Navigation", exact: true })
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect(warning(page)).toBeVisible();
    expect(signOutCalls).toBe(0);
    const failedSignOut = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/sign-out"),
    );
    await page
      .getByRole("button", { name: "Leave for now", exact: true })
      .click();
    expect((await failedSignOut).status()).toBe(503);
    await expect(
      page.getByRole("button", { name: "Mute", exact: true }),
    ).toBeEnabled();
    await chooseHistory(page);
    await expect(warning(page)).toBeVisible();
    await page
      .getByRole("button", { name: "Keep interviewing", exact: true })
      .click();
    await page.unroute("**/api/auth/sign-out");

    // A rejected browser refresh or close must retain the live document/session.
    const reloadWarning = page.waitForEvent("dialog");
    // Playwright waits for a load even when the native prompt cancels reload.
    const reload = page.reload({ timeout: 5000 }).catch(() => null);
    const refreshDialog = await reloadWarning;
    expect(refreshDialog.type()).toBe("beforeunload");
    await refreshDialog.dismiss();
    await reload;
    await expect(page).toHaveURL(originalURL);
    await expect(
      page.getByRole("button", { name: "Mute", exact: true }),
    ).toBeEnabled();
    const closing = page.waitForEvent("dialog");
    await page.close({ runBeforeUnload: true });
    const closeDialog = await closing;
    expect(closeDialog.type()).toBe("beforeunload");
    await closeDialog.dismiss();
    expect(page.isClosed()).toBe(false);
    await expect(
      page.getByRole("button", { name: "Mute", exact: true }),
    ).toBeEnabled();

    await page.keyboard.press("Control+k");
    await page
      .getByRole("combobox", { name: "Search workspace" })
      .fill("Progress");
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: "Leave for now", exact: true })
      .click();
    await expect(page).toHaveURL(/\/progress$/);
    expect(
      (
        await (
          await page.request.get(`${backendURL}/api/interviews/${id}`)
        ).json()
      ).status,
    ).toBe("active");
  } finally {
    await cleanup(page, context, id);
  }
});

test("browser Back and Forward can be cancelled or confirmed without duplicating history", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const id = await setup(page, context);
  try {
    const interviewURL = page.url();
    await page.evaluate(() => history.back());
    await expect(warning(page)).toBeVisible();
    await expect(page).toHaveURL(interviewURL);
    await page
      .getByRole("button", { name: "Keep interviewing", exact: true })
      .click();
    await page.evaluate(() => history.back());
    await expect(warning(page)).toBeVisible();
    await page
      .getByRole("button", { name: "Leave for now", exact: true })
      .click();
    await expect(page).toHaveURL(/\/history$/);
    await expect(
      page.getByRole("heading", { name: "History", exact: true }),
    ).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(interviewURL);
    await expect(
      page.getByRole("button", { name: "Resume interview", exact: true }),
    ).toBeVisible();
    // Make a forward destination without changing the saved interview budget.
    await page.keyboard.press("Control+k");
    await page
      .getByRole("combobox", { name: "Search workspace" })
      .fill("Progress");
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: "Leave for now", exact: true })
      .click();
    await expect(page).toHaveURL(/\/progress$/);
    await page.goBack();
    await expect(page).toHaveURL(interviewURL);
    await expect(
      page.getByRole("button", { name: "Resume interview", exact: true }),
    ).toBeVisible();
    // Drive the browser's history controls, rather than repeatedly queueing
    // history.forward() calls while the browser cancels a prior traversal.
    const cancelForward = page.goForward({ timeout: 5000 }).catch(() => null);
    await expect(warning(page)).toBeVisible();
    await expect(page).toHaveURL(interviewURL);
    await page
      .getByRole("button", { name: "Keep interviewing", exact: true })
      .click();
    await cancelForward;
    await expect(warning(page)).toHaveCount(0);
    const confirmForward = page.goForward({ timeout: 15000 });
    await expect(warning(page)).toBeVisible();
    await page
      .getByRole("button", { name: "Leave for now", exact: true })
      .click();
    await confirmForward;
    await expect(page).toHaveURL(/\/progress$/);
    await expect(
      page.getByRole("heading", { name: "Progress", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (
            window as Window & { navigation: { entries(): unknown[] } }
          ).navigation.entries().length,
      ),
    ).toBe(3);
  } finally {
    await cleanup(page, context, id);
  }
});

test("end and leave saves once, retries failures, releases capture and honors the chosen destination", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  const id = await setup(page, context);
  try {
    let calls = 0;
    await page.route(`**/api/interviews/${id}/finish`, async (route) => {
      calls++;
      if (calls === 1)
        await route.fulfill({ status: 503, json: { error: "Please retry" } });
      else await route.continue();
    });
    await chooseHistory(page);
    await page
      .getByRole("button", { name: "End and leave", exact: true })
      .click();
    await expect(warning(page).getByRole("alert")).toContainText(
      "Could not end",
    );
    await expect(page).toHaveURL(new RegExp(`/interviews/${id}$`));
    await page
      .getByRole("button", { name: "End and leave", exact: true })
      .click();
    await expect(page).toHaveURL(/\/history$/);
    expect(calls).toBe(2);
    const saved = await (
      await page.request.get(`${backendURL}/api/interviews/${id}`)
    ).json();
    expect(saved.status).toBe("completed");
    expect(saved.feedbackStatus).not.toBe("skipped");
    await expect
      .poll(() =>
        page.evaluate(() =>
          (
            window as Window & { exitTracks: MediaStreamTrack[] }
          ).exitTracks.every((track) => track.readyState === "ended"),
        ),
      )
      .toBe(true);
    await expect(warning(page)).toHaveCount(0);
    // Completed sessions do not show either exit warning on reload.
    await page.reload();
    await expect(page).toHaveURL(/\/history$/);
  } finally {
    await cleanup(page, context, id);
  }
});
