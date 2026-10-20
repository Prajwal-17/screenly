import { acceptDocumentExit } from "./navigation";
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { backendURL, voiceURL } from "./environment";
import { signInForTest } from "./session-fixture";

test("the immersive interview fits wide, narrow, short, and rotated windows without page scrolling", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await context.grantPermissions(["microphone"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/"))
          (window as Window & { viewportSocket?: WebSocket }).viewportSocket =
            this;
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
      topics: ["APIs", "Databases"],
      duration: 20,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const question =
    "Imagine your API accepts a payment request, writes to a database, and publishes an event for another service. The client can retry when the network is unreliable. How would you make this flow safe so that a retry never charges someone twice, while still recovering if publishing the event fails after the database write has already completed? Walk me through your approach and explain the main trade-off you would make when choosing where to enforce idempotency and how long to retain the request keys.";
  await mkdir(".impeccable/review", { recursive: true });
  try {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto(`/interviews/${id}`);
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    // Wait for the authoritative first-playback clock update before injecting
    // the long layout fixture, so a late ready snapshot cannot replace it.
    await expect(page.getByRole("timer")).not.toHaveText("00:00/ 20:00");
    await page.screenshot({
      path: ".impeccable/review/viewport-normal.png",
      animations: "disabled",
    });
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(
      page.getByRole("complementary", { name: "Screenly workspace" }),
    ).not.toBeVisible();
    await page.evaluate((content) => {
      const socket = (window as Window & { viewportSocket: WebSocket })
        .viewportSocket;
      socket.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "message",
            message: {
              id: "viewport-question",
              role: "assistant",
              status: "complete",
              content,
              createdAt: Date.now(),
            },
          }),
        }),
      );
    }, question);
    await page.request.post(`${voiceURL}/partial`, {
      data: {
        transcript:
          "I would use an idempotency key for each payment request and save the result with the database transaction. Then I would use an outbox to publish the event safely.",
      },
    });
    await expect(page.locator('[data-slot="candidate-caption"]')).toContainText(
      "outbox",
    );
    await mkdir(".impeccable/review", { recursive: true });
    for (const [width, height] of [
      [1920, 900],
      [1536, 720],
      [1440, 900],
      [1280, 720],
      [1024, 600],
      [900, 700],
      [768, 1024],
      [640, 640],
      [390, 844],
      [360, 640],
      [320, 568],
      [844, 390],
      [667, 375],
      [568, 320],
      [1280, 400],
    ] as const) {
      await page.setViewportSize({ width, height });
      const compact = width <= 767 && height <= 500;
      const toggle = page
        .getByRole("main")
        .getByRole("button", { name: /^Transcript/ });
      if (compact && (await toggle.getAttribute("aria-expanded")) === "true")
        await toggle.click();
      if (!compact && (await toggle.getAttribute("aria-expanded")) !== "true")
        await toggle.click();
      await expect
        .poll(() =>
          page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
            x: scrollX,
            y: scrollY,
          })),
        )
        .toEqual({ width, height, x: 0, y: 0 });
      await expect(
        page.getByRole("button", { name: "Jump to latest", exact: true }),
      ).toHaveCount(0);
      if (!compact)
        await expect(
          page.locator('[data-live-message="candidate"] p'),
        ).toBeInViewport({ ratio: 0.01 });
      const caption = page.locator('[data-slot="live-caption"]');
      await expect(caption).toHaveText(question);
      await expect
        .poll(
          () =>
            caption.evaluate((node) => node.scrollHeight - node.clientHeight),
          { message: `Full question fits at ${width}×${height}` },
        )
        .toBeLessThanOrEqual(1);
      await expect
        .poll(
          () =>
            caption.evaluate(
              (node) =>
                node.parentElement!.scrollHeight -
                node.parentElement!.clientHeight,
            ),
          { message: `Conversation fits at ${width}×${height}` },
        )
        .toBeLessThanOrEqual(1);
      const timerBounds = await page.getByRole("timer").boundingBox();
      const toggleBounds = await toggle.boundingBox();
      expect(timerBounds!.x).toBeGreaterThanOrEqual(
        toggleBounds!.x + toggleBounds!.width,
      );
      expect(timerBounds!.x + timerBounds!.width).toBeLessThanOrEqual(width);
      const controls = page.getByRole("group", { name: "Interview controls" });
      const captionBounds = await caption.boundingBox();
      const controlsBounds = await controls.boundingBox();
      const footerBounds = await controls.locator("..").boundingBox();
      expect(footerBounds!.width).toBe(controlsBounds!.width);
      if (width >= 900 || (width >= 768 && height <= 500)) {
        const stageBounds = await page
          .getByRole("region", { name: "Current conversation" })
          .boundingBox();
        const transcriptBounds = await page
          .locator("#live-transcript")
          .boundingBox();
        expect(
          Math.abs(
            controlsBounds!.x +
              controlsBounds!.width / 2 -
              (stageBounds!.x + stageBounds!.width / 2),
          ),
        ).toBeLessThanOrEqual(1);
        expect(transcriptBounds!.y + transcriptBounds!.height).toBeGreaterThan(
          controlsBounds!.y + controlsBounds!.height,
        );
      }
      expect(captionBounds!.y).toBeGreaterThanOrEqual(56);
      expect(captionBounds!.y + captionBounds!.height).toBeLessThanOrEqual(
        controlsBounds!.y,
      );
      for (const button of await controls.getByRole("button").all()) {
        const box = await button.boundingBox();
        expect(
          box,
          `${await button.getAttribute("aria-label")} at ${width}×${height}`,
        ).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({
        path: `.impeccable/review/viewport-${width}x${height}.png`,
        animations: "disabled",
      });
      if (compact) {
        await toggle.click();
        await expect(page.getByRole("log")).toBeVisible();
        await expect(controls).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollHeight),
          )
          .toBe(height);
        await page
          .getByRole("button", { name: "Close transcript", exact: true })
          .click();
        await expect(caption).toBeVisible();
      }
    }
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(
      page.getByText("Microphone muted", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
      .toBe(400);
    await expect(page.locator('[data-slot="live-caption"]')).toHaveText(
      question,
    );
    await page.getByRole("button", { name: "Unmute", exact: true }).click();
    await page.evaluate((content) => {
      (
        window as Window & { viewportSocket: WebSocket }
      ).viewportSocket.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "message",
            message: {
              id: "formatted-question",
              role: "assistant",
              status: "complete",
              content,
              createdAt: Date.now(),
            },
          }),
        }),
      );
    }, `**Payment processing**\n\n${question}`);
    const formattedCaption = page.locator('[data-slot="live-caption"]');
    await expect(
      formattedCaption.getByText("Payment processing", { exact: true }),
    ).toHaveCSS("font-weight", "600");
    await expect(formattedCaption).toContainText("retain the request keys");
    await expect
      .poll(() =>
        formattedCaption.evaluate(
          (node) => node.scrollHeight - node.clientHeight,
        ),
      )
      .toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      (
        window as Window & { viewportSocket: WebSocket }
      ).viewportSocket.dispatchEvent(
        new MessageEvent("message", {
          data: JSON.stringify({
            type: "error",
            scope: "speech",
            message:
              "Speech playback was interrupted. Retry speech to continue.",
          }),
        }),
      );
    });
    await expect(
      page.getByRole("button", { name: "Retry speech", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
      .toBe(400);
    const finish = await page
      .getByRole("button", { name: "Finish interview", exact: true })
      .boundingBox();
    expect(finish!.y + finish!.height).toBeLessThanOrEqual(400);
    await page.screenshot({
      path: ".impeccable/review/viewport-error.png",
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Navigation", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation", exact: true }),
    ).toBeFocused();
    expect(errors).toEqual([]);
  } finally {
    await acceptDocumentExit(page, () => page.goto("/history"));
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true },
    });
  }
});
