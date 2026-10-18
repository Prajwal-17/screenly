import { expect, test, type Page } from "@playwright/test";
import { webURL, backendURL, voiceURL } from "./environment";
import { contrast } from "./contrast";
async function capture(
  page: Page,
  options: { path: string; fullPage: boolean },
) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ ...options, animations: "disabled" });
}
async function openTranscript(page: Page) {
  await page.getByRole("button", { name: /^Transcript/ }).click();
  await expect(
    page.getByRole("region", { name: "Conversation", exact: true }),
  ).toBeVisible();
}
async function closeTranscript(page: Page) {
  await page
    .getByRole("button", { name: "Close transcript", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Conversation", exact: true }),
  ).toHaveCount(0);
}
async function navigateHistory(page: Page) {
  if (
    !(await page
      .getByRole("link", { name: "History", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page.getByRole("link", { name: "History", exact: true }).click();
}
async function trackSpeakerPlayback(page: Page) {
  await page.addInitScript(() => {
    const target = window as Window & {
      formaPcmStarts: number;
      formaPcmEnergy: number;
    };
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/"))
          (
            window as Window & { formaInterviewSocket?: WebSocket }
          ).formaInterviewSocket = this;
      }
    };
    target.formaPcmStarts = 0;
    target.formaPcmEnergy = 0;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this);
      const start = source.start.bind(source);
      source.start = (...args: Parameters<AudioBufferSourceNode["start"]>) => {
        target.formaPcmStarts++;
        for (const sample of source.buffer?.getChannelData(0) ?? [])
          target.formaPcmEnergy += sample * sample;
        start(...args);
      };
      return source;
    };
  });
}
// Replay remains a protocol recovery path; it is no longer a visible UI action.
async function replayQuestion(page: Page) {
  await page.evaluate(() => {
    const target = window as Window & {
      formaInterviewSocket?: WebSocket;
      captionSocket?: WebSocket;
    };
    (target.formaInterviewSocket ?? target.captionSocket)!.send(
      JSON.stringify({ type: "speak" }),
    );
  });
}
async function playbackCount(page: Page) {
  return page.evaluate(
    () => (window as Window & { formaPcmStarts: number }).formaPcmStarts,
  );
}
test("complete practice journey, recovery, history, and desktop reflow", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await trackSpeakerPlayback(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Good answers/ }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/landing.png",
      fullPage: true,
    });
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, { path: "docs/screenshots/auth.png", fullPage: true });
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByLabel("Email address").fill(`alex-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("practice-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("No interviews yet")).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/dashboard.png",
      fullPage: true,
    });
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "New interview" }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, { path: "docs/screenshots/setup.png", fullPage: true });
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  await expect(
    page.getByRole("button", { name: "Check microphone", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/preflight.png",
      fullPage: true,
    });
  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.setViewportSize({ width: 360, height: 800 });
    await capture(page, {
      path: "docs/screenshots/preflight-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  await page
    .getByLabel("Download my microphone recording when I finish")
    .check();
  // A denied microphone leaves the draft unstarted and offers microphone retry.
  await page.evaluate(() => {
    const media = navigator.mediaDevices;
    const original = media.getUserMedia.bind(media);
    media.getUserMedia = async () => {
      media.getUserMedia = original;
      throw new DOMException("Microphone denied", "NotAllowedError");
    };
  });
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(page.locator("[data-slot=alert][role=alert]")).toContainText(
    "Microphone access is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Start interview", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("00:00 / 20:00", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Retry microphone", exact: true })
    .click();
  await expect(page.getByLabel("Your interview answer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send answer" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("log")).toHaveCount(0);
  await openTranscript(page);
  await expect(page.getByRole("log")).toContainText(
    "You mentioned testing behavior",
  );
  await closeTranscript(page);
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => playbackCount(page)).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { formaPcmEnergy: number }).formaPcmEnergy,
      ),
    )
    .toBeGreaterThan(0);
  await expect(
    page.locator('[data-slot="live-caption"] [data-slot="streaming-text"]'),
  ).toContainText("You mentioned testing behavior");
  const firstPlayback = await playbackCount(page);
  await replayQuestion(page);
  await expect.poll(() => playbackCount(page)).toBeGreaterThan(firstPlayback);
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await page.request.post(`${voiceURL}/partial`, {
    data: { transcript: "I am thinking through the failure cases." },
  });
  await expect(page.locator('[data-slot="live-caption"]')).toContainText("You");
  await expect(page.locator('[data-slot="streaming-text"]')).toContainText(
    "I am thinking through the failure cases.",
  );
  // The controlled provider fails once; the UI must preserve the conversation.
  await page.request.post(`${voiceURL}/turn`, {
    data: {
      transcript: "I would test a failed request and show a retry control.",
    },
  });
  await expect(page.locator("[data-slot=alert][role=alert]")).toContainText(
    "could not respond",
  );
  await page.request.post(`${voiceURL}/turn`, {
    data: {
      transcript:
        "I would mock a rejected request and assert that the retry control appears.",
    },
  });
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-slot=alert][role=alert]")).toHaveCount(0);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/interview.png",
      fullPage: true,
    });
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Type instead", exact: true }),
  ).toHaveCount(0);
  const recording = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish and view feedback" }).click();
  expect((await recording).suggestedFilename()).toMatch(
    /screenly-recording.*\.(webm|m4a)$/,
  );
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(page.getByText("7.8", { exact: true })).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/feedback.png",
      fullPage: true,
    });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Transcript", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(
    /screenly-interview.*\.txt/,
  );
  await page.reload();
  await expect(page.getByText("7.8", { exact: true })).toBeVisible();
  await navigateHistory(page);
  await expect(
    page.getByRole("link", { name: /^Frontend interview/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 640, height: 720 });
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/history-narrow.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 1440, height: 900 });
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/history.png",
      fullPage: true,
    });
  await page
    .getByRole("link")
    .filter({ hasText: "Frontend interview" })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText("No interviews yet")).toBeVisible();
  // Drafts can be removed directly from history without starting an interview.
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  await navigateHistory(page);
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await expect(page.getByText("No interviews yet")).toBeVisible();
  expect(errors).toEqual([]);
});
test("protected workspace redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test("full question stays readable while speaking highlights follow playback state", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const target = window as Window & {
      captionAudioContexts: AudioContext[];
      captionSocket?: WebSocket;
      captionAudioEnds: number;
    };
    target.captionAudioContexts = [];
    target.captionAudioEnds = 0;
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/")) {
          target.captionSocket = this;
          this.addEventListener("message", (event) => {
            if (
              typeof event.data === "string" &&
              JSON.parse(event.data).type === "audio-end"
            )
              target.captionAudioEnds++;
          });
        }
      }
    };
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        target.captionAudioContexts.push(this);
      }
    };
  });
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 180, automaticAnswer: false },
  });
  try {
    await page.goto("/auth/sign-in");
    await page.getByRole("button", { name: "Create an account" }).click();
    await page.getByLabel("Your name").fill("Caption Candidate");
    await page
      .getByLabel("Email address")
      .fill(`captions-${Date.now()}@example.com`);
    await page
      .getByLabel("Password", { exact: true })
      .fill("caption-password-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page
      .getByRole("link", { name: "New interview", exact: true })
      .last()
      .click();
    await page.getByRole("button", { name: "Continue to setup check" }).click();
    const id = page.url().split("/").at(-1)!;
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    const caption = page.locator(
      '[data-slot="live-caption"] [data-slot="streaming-text"]',
    );
    const fullQuestion =
      "Welcome. Let’s begin with React. How would you test a component that fetches data?";
    await expect(caption).toHaveText(fullQuestion);
    await expect(caption).toHaveAttribute("data-speaking", "true");
    const paused = await page.evaluate(async () => {
      const contexts = (
        window as Window & { captionAudioContexts: AudioContext[] }
      ).captionAudioContexts;
      await contexts[0]!.suspend();
      return document.querySelector('[data-slot="streaming-text"]')
        ?.textContent;
    });
    await page.waitForTimeout(600); // Pausing audio must not hide or truncate the question.
    expect(await caption.textContent()).toBe(paused);
    if (process.env.CAPTURE_SCREENSHOTS) {
      await capture(page, {
        path: "docs/screenshots/caption-highlight-desktop.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 360, height: 800 });
      await capture(page, {
        path: "docs/screenshots/caption-highlight-mobile.png",
        fullPage: true,
      });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    await page.evaluate(() =>
      (
        window as Window & { captionAudioContexts: AudioContext[] }
      ).captionAudioContexts[0]!.resume(),
    );
    await expect(caption).toHaveText(fullQuestion);
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible();
    await replayQuestion(page);
    await expect(caption).toHaveText(fullQuestion);
    await expect(caption).toHaveAttribute("data-speaking", "true");
    await page.getByRole("button", { name: "Interrupt", exact: true }).click();
    await expect(caption).toHaveText(fullQuestion);
    await expect(caption).toHaveAttribute("data-speaking", "false");
    const ended = await page.evaluate(
      () => (window as Window & { captionAudioEnds: number }).captionAudioEnds,
    );
    await replayQuestion(page);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { captionAudioEnds: number }).captionAudioEnds,
        ),
      )
      .toBeGreaterThan(ended);
    await expect(caption).toHaveText(fullQuestion);
    // Synthesis is complete, but its drain promise is still waiting for playback.
    // Closing the socket must retain recovery instead of being overwritten by it.
    await page.evaluate(() =>
      (window as Window & { captionSocket: WebSocket }).captionSocket.close(),
    );
    await expect(
      page.getByRole("button", { name: "Resume interview", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Reconnect/ })).toBeVisible();
    await navigateHistory(page);
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
  } finally {
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true },
    });
  }
});

test("voice capture, transcription, playback, mute, and cleanup", async ({
  page,
  context,
}) => {
  await trackSpeakerPlayback(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["microphone"]);
  await page.goto("/auth/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Voice Candidate");
  await page
    .getByLabel("Email address")
    .fill(`voice-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("voice-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Microphone checked", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  // Checking again, starting, and unmounting must not close a closed context.
  await page
    .getByRole("button", { name: "Microphone checked", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Microphone checked", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("log")).toHaveCount(0);
  await openTranscript(page);
  await expect(page.getByRole("log")).toContainText(
    "I test the component behavior and loading states.",
  );
  await closeTranscript(page);
  await expect.poll(() => playbackCount(page)).toBeGreaterThan(0);
  const visual = page.locator("[data-slot=voice-visual]");
  await expect(visual).toHaveAttribute("data-state", "listening");
  expect(
    await visual.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    ),
  ).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      visual.evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unmute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(visual).toHaveAttribute("data-state", "muted");
  expect(
    await visual.evaluate(
      (node) => node.getAnimations({ subtree: true }).length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect(visual).toHaveAttribute("data-state", "listening");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume interview", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mute", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Finish saved interview" }).click();
  await page.getByRole("button", { name: "Finish and view feedback" }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("voice-only setup, reconnect, feedback retry and keyboard access", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const target = window as Window & {
      interviewSocket?: WebSocket;
      replayCount: number;
    };
    target.replayCount = 0;
    const native = window.WebSocket;
    window.WebSocket = class extends native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/")) {
          target.interviewSocket = this;
          this.addEventListener("message", (event) => {
            if (
              typeof event.data === "string" &&
              JSON.parse(event.data).type === "audio-start"
            )
              target.replayCount++;
          });
        }
      }
    };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/auth/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Voice Candidate");
  await page
    .getByLabel("Email address")
    .fill(`voice-recovery-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("voice-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name: /Backend APIs/ }).click();
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "APIs", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Databases", exact: true }),
  ).toBeChecked();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("radio", { name: "Senior", exact: true }).check();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/setup-mobile.png",
      fullPage: true,
    });
  // Selected labels must remain readable across real control interaction states.
  const selectedChoices = [
    page.getByRole("radio", { name: "Senior", exact: true }),
    page.getByRole("checkbox", { name: "APIs", exact: true }),
    page.getByRole("radio", { name: "20 minutes", exact: true }),
  ];
  for (const choice of selectedChoices) {
    const selectedContrast = () =>
      choice
        .evaluate((node) => {
          const style = getComputedStyle(node.closest("label") ?? node);
          return { foreground: style.color, background: style.backgroundColor };
        })
        .then((colors) => contrast(colors.foreground, colors.background));
    expect(await selectedContrast()).toBeGreaterThanOrEqual(4.5);
    await choice.hover();
    await expect.poll(selectedContrast).toBeGreaterThanOrEqual(4.5);
    await page.mouse.down();
    try {
      await expect.poll(selectedContrast).toBeGreaterThanOrEqual(4.5);
    } finally {
      await page.mouse.up();
    }
  }
  const navigationTrigger = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await navigationTrigger.click();
  await expect(
    page.getByRole("dialog", { name: "Navigation", exact: true }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/navigation-mobile.png",
      fullPage: false,
    });
  await page.keyboard.press("Escape");
  await expect(navigationTrigger).toBeFocused();
  await page.getByRole("checkbox", { name: "APIs", exact: true }).uncheck();
  await page
    .getByRole("checkbox", { name: "Databases", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await expect(page.locator("[data-slot=field-error]")).toContainText(
    "Choose at least one topic",
  );
  await page.getByRole("checkbox", { name: "APIs", exact: true }).check();
  await page.getByRole("checkbox", { name: "Databases", exact: true }).check();
  await page.getByRole("radio", { name: "10 minutes", exact: true }).click();
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  const interviewUrl = page.url();
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({ json: { llm: true, voice: false, google: false } }),
  );
  await page.reload();
  await expect(
    page.getByText("Voice interviews are unavailable. Try again later."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start interview", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.unroute("**/api/capabilities");
  await page.reload();
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await openTranscript(page);
  await expect(page.getByRole("log")).toContainText(
    "I test the component behavior and loading states.",
  );
  await closeTranscript(page);
  await page.evaluate(() =>
    (window as Window & { interviewSocket: WebSocket }).interviewSocket.close(),
  );
  await expect(
    page.getByRole("button", { name: "Resume interview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Reconnect/ }).click();
  await page
    .getByRole("button", { name: "Resume interview", exact: true })
    .click();
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  // Old text commands cannot enter the transcript. Replay marks their processing boundary.
  const before = await page.request.get(
    interviewUrl.replace(webURL, `${backendURL}/api`),
  );
  const saved = await before.json();
  const replayCount = await page.evaluate(
    () => (window as Window & { replayCount: number }).replayCount,
  );
  await page.evaluate(() => {
    const socket = (window as Window & { interviewSocket: WebSocket })
      .interviewSocket;
    socket.send(JSON.stringify({ type: "start", typed: true }));
    socket.send(
      JSON.stringify({
        type: "answer",
        id: crypto.randomUUID(),
        text: "This text must never be saved.",
      }),
    );
    socket.send(JSON.stringify({ type: "speak" }));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { replayCount: number }).replayCount,
      ),
    )
    .toBeGreaterThan(replayCount);
  await openTranscript(page);
  await expect(page.getByRole("log")).not.toContainText(
    "This text must never be saved.",
  );
  const after = await page.request.get(
    interviewUrl.replace(webURL, `${backendURL}/api`),
  );
  expect((await after.json()).startedAt).toBe(saved.startedAt);
  const second =
    "I would mock a rejected request, assert its error state, and test feedback-retry.";
  await page.request.post(`${voiceURL}/turn`, {
    data: { transcript: second },
  });
  await expect(page.getByRole("log")).toContainText(second);
  await closeTranscript(page);
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  for (const width of [1280, 1440, 1536, 640, 360]) {
    await page.setViewportSize({ width, height: width === 1536 ? 960 : 900 });
    await openTranscript(page);
    await expect
      .poll(() =>
        page
          .getByRole("log")
          .evaluate(
            (node) => node.scrollHeight - node.scrollTop - node.clientHeight,
          ),
      )
      .toBeLessThan(64);
    if (process.env.CAPTURE_SCREENSHOTS && (width === 1440 || width === 360))
      await capture(page, {
        path: `docs/screenshots/interview-transcript-${width}.png`,
        fullPage: true,
      });
    await closeTranscript(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Finish interview", exact: true }),
    ).toBeVisible();
    if (process.env.CAPTURE_SCREENSHOTS && width === 1536)
      await capture(page, {
        path: "docs/screenshots/interview-voice-1536.png",
        fullPage: true,
      });
    if (process.env.CAPTURE_SCREENSHOTS && width === 360)
      await capture(page, {
        path: "docs/screenshots/interview-voice-mobile.png",
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/interview-voice-1440.png",
      fullPage: true,
    });
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).colorScheme,
    ),
  ).toBe("light");
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (face) => face.status === "loaded" && face.weight === "100 900",
      ),
    ),
  ).toBe(true);
  await openTranscript(page);
  const log = page.getByRole("log");
  const longAnswer =
    "I would measure latency and error rates, then verify the observed behavior. ".repeat(
      20,
    );
  await page.request.post(`${voiceURL}/turn`, {
    data: { transcript: longAnswer },
  });
  await expect(log).toContainText(longAnswer.trim());
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await log.evaluate((node) => {
    node.scrollTop = 0;
  });
  await expect(
    page.getByRole("button", { name: "Jump to latest", exact: true }),
  ).toBeVisible();
  await page.request.post(`${voiceURL}/turn`, {
    data: { transcript: "I would investigate the slowest request first." },
  });
  await expect(log).toContainText(
    "I would investigate the slowest request first.",
  );
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  expect(await log.evaluate((node) => node.scrollTop)).toBe(0);
  await page
    .getByRole("button", { name: "Jump to latest", exact: true })
    .click();
  expect(
    await log.evaluate(
      (node) => node.scrollHeight - node.scrollTop - node.clientHeight,
    ),
  ).toBeLessThan(64);
  await closeTranscript(page);
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Wait for your last answer",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish and view feedback", exact: true })
    .click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(
    page.getByRole("heading", { name: "Feedback could not be generated" }),
  ).toBeVisible();
  await page.getByText("Full conversation", { exact: false }).click();
  await expect(page.getByText(second, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Retry feedback", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Summary", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /^Full conversation/ }).click();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/feedback-mobile.png",
      fullPage: true,
    });
  const review = page.getByRole("button", { name: "Answer 1", exact: true });
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Answer 1", exact: true })
      .locator("blockquote"),
  ).toBeVisible();
  await page.goto(interviewUrl);
  await expect(page).toHaveURL(/\/feedback$/);
  await navigateHistory(page);
  await page
    .getByRole("textbox", { name: "Search interviews" })
    .fill("unmatched");
  await expect(
    page.getByRole("heading", { name: "No interviews match" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search interviews" })
    .fill("Backend");
  await expect(
    page.getByRole("link", { name: /^Backend interview/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (
    !(await page
      .getByRole("button", { name: "Sign out", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/history");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  expect(errors).toEqual([]);
});
