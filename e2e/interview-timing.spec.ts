import { acceptDocumentExit } from "./navigation";
import { expect, test } from "@playwright/test";
import { backendURL, voiceURL } from "./environment";
import { signInForTest } from "./session-fixture";

test("the interview budget excludes the introduction and starts when the first technical question plays", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const target = window as Window & {
      openingPlayer: AudioContext;
      openingSocket: WebSocket;
      openingFrames: number;
    };
    target.openingFrames = 0;
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      private holdOpening = true;
      constructor(options?: AudioContextOptions) {
        super(options);
        if (options?.sampleRate !== 16000) target.openingPlayer = this;
        else this.holdOpening = false;
      }
      async resume() {
        await super.resume();
        if (this.holdOpening) {
          this.holdOpening = false;
          await super.suspend();
        }
      }
    };
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/")) {
          target.openingSocket = this;
          this.addEventListener("message", (event) => {
            if (typeof event.data !== "string") target.openingFrames++;
          });
        }
      }
    };
  });
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 100, automaticAnswer: false, audioDelayMs: 3500 },
  });
  await signInForTest(context);
  const created = await page.request.post(`${backendURL}/api/interviews`, {
    data: {
      role: "Frontend",
      level: "Mid-level",
      topics: ["React"],
      duration: 10,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const saved = async () =>
    (await page.request.get(`${backendURL}/api/interviews/${id}`)).json();
  try {
    await page.goto(`/interviews/${id}`);
    await expect(
      page.getByText(
        "A short introduction first. Your timer starts with the first technical question.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 15000 });
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    const timer = page.getByRole("timer");
    await expect(timer).toHaveText("00:00/ 10:00");
    await expect(page.locator('[data-slot="live-caption"]')).toContainText(
      "Ready to begin?",
    );
    // Opening text and a ready TTS connection must not start the clock.
    expect((await saved()).startedAt).toBeNull();
    expect(
      await page.evaluate(
        () => (window as Window & { openingFrames: number }).openingFrames,
      ),
    ).toBe(0);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as Window & { openingFrames: number }).openingFrames,
          ),
        { timeout: 10000 },
      )
      .toBeGreaterThan(0);
    // Audio has arrived but is queued in a suspended context, so none has played.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { openingPlayer: AudioContext }).openingPlayer
              .state,
        ),
      )
      .toBe("suspended");
    await page.waitForTimeout(1200); // Cross a timer tick while playback is intentionally blocked.
    expect((await saved()).startedAt).toBeNull();
    await expect(timer).toHaveText("00:00/ 10:00");
    await page.evaluate(() =>
      (
        window as Window & { openingPlayer: AudioContext }
      ).openingPlayer.resume(),
    );
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    expect((await saved()).startedAt).toBeNull();
    await page.evaluate(() =>
      (
        window as Window & { openingPlayer: AudioContext }
      ).openingPlayer.suspend(),
    );
    const openingFrames = await page.evaluate(
      () => (window as Window & { openingFrames: number }).openingFrames,
    );
    await page.request.post(`${voiceURL}/turn`, {
      data: { transcript: "Yes, ready." },
    });
    await expect(page.locator('[data-slot="live-caption"]')).toContainText(
      "How would you test a component",
    );
    await expect
      .poll(
        () =>
          page.evaluate(
            () => (window as Window & { openingFrames: number }).openingFrames,
          ),
        { timeout: 10000 },
      )
      .toBeGreaterThan(openingFrames);
    expect((await saved()).startedAt).toBeNull();
    const beforePlayback = Date.now();
    await page.evaluate(() =>
      (
        window as Window & { openingPlayer: AudioContext }
      ).openingPlayer.resume(),
    );
    await expect.poll(async () => (await saved()).startedAt).not.toBeNull();
    const startedAt = (await saved()).startedAt as number;
    expect(startedAt).toBeGreaterThanOrEqual(beforePlayback);
    await expect(timer).not.toHaveText("00:00/ 10:00");
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() =>
      (window as Window & { openingSocket: WebSocket }).openingSocket.send(
        JSON.stringify({ type: "speak" }),
      ),
    );
    await expect.poll(async () => (await saved()).startedAt).toBe(startedAt);
    await page.evaluate(() =>
      (window as Window & { openingSocket: WebSocket }).openingSocket.close(),
    );
    await page.getByRole("button", { name: /Reconnect/ }).click();
    await page
      .getByRole("button", { name: "Resume interview", exact: true })
      .click();
    await expect(page.getByRole("timer")).toBeVisible();
    expect((await saved()).startedAt).toBe(startedAt);
    await expect(timer).not.toHaveText("00:00/ 10:00");
  } finally {
    await acceptDocumentExit(page, () => page.goto("/history"));
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true },
    });
  }
});
