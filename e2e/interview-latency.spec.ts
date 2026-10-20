import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { backendURL, voiceURL } from "./environment";
import { signInForTest } from "./session-fixture";
import { acceptDocumentExit } from "./navigation";

test("continuous microphone input keeps the interview responsive and partial words current", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const metrics = {
      commits: 0,
      layoutReads: 0,
      draws: 0,
      bufferPixels: 0,
      partialReceivedAt: 0,
      partialPaintMs: 0,
    };
    const target = window as Window & {
      interviewMetrics: typeof metrics;
      __REACT_DEVTOOLS_GLOBAL_HOOK__: object;
    };
    target.interviewMetrics = metrics;
    target.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject: () => 1,
      onCommitFiberRoot: () => metrics.commits++,
      onCommitFiberUnmount: () => {},
      checkDCE: () => {},
    };
    const bounds = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.closest('[data-slot="voice-visual"]')) metrics.layoutReads++;
      return bounds.call(this);
    };
    const draw = WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      if (
        (this.canvas as HTMLCanvasElement).closest('[data-slot="voice-visual"]')
      ) {
        metrics.draws++;
        metrics.bufferPixels = Math.max(
          metrics.bufferPixels,
          this.drawingBufferWidth * this.drawingBufferHeight,
        );
      }
      return draw.apply(this, args);
    };
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this.addEventListener("message", (event) => {
          if (typeof event.data !== "string") return;
          const data = JSON.parse(event.data);
          if (data.type !== "partial" || !data.text) return;
          const received = performance.now();
          metrics.partialReceivedAt = received;
          requestAnimationFrame(() => {
            if (
              document
                .querySelector('[data-slot="candidate-caption"]')
                ?.textContent?.includes(data.text)
            )
              metrics.partialPaintMs = performance.now() - received;
          });
        });
      }
    };
  });
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 45, automaticAnswer: false },
  });
  await signInForTest(context);
  const created = await page.request.post(`${backendURL}/api/interviews`, {
    data: {
      role: "Frontend",
      level: "Senior",
      topics: ["React"],
      duration: 10,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  try {
    await page.goto(`/interviews/${id}`);
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const metrics = await page.evaluate(async () => {
      const read = () =>
        (
          window as Window & {
            interviewMetrics: {
              commits: number;
              layoutReads: number;
              draws: number;
              bufferPixels: number;
            };
          }
        ).interviewMetrics;
      const before = { ...read() };
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const after = read();
      return {
        reactCommits: after.commits - before.commits,
        orbLayoutReads: after.layoutReads - before.layoutReads,
        orbDraws: after.draws - before.draws,
        orbBufferPixels: after.bufferPixels,
      };
    });
    for (let index = 1; index <= 5; index++) {
      await page.request.post(`${voiceURL}/partial`, {
        data: { transcript: `I would check React state update ${index}.` },
      });
    }
    await expect(page.locator('[data-slot="candidate-caption"]')).toContainText(
      "update 5.",
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & {
                interviewMetrics: { partialPaintMs: number };
              }
            ).interviewMetrics.partialPaintMs,
        ),
      )
      .toBeGreaterThan(0);
    const partialPaintMs = await page.evaluate(
      () =>
        (window as Window & { interviewMetrics: { partialPaintMs: number } })
          .interviewMetrics.partialPaintMs,
    );
    await mkdir(".impeccable/review", { recursive: true });
    const label = process.env.LATENCY_BASELINE ? "baseline" : "optimized";
    await writeFile(
      `.impeccable/review/latency-${label}.json`,
      JSON.stringify({ ...metrics, partialPaintMs }, null, 2),
    );
    console.log(
      `Interview latency (${label}): ${JSON.stringify({ ...metrics, partialPaintMs })}`,
    );
    if (!process.env.LATENCY_BASELINE) {
      expect(metrics.reactCommits).toBeGreaterThan(0);
      expect(metrics.reactCommits).toBeLessThanOrEqual(8);
      expect(metrics.orbLayoutReads).toBeLessThanOrEqual(4);
      expect(metrics.orbDraws).toBeGreaterThan(0);
      expect(metrics.orbBufferPixels).toBeLessThan(80000);
    }
    expect(partialPaintMs).toBeLessThan(250);
  } finally {
    await acceptDocumentExit(page, () => page.goto("/history"));
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true },
    });
  }
});
