import { test, expect, now } from "./fixtures";

test("opening, thinking, speaking, and replay retain timing and saved context", async ({
  page,
  api,
}) => {
  api.interviews[1]!.phase = "opening";
  api.interviews[1]!.startedAt = null;
  await page.goto("/interviews/active");
  const conversation = page.getByRole("region", {
    name: "Current conversation",
    exact: true,
  });
  await expect(conversation).toBeVisible();
  api.send({ type: "status", status: "thinking" });
  await expect(conversation.getByRole("status")).toHaveText(
    "Interviewer is thinking",
  );
  api.send({ type: "status", status: "speaking" });
  await expect(conversation.getByRole("status")).toHaveText(
    "Introducing your interview",
  );
  await expect(page.getByRole("timer")).toContainText("00:00");
  await page
    .getByRole("button", { name: "Replay question", exact: true })
    .click();
  await expect
    .poll(() => api.clients.some((event) => event.type === "speak"))
    .toBe(true);
  await expect(page.locator('[data-slot="live-caption"]')).toContainText(
    "How would you identify unnecessary re-renders",
  );
});

test("WebGL fallback retains the stage and controls", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof getContext>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto("/interviews/active");
  await expect(page.locator('[data-renderer="fallback"]')).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="live-caption"]')).toContainText(
    "How would you identify unnecessary re-renders",
  );
});

test("live transcript and captions update while the question stays readable", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  const question = page.locator('[data-slot="live-caption"]');
  await expect(question).toContainText(
    "How would you identify unnecessary re-renders",
  );
  api.send({ type: "partial", text: "I would measure before optimizing." });
  await expect(page.locator('[data-slot="candidate-caption"]')).toHaveText(
    "I would measure before optimizing.",
  );
  await expect(question).toContainText(
    "How would you identify unnecessary re-renders",
  );
  api.send({
    type: "message",
    message: {
      id: "answer-2",
      role: "user",
      content: "I would measure before optimizing.",
      status: "complete",
      createdAt: now,
    },
  });
  api.send({ type: "partial", text: "" });
  const transcript = page.locator("#live-transcript");
  await expect(
    transcript.getByText("I would measure before optimizing.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="candidate-caption"]')).toHaveAttribute(
    "aria-live",
    "off",
  );
  await page.getByRole("button", { name: /^Transcript/ }).click();
  await expect(transcript).toHaveCount(0);
  await page.keyboard.press("t");
  await expect(transcript).toBeVisible();
});

test("audio pause acknowledgement and playback speed menu retain focus and state", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  const audio = page.getByRole("button", {
    name: "Audio settings",
    exact: true,
  });
  await audio.click();
  await page.getByRole("menuitem", { name: /Pause interview/ }).click();
  await expect(
    page.getByRole("button", { name: /^Resume interview/ }),
  ).toBeVisible();
  expect(
    api.clients.some((event) => event.type === "pause" && event.paused),
  ).toBe(true);
  await page.getByRole("button", { name: /^Resume interview/ }).click();
  await expect(
    page.getByRole("button", { name: /^Resume interview/ }),
  ).toHaveCount(0);
  await audio.click();
  await page
    .getByRole("menuitem", { name: /Interviewer playback speed/ })
    .click();
  await page.keyboard.press("Escape");
  await expect(audio).toBeFocused();
});

for (const scope of ["voice", "speech", "llm"] as const) {
  test(`${scope} failure exposes targeted recovery without losing the saved question`, async ({
    page,
    api,
  }) => {
    await page.goto("/interviews/active");
    await expect(
      page.getByRole("button", { name: "Finish interview", exact: true }),
    ).toBeVisible();
    api.send({
      type: "error",
      scope,
      message: "The service is temporarily unavailable.",
    });
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "The service is temporarily unavailable.",
    );
    await expect(
      page.getByRole("button", {
        name:
          scope === "voice"
            ? "Retry microphone"
            : scope === "speech"
              ? "Retry speech"
              : "Retry interviewer",
        exact: true,
      }),
    ).toBeEnabled();
    await expect(page.locator('[data-slot="live-caption"]')).toContainText(
      "How would you identify unnecessary re-renders",
    );
  });
}

test("disconnect reconnects to saved state and finish failure can retry", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  api.disconnect();
  await page
    .getByRole("button", { name: "Reconnect to resume", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="live-caption"]')).toContainText(
    "How would you identify unnecessary re-renders",
  );
  api.failures.set("POST /api/interviews/active/finish", {
    status: 503,
    error: "Could not finish interview.",
  });
  await page
    .getByRole("button", { name: "Finish interview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish and view feedback", exact: true })
    .click();
  await expect(
    page.getByText("Could not finish interview.", { exact: true }),
  ).toBeVisible();
  api.failures.delete("POST /api/interviews/active/finish");
  await page.getByRole("button", { name: "Retry finish", exact: true }).click();
  await expect(page).toHaveURL(/\/interviews\/active\/feedback$/);
});

test("finish cancellation and guarded navigation preserve a live interview", async ({
  page,
}) => {
  await page.goto("/interviews/active");
  const finish = page.getByRole("button", {
    name: "Finish interview",
    exact: true,
  });
  await finish.click();
  await page.getByRole("button", { name: "Keep going", exact: true }).click();
  await expect(finish).toBeFocused();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Keep interviewing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interviews\/active$/);
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await finish.click();
  await page
    .getByRole("button", { name: "End without feedback", exact: true })
    .click();
  await expect(page).toHaveURL(/\/history$/);
});
