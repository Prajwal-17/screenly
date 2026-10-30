import { test, expect, now } from "./fixtures";

test("closing playback acknowledges the response without clearing the saving state", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  api.send({ type: "audio-start", responseId: 42 });
  api.send({ type: "status", status: "finishing" });
  api.send({ type: "audio-end", responseId: 42 });
  await expect
    .poll(() =>
      api.clients.some(
        (event) => event.type === "played" && event.responseId === 42,
      ),
    )
    .toBe(true);
  await expect(
    page.getByText("Saving interview", { exact: true }),
  ).toBeVisible();
});

test("opening, thinking, speaking, and replay retain timing and saved context", async ({
  page,
  api,
}) => {
  api.interviews[1]!.phase = "opening";
  api.interviews[1]!.startedAt = null;
  await page.goto("/interviews/active");
  const transcript = page.getByRole("region", { name: "Conversation" });
  await expect(transcript).toBeVisible();
  api.send({ type: "status", status: "thinking" });
  await expect(
    page.getByText("Interviewer is thinking", { exact: true }),
  ).toBeVisible();
  api.send({ type: "status", status: "speaking" });
  await expect(
    page.getByText("Interviewer speaking", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toContainText("00:00");
  await page.getByRole("button", { name: "Replay interviewer" }).click();
  await expect
    .poll(() => api.clients.some((event) => event.type === "speak"))
    .toBe(true);
  await expect(transcript).toContainText(
    "How would you identify unnecessary re-renders",
  );
});

test("live transcript reconciles temporary candidate speech into a saved turn", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/active");
  const transcript = page.locator("#live-transcript");
  await expect(transcript).toContainText(
    "How would you identify unnecessary re-renders",
  );
  api.send({ type: "partial", text: "I would measure before optimizing." });
  await expect(
    transcript.locator('[data-live-message="candidate"]'),
  ).toContainText("I would measure before optimizing.");
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
  await expect(
    transcript.locator('[data-live-message="candidate"]'),
  ).toHaveCount(0);
  await expect(
    transcript.getByText("I would measure before optimizing.", { exact: true }),
  ).toHaveCount(1);
  await page.keyboard.press("t");
  await expect(page.locator('#live-transcript [role="log"]')).toBeFocused();
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
    await expect(
      page.locator('[data-slot="transcript-content"]'),
    ).toContainText("How would you identify unnecessary re-renders");
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
  await expect(page.locator('[data-slot="transcript-content"]')).toContainText(
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
  await page.getByRole("link", { name: "New interview", exact: true }).click();
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

test("long speech errors wrap without covering recovery or live controls", async ({
  page,
  api,
}, testInfo) => {
  await page.goto("/interviews/active");
  await expect(
    page.getByRole("button", { name: "Finish interview", exact: true }),
  ).toBeVisible();
  api.send({
    type: "error",
    scope: "voice",
    message:
      "The connection to the transcription service was interrupted. Your saved conversation is still available. Retry the microphone to reconnect and continue your answer.",
  });
  const notice = page.locator("[data-interview-notice]");
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 600 });
    const retry = page.getByRole("button", {
      name: "Retry microphone",
      exact: true,
    });
    await expect(retry).toBeInViewport();
    await expect(
      page.getByRole("button", { name: "Finish interview", exact: true }),
    ).toBeInViewport();
    const bounds = await notice.boundingBox();
    const text = await notice.locator("p").boundingBox();
    const action = await retry.boundingBox();
    const icon = await notice.locator(":scope > svg").boundingBox();
    expect(
      Math.abs(icon!.y + icon!.height / 2 - (action!.y + action!.height / 2)),
    ).toBeLessThanOrEqual(1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const separated =
      text!.x + text!.width <= action!.x + 1 ||
      text!.y + text!.height <= action!.y + 1;
    expect(separated).toBe(true);
    await testInfo.attach(`speech-error-${width}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  }
});
