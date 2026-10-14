import { expect, test, type Page } from "@playwright/test";
async function capture(
  page: Page,
  options: { path: string; fullPage: boolean },
) {
  const reveal = page.locator(".content > div").first();
  if (await reveal.count()) await expect(reveal).toHaveCSS("opacity", "1");
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
test("complete practice journey, recovery, history, and mobile layout", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["microphone"]);
  await trackSpeakerPlayback(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Find your voice/ }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/landing.png",
      fullPage: true,
    });
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Alex");
  await page.getByLabel("Email address").fill(`alex-${Date.now()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("practice-password-123");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByText("Your first conversation is waiting"),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "What’s your next challenge?" }),
  ).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, { path: "docs/screenshots/setup.png", fullPage: true });
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  await expect(page.getByLabel("Typed answers", { exact: true })).toHaveCount(
    0,
  );
  // A denied microphone must leave the session in preflight without a text fallback.
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
  await expect(page.locator(".error[role=alert]")).toContainText(
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
  await expect(page.locator(".error[role=alert]")).toContainText(
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
  await expect(page.locator(".error[role=alert]")).toHaveCount(0);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/interview.png",
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await page.getByRole("button", { name: "Finish & reflect" }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(
    page.getByRole("heading", { name: /Here’s where you stand/ }),
  ).toBeVisible();
  await expect(page.getByText("7.8", { exact: true })).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/feedback.png",
      fullPage: true,
    });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Transcript", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(
    /forma-interview.*\.txt/,
  );
  await page.reload();
  await expect(page.getByText("7.8", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(
    page.getByText("Frontend interview", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Every conversation, kept." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_SCREENSHOTS)
    await capture(page, {
      path: "docs/screenshots/history-mobile.png",
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
  await expect(
    page.getByText("Your first conversation is waiting"),
  ).toBeVisible();
  // Drafts can be removed directly from history without starting an interview.
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Prepare my interview" }).click();
  await expect(page).toHaveURL(/\/interviews\/[a-f0-9-]+$/);
  await page.getByRole("link", { name: "History", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await expect(
    page.getByText("Your first conversation is waiting"),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page
    .getByRole("link", { name: "New interview", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Prepare my interview" }).click();
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
  await page.getByRole("button", { name: "Finish & reflect" }).click();
  await expect(page).toHaveURL(/\/feedback$/);
  await expect(
    page.getByRole("heading", { name: /Here’s where you stand/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
