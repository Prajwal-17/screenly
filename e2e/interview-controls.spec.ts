import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { signInForTest } from "./session-fixture";
import { backendURL, voiceURL } from "./environment";
import { acceptDocumentExit } from "./navigation";

async function start(page: Page, context: BrowserContext) {
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const target = window as Window & {
      controlTracks: MediaStreamTrack[];
      controlContexts: AudioContext[];
      replayCalls: number;
    };
    target.controlTracks = [];
    target.controlContexts = [];
    target.replayCalls = 0;
    const get = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (options) => {
      const stream = await get(options);
      target.controlTracks.push(...stream.getAudioTracks());
      return stream;
    };
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        target.controlContexts.push(this);
      }
    };
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (typeof data === "string" && JSON.parse(data).type === "speak")
          target.replayCalls++;
        super.send(data);
      }
    };
  });
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 120, automaticAnswer: false },
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
  const { id } = await created.json();
  await page.goto(`/interviews/${id}`);
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Replay question", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  const detail = async () =>
    await (await page.request.get(`${backendURL}/api/interviews/${id}`)).json();
  await expect
    .poll(async () => (await detail()).startedAt ?? 0)
    .toBeGreaterThan(0);
  return { id, detail };
}
async function cleanup(page: Page, id: string) {
  await page.close();
  await page.request.delete(`${backendURL}/api/interviews/${id}`);
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 45, automaticAnswer: true },
  });
}
const focusStage = (page: Page) =>
  page.locator('[data-slot="live-caption"]').focus();
async function closeAudio(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
}

