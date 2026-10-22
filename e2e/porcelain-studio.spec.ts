import { acceptDocumentExit } from "./navigation";
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { signInForTest } from "./session-fixture";
import { backendURL, voiceURL } from "./environment";

test("Porcelain studio preserves voice playback, audio controls, transcript, and responsive layout", async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const target = window as Window & {
      studioContexts: AudioContext[];
      studioTracks: MediaStreamTrack[];
    };
    target.studioContexts = [];
    target.studioTracks = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        target.studioContexts.push(this);
      }
    };
    const capture = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await capture(constraints);
      target.studioTracks.push(...stream.getTracks());
      return stream;
    };
  });
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 180, automaticAnswer: false },
  });
  await signInForTest(context);
  const created = await page.request.post(`${backendURL}/api/interviews`, {
    data: {
      role: "Frontend",
      level: "Senior",
      topics: ["React", "System design"],
      duration: 20,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/interviews/${id}`);
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    const question = page.locator('[data-slot="live-caption"]');
    const visual = page.locator('[data-slot="voice-visual"]');
    await expect(
      page.getByText("Interviewer speaking", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("log")).toBeVisible();
    await expect(question).toContainText("How would you test a component");
    await page
      .getByRole("button", { name: "Audio settings", exact: true })
      .click();
    // The modal menu hides its background from the accessibility tree.
    const speed = page.locator('[data-control="audio"]');
    await expect(speed).toHaveAttribute("aria-expanded", "true");
    await expect
      .poll(() =>
        speed
          .locator("svg")
          .last()
          .evaluate((node) => getComputedStyle(node).transform),
      )
      .not.toBe("none");
    await page
      .getByRole("menuitem", {
        name: "Interviewer playback speed, 1×",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitemradio", { name: "1.25×", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Audio settings",
        exact: true,
      }),
    ).toBeVisible();
    const controls = page.getByRole("group", { name: "Interview controls" });
    await expect(controls.getByRole("button")).toHaveCount(4);
    await expect(
      page.getByRole("button", {
        name: /Pause audio|Resume audio|Interrupt/,
      }),
    ).toHaveCount(0);
    const mute = controls.getByRole("button", { name: "Mute", exact: true });
    const dockBefore = await controls.boundingBox();
    await mute.hover();
    await expect(
      page.getByRole("tooltip", { name: /^Mute microphone/ }),
    ).toBeVisible();
    await page.mouse.down();
    await expect
      .poll(() => mute.evaluate((node) => getComputedStyle(node).transform))
      .not.toBe("none");
    await page.mouse.up();
    await expect(
      controls.getByRole("button", { name: "Unmute", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    // Muting capture must not suspend the interviewer or the session clock.
    expect(
      await page.evaluate(
        () =>
          (window as Window & { studioContexts: AudioContext[] })
            .studioContexts[0]?.state,
      ),
    ).toBe("running");
    expect(
      await page.evaluate(() =>
        (
          window as Window & { studioTracks: MediaStreamTrack[] }
        ).studioTracks.every((track) => !track.enabled),
      ),
    ).toBe(true);
    const mutedTimer = await page.getByRole("timer").textContent();
    await expect
      .poll(() => page.getByRole("timer").textContent())
      .not.toBe(mutedTimer);
    await expect(question).toContainText("How would you test a component");
    expect(await controls.boundingBox()).toEqual(dockBefore);
    await controls.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible();
    const originalQuestion = await question.textContent();
    await page.request.post(`${voiceURL}/partial`, {
      data: { transcript: "I would start with the behavior a person expects." },
    });
    await expect(page.locator('[data-slot="candidate-caption"]')).toContainText(
      "I would start",
    );
    await expect(question).toHaveText(originalQuestion!);
    await page.request.post(`${voiceURL}/turn`, {
      data: {
        transcript:
          "I would start with the behavior a person expects, then cover loading and empty results.",
      },
    });
    await expect(page.getByRole("log")).toContainText("I would start");
    const chat = page.getByRole("region", {
      name: "Conversation",
      exact: true,
    });
    await expect(
      chat.getByRole("article", { name: "Your message", exact: true }),
    ).toBeVisible();
    await expect(
      chat.getByText(
        /^(Interviewer|You|Question|Answer|Current question|Transcribing|Responding)$/,
      ),
    ).toHaveCount(0);
    await expect(chat.locator("time")).toHaveCount(0);
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(visual).toHaveAttribute("data-state", "muted");
    await expect(visual.locator("[data-renderer]")).toHaveAttribute(
      "data-moving",
      "false",
    );
    await expect
      .poll(() =>
        visual
          .locator("[data-renderer]")
          .evaluate((node) => node.style.getPropertyValue("--orb-energy")),
      )
      .toBe("0");
    await expect(
      page.getByRole("button", { name: "Unmute", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(visual.locator("[data-renderer]")).toHaveAttribute(
      "data-moving",
      "true",
    );
    await page
      .getByRole("button", { name: "Close transcript", exact: true })
      .click();
    const transcriptToggle = page
      .getByRole("main")
      .getByRole("button", { name: /^Transcript/ });
    await expect(transcriptToggle).toBeFocused();
    await expect(question).toBeVisible();
    await transcriptToggle.click();
    await expect(
      page.getByRole("region", { name: "Conversation", exact: true }),
    ).toBeVisible();
    await mkdir(".impeccable/review", { recursive: true });
    for (const [width, height, name] of [
      [1440, 900, "desktop"],
      [1280, 800, "desktop-1280"],
      [1728, 1000, "user-1728"],
      [390, 844, "mobile"],
      [360, 800, "mobile-360"],
      [640, 900, "tablet-640"],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const stage = await page
        .getByRole("region", { name: "Current conversation" })
        .boundingBox();
      const transcript = await page.locator("#live-transcript").boundingBox();
      if (width >= 1024)
        expect(transcript!.x).toBeGreaterThanOrEqual(stage!.x + stage!.width);
      else
        expect(transcript!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height);
      for (const button of await page
        .getByRole("group", { name: "Interview controls" })
        .getByRole("button")
        .all()) {
        const box = await button.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      if (process.env.CAPTURE_STUDIO)
        await page.screenshot({
          path: `.impeccable/review/${name}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(visual.locator("[data-renderer]")).toHaveAttribute(
      "data-moving",
      "false",
    );
    const reducedSpeed = controls.getByRole("button", {
      name: "Audio settings",
      exact: true,
    });
    await reducedSpeed.click();
    expect(
      await speed
        .locator("svg")
        .last()
        .evaluate((node) => getComputedStyle(node).transform),
    ).toBe("none");
    await page.keyboard.press("Escape");
    await expect
      .poll(() =>
        visual
          .locator("[data-renderer]")
          .evaluate((node) => node.style.getPropertyValue("--orb-energy")),
      )
      .toBe("0");
    const reducedMute = controls.getByRole("button", {
      name: "Mute",
      exact: true,
    });
    await reducedMute.hover();
    await page.mouse.down();
    expect(
      await reducedMute.evaluate((node) => getComputedStyle(node).transform),
    ).toBe("none");
    await page.mouse.up();
    await expect(
      controls.getByRole("button", { name: "Unmute", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await controls.getByRole("button", { name: "Unmute", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await visual
      .locator("canvas")
      .evaluate((canvas) =>
        (canvas as HTMLCanvasElement)
          .getContext("webgl")
          ?.getExtension("WEBGL_lose_context")
          ?.loseContext(),
      );
    await expect(visual.locator("[data-renderer]")).toHaveAttribute(
      "data-renderer",
      "fallback",
    );
    if (process.env.CAPTURE_STUDIO)
      await page.screenshot({
        path: ".impeccable/review/fallback.png",
        fullPage: true,
        animations: "disabled",
      });
    await expect(
      page.getByRole("button", { name: "Finish interview", exact: true }),
    ).toBeEnabled();
    const finish = controls.getByRole("button", {
      name: "Finish interview",
      exact: true,
    });
    await finish.focus();
    await expect(
      page.getByRole("tooltip", { name: "Finish interview", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("alertdialog", { name: "Finish interview?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep going", exact: true }).click();
    await expect(finish).toBeFocused();
    expect(errors).toEqual([]);
  } finally {
    await acceptDocumentExit(page, () => page.goto("/history"));
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true },
    });
  }
});
