import { expect, test, type Page } from "@playwright/test";
async function capture(
  page: Page,
  options: { path: string; fullPage: boolean },
) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ ...options, animations: "disabled" });
}
async function trackSpeakerPlayback(page: Page) {
  await page.addInitScript(() => {
    const target = window as Window & { formaPcmStarts: number };
    target.formaPcmStarts = 0;
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const source = create.call(this);
      const start = source.start.bind(source);
      source.start = (...args: Parameters<AudioBufferSourceNode["start"]>) => {
        target.formaPcmStarts++;
        start(...args);
      };
      return source;
    };
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
  await expect(page.getByLabel("Typed answers", { exact: true })).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/preflight.png",
      fullPage: true,
    });
  await page
    .getByLabel("Download my microphone recording when I finish")
    .check();
  // A denied microphone leaves the draft unstarted and offers retry or typed answers.
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
  await expect(
    page.getByText(/You mentioned testing behavior/).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => playbackCount(page)).toBeGreaterThan(0);
  const firstPlayback = await playbackCount(page);
  await page
    .getByRole("button", { name: "Hear question", exact: true })
    .click();
  await expect.poll(() => playbackCount(page)).toBeGreaterThan(firstPlayback);
  await expect(
    page.getByText("Listening to you", { exact: true }),
  ).toBeVisible();
  // The controlled provider fails once; the UI must preserve the conversation.
  await page.request.post("http://localhost:8791/turn", {
    data: {
      transcript: "I would test a failed request and show a retry control.",
    },
  });
  await expect(page.locator("[data-slot=alert][role=alert]")).toContainText(
    "could not respond",
  );
  await page.request.post("http://localhost:8791/turn", {
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
  await page.getByRole("button", { name: "Type instead", exact: true }).click();
  await expect(page.getByLabel("Your interview answer")).toBeVisible();
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
  await page.getByRole("link", { name: "History", exact: true }).click();
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
  await page.getByRole("link", { name: "History", exact: true }).click();
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
  await expect(
    page.getByText("I test the component behavior and loading states.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(() => playbackCount(page)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unmute", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Unmute", exact: true }).click();
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

test("typed fallback, saved drafts, shortcuts, reconnect, feedback retry and keyboard access", async ({
  page,
}) => {
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({ json: { llm: true, voice: false, google: false } }),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const target = window as Window & {
      interviewSocket?: WebSocket;
      micRequests: number;
    };
    target.micRequests = 0;
    const native = window.WebSocket;
    window.WebSocket = class extends native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        if (String(url).includes("/interviews/")) target.interviewSocket = this;
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      target.micRequests++;
      throw new DOMException("Microphone denied", "NotAllowedError");
    };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/auth/sign-in");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Typed Candidate");
  await page
    .getByLabel("Email address")
    .fill(`typed-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("typed-password-123");
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
  await page.getByRole("radio", { name: "Senior", exact: true }).check();
  await expect(
    page.getByRole("radio", { name: "Senior", exact: true }),
  ).toBeChecked();
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
  await expect(
    page.getByRole("radio", { name: "10 minutes", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continue to setup check" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  const interviewUrl = page.url();
  await expect(
    page.getByText("Voice is unavailable. Choose typed answers to continue."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start interview", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(page.locator("[data-slot=alert][role=alert]")).toContainText(
    "choose typed answers",
  );
  await page.getByRole("radio", { name: "Typed answers", exact: true }).check();
  await page
    .getByRole("button", { name: "Start interview", exact: true })
    .click();
  const answer = page.getByRole("textbox", {
    name: "Your interview answer",
    exact: true,
  });
  const send = page.getByRole("button", { name: "Send answer", exact: true });
  await expect(send).toBeDisabled();
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { micRequests: number }).micRequests,
    ),
  ).toBe(1);
  const draft =
    "I would start with request validation and error handling. ".repeat(12);
  await answer.fill(draft);
  await page.reload();
  await page.getByRole("radio", { name: "Typed answers", exact: true }).check();
  await page
    .getByRole("button", { name: "Resume interview", exact: true })
    .click();
  await expect(answer).toHaveValue(draft);
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage blocked", "SecurityError");
    };
  });
  await answer.fill(draft + "My updated draft.");
  await page.evaluate(() =>
    (window as Window & { interviewSocket: WebSocket }).interviewSocket.close(),
  );
  await expect(
    page.getByRole("button", { name: "Resume interview", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Reconnect/ }).click();
  await page.getByRole("radio", { name: "Typed answers", exact: true }).check();
  await page
    .getByRole("button", { name: "Resume interview", exact: true })
    .click();
  await expect(answer).toHaveValue(draft + "My updated draft.");
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  await send.click();
  await expect(answer).toHaveValue("");
  await expect(page.getByRole("log")).toContainText(draft.trim());
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  const second =
    "I would mock a rejected request, assert its error state, and test feedback-retry.";
  await answer.fill(second);
  await send.click();
  await expect(answer).toHaveValue("");
  await expect(page.getByText("Your turn", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { micRequests: number }).micRequests,
    ),
  ).toBe(0);
  // Inspect both desktop baselines and effective 200% zoom reflow while active.
  for (const width of [1280, 1440, 640]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Finish interview", exact: true }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/interview-typed-1440.png",
      fullPage: true,
    });
  const colors = await page.evaluate(() => ({
    scheme: getComputedStyle(document.documentElement).colorScheme,
    family: getComputedStyle(document.body).fontFamily,
  }));
  expect(colors.scheme).toBe("light");
  expect(colors.family).not.toBe("Arial, sans-serif");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (face) => face.status === "loaded" && face.weight === "100 900",
      ),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "Feedback", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Unsent text will not be included",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
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
  await page
    .getByRole("link", { name: "History", exact: true })
    .first()
    .click();
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
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/history");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  expect(errors).toEqual([]);
});