test("keyboard controls pause the whole session, preserve the budget across reload, and leave typing and dialogs alone", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const { id, detail } = await start(page, context);
  try {
    const controls = page.getByRole("group", { name: "Interview controls" });
    await expect(controls.getByRole("button")).toHaveCount(4);
    const startedAt = (await detail()).startedAt;
    await focusStage(page);
    await page.keyboard.press("m");
    await expect(
      controls.getByRole("button", { name: "Unmute", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("m");
    await expect(
      controls.getByRole("button", { name: "Mute", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("t");
    await expect(page.locator("#live-transcript")).toHaveCount(0);
    await page.keyboard.press("t");
    await expect(page.locator("#live-transcript")).toBeVisible();
    await focusStage(page);
    await page.keyboard.press("r");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { replayCalls: number }).replayCalls,
        ),
      )
      .toBe(1);
    expect((await detail()).startedAt).toBe(startedAt);
    await page.keyboard.press("Control+k");
    const search = page.getByRole("combobox", { name: "Search workspace" });
    await search.fill("mrt ");
    await page.keyboard.press("Space");
    await expect(search).toHaveValue("mrt  ");
    expect((await detail()).pausedAt).toBeNull();
    await page.keyboard.press("Escape");
    await controls
      .getByRole("button", { name: "Finish interview", exact: true })
      .click();
    await expect(
      page.getByRole("alertdialog", { name: "Finish interview?" }),
    ).toBeVisible();
    await page.keyboard.press("m");
    await page.keyboard.press("r");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { replayCalls: number }).replayCalls,
        ),
      )
      .toBe(1);
    await page.getByRole("button", { name: "Keep going", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await focusStage(page);
    await page.keyboard.press("Space");
    await expect
      .poll(async () => (await detail()).pausedAt ?? 0)
      .toBeGreaterThan(0);
    await expect(
      page.getByText("Interview paused", { exact: true }),
    ).toBeVisible();
    const frozenTimer = await page.getByRole("timer").textContent();
    const pausedAt = (await detail()).pausedAt;
    const frozenQuestion = await page
      .locator('[data-slot="live-caption"]')
      .textContent();
    await page.waitForTimeout(1600);
    expect(await page.getByRole("timer").textContent()).toBe(frozenTimer);
    expect(await page.locator('[data-slot="live-caption"]').textContent()).toBe(
      frozenQuestion,
    );
    expect(
      await page.evaluate(() => {
        const target = window as Window & {
          controlTracks: MediaStreamTrack[];
          controlContexts: AudioContext[];
        };
        return (
          target.controlContexts[0].state === "suspended" &&
          target.controlTracks.every((track) => !track.enabled)
        );
      }),
    ).toBe(true);
    await mkdir(".impeccable/review", { recursive: true });
    await page.screenshot({
      path: ".impeccable/review/paused-interview-desktop.png",
      animations: "disabled",
    });
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(controls).toBeInViewport();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight,
      ),
    ).toBe(true);
    await page.screenshot({
      path: ".impeccable/review/paused-interview-mobile.png",
      animations: "disabled",
    });
    await focusStage(page);
    await page.keyboard.press("m"); // Mute preference survives resume.
    const resumeRequestedAt = Date.now();
    await page.keyboard.press("Space");
    await expect.poll(async () => (await detail()).pausedAt).toBeNull();
    expect((await detail()).pausedMs).toBeGreaterThanOrEqual(
      resumeRequestedAt - pausedAt,
    );
    await expect(
      controls.getByRole("button", { name: "Unmute", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() =>
        (
          window as Window & { controlTracks: MediaStreamTrack[] }
        ).controlTracks.every((track) => !track.enabled),
      ),
    ).toBe(true);
    await page.keyboard.press("m");
    await expect
      .poll(() => page.getByRole("timer").textContent())
      .not.toBe(frozenTimer);
    await page.keyboard.press("Space");
    await expect
      .poll(async () => (await detail()).pausedAt ?? 0)
      .toBeGreaterThan(0);
    const persisted = (await detail()).pausedAt;
    await acceptDocumentExit(page, () => page.reload());
    await expect(
      page.getByRole("button", { name: "Resume interview", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(1000);
    expect((await detail()).pausedAt).toBe(persisted);
    await page
      .getByRole("button", { name: "Resume interview", exact: true })
      .click();
    await expect.poll(async () => (await detail()).pausedAt).toBeNull();
    expect((await detail()).startedAt).toBe(startedAt);
  } finally {
    await cleanup(page, id);
  }
});

test("Audio groups speed and working device controls while retaining pause and mute on microphone replacement", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    const target = window as Window & {
      deviceRequests: string[];
      sinkRequests: string[];
    };
    target.deviceRequests = [];
    target.sinkRequests = [];
    navigator.mediaDevices.enumerateDevices = async () =>
      [
        {
          kind: "audioinput",
          deviceId: "usb-mic",
          groupId: "mic",
          label: "USB microphone",
        },
        {
          kind: "audioinput",
          deviceId: "broken-mic",
          groupId: "mic",
          label: "Broken microphone",
        },
        {
          kind: "audiooutput",
          deviceId: "headphones",
          groupId: "out",
          label: "Headphones",
        },
      ] as MediaDeviceInfo[];
    const get = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (options) => {
      if (typeof options?.audio === "object") {
        const device = options.audio.deviceId as { exact?: string } | undefined;
        if (device?.exact) target.deviceRequests.push(device.exact);
        if (device?.exact === "broken-mic")
          throw new DOMException("Device removed", "NotFoundError");
        options = {
          ...options,
          audio: { ...options.audio, deviceId: undefined },
        };
      }
      return get(options);
    };
    Object.defineProperty(AudioContext.prototype, "setSinkId", {
      configurable: true,
      value: async (id: string) => {
        target.sinkRequests.push(id);
      },
    });
  });
  const { id, detail } = await start(page, context);
  try {
    await focusStage(page);
    await page.keyboard.press("Space");
    await expect
      .poll(async () => (await detail()).pausedAt ?? 0)
      .toBeGreaterThan(0);
    const audio = page.getByRole("button", {
      name: "Audio settings",
      exact: true,
    });
    await audio.click();
    await page
      .getByRole("menuitem", { name: /Interviewer playback speed/ })
      .click();
    await page
      .getByRole("menuitemradio", { name: "1.5×", exact: true })
      .click();
    await audio.click();
    await expect(
      page.getByRole("menuitem", {
        name: "Interviewer playback speed, 1.5×",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("menuitem", { name: "Microphone device", exact: true })
      .click();
    await page
      .getByRole("menuitemradio", { name: "USB microphone", exact: true })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "USB microphone", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      await page.evaluate(() => {
        const target = window as Window & {
          controlTracks: MediaStreamTrack[];
          deviceRequests: string[];
        };
        return (
          target.deviceRequests.includes("usb-mic") &&
          target.controlTracks[0].readyState === "ended" &&
          target.controlTracks.at(-1)?.readyState === "live" &&
          !target.controlTracks.at(-1)?.enabled
        );
      }),
    ).toBe(true);
    await page
      .getByRole("menuitemradio", { name: "Broken microphone", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "previous device is still selected",
    );
    await expect(
      page.getByRole("menuitemradio", { name: "USB microphone", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await closeAudio(page);
    await audio.click();
    await page
      .getByRole("menuitem", { name: "Speaker device", exact: true })
      .click();
    await page
      .getByRole("menuitemradio", { name: "Headphones", exact: true })
      .click();
    await expect(
      page.getByRole("menuitemradio", { name: "Headphones", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      await page.evaluate(
        () => (window as Window & { sinkRequests: string[] }).sinkRequests,
      ),
    ).toEqual(["headphones"]);
    await closeAudio(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await audio.click();
    await page
      .getByRole("menuitem", { name: "Microphone device", exact: true })
      .click();
    for (const menu of await page.getByRole("menu").all()) {
      const box = await menu.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }
    await page.screenshot({
      path: ".impeccable/review/interview-audio-mobile.png",
      animations: "disabled",
    });
    await closeAudio(page);
    await audio.click();
    await page.getByRole("menuitem", { name: /^Resume interview/ }).click();
    await expect.poll(async () => (await detail()).pausedAt).toBeNull();
    expect(
      await page.evaluate(
        () =>
          (
            window as Window & { controlTracks: MediaStreamTrack[] }
          ).controlTracks.at(-1)?.enabled,
      ),
    ).toBe(true);
  } finally {
    await cleanup(page, id);
  }
});
