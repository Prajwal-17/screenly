import { test, expect, feedback, review } from "./fixtures";

test("role entry uses saved experience and sends only the selected role", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/new?role=Backend");
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByText("Mid-level", { exact: false }).first(),
  ).toBeVisible();
  const start = page.getByRole("button", {
    name: "Continue to audio",
    exact: true,
  });
  let release!: () => void;
  api.holds.set(
    "POST /api/interviews",
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  await start.click();
  await expect(start).toBeDisabled();
  expect(
    api.requests.filter(
      (request) =>
        request.method === "POST" && request.path === "/api/interviews",
    ),
  ).toHaveLength(1);
  release();
  await expect(page).toHaveURL(/\/interviews\/created$/);
  expect(
    api.requests.find(
      (request) =>
        request.method === "POST" && request.path === "/api/interviews",
    )?.body,
  ).toEqual({ role: "Backend" });
  await expect(
    page.getByRole("heading", { name: "Check your audio" }),
  ).toBeVisible();
});

test("missing saved experience blocks creation; profile and service failures retain recovery", async ({
  page,
  api,
}) => {
  api.profile.details.level = "";
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("radiogroup", { name: "Experience level", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to audio" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Complete profile" }),
  ).toBeVisible();
  api.profile.details.level = "Senior";
  api.failures.set("GET /api/profile", {
    status: 503,
    error: "Private detail",
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "We couldn’t load your profile" }),
  ).toBeVisible();
  await expect(page.getByText("Private detail")).toHaveCount(0);
  api.failures.delete("GET /api/profile");
  await page.getByRole("button", { name: "Retry loading profile" }).click();
  await expect(
    page.getByRole("button", { name: "Continue to audio" }),
  ).toBeEnabled();
});

test("missing experience can be saved inline and continued without completing onboarding", async ({
  page,
  api,
}) => {
  api.profile.details.level = "";
  api.profile.details.goal = "";
  api.failures.set("POST /api/profile/experience", {
    status: 503,
    error: "Could not save experience. Retry.",
  });
  await page.goto("/interviews/new?role=Backend");
  await page.getByRole("radio", { name: "Senior", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue to audio", exact: true })
    .click();
  await expect(
    page.getByText("Could not save experience. Retry."),
  ).toBeVisible();
  expect(
    api.requests.some(
      (r) => r.path === "/api/interviews" && r.method === "POST",
    ),
  ).toBe(false);
  api.failures.delete("POST /api/profile/experience");
  await page
    .getByRole("button", { name: "Continue to audio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interviews\/created$/);
  expect(api.profile.details.level).toBe("Senior");
  expect(api.profile.details.goal).toBe("");
  expect(
    api.requests.find((r) => r.path === "/api/profile/experience")?.body,
  ).toEqual({ level: "Senior" });
});

test("create failure preserves role and retries", async ({ page, api }) => {
  api.failures.set("POST /api/interviews", {
    status: 503,
    error: "Could not create interview.",
  });
  await page.goto("/interviews/new");
  await page.getByRole("radio", { name: "Data Engineering" }).click();
  await page.getByRole("button", { name: "Continue to audio" }).click();
  await expect(page.getByText("Could not create interview.")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Data Engineering" }),
  ).toBeChecked();
  api.failures.delete("POST /api/interviews");
  await page.getByRole("button", { name: "Continue to audio" }).click();
  await expect(page).toHaveURL(/\/interviews\/created$/);
});

test("an edited goal retries before creation and preserves newer profile fields", async ({
  page,
  api,
}) => {
  api.profile.details.goal = "Compare implementation choices.";
  await page.goto("/interviews/new?role=Backend");
  const goal = page.getByRole("textbox", { name: "Practice goal" });
  await expect(goal).toHaveValue("Compare implementation choices.");
  await goal.fill("Explain technical trade-offs clearly.");
  await expect(
    page.getByText("Saved to your profile when you continue."),
  ).toBeVisible();
  // A later profile edit must survive the explicit goal save.
  api.profile.details.headline = "Updated in another tab";
  api.profile.details.stack.push("Zod");
  api.profile.onboarding.step = 4;
  api.failures.set("PUT /api/profile", {
    status: 503,
    error: "Private save failure",
  });
  await page
    .getByRole("button", { name: "Continue to audio", exact: true })
    .click();
  await expect(
    page.getByText("Could not save your practice goal. Try again."),
  ).toBeVisible();
  await expect(goal).toHaveValue("Explain technical trade-offs clearly.");
  await expect(page.getByText("Private save failure")).toHaveCount(0);
  expect(
    api.requests.some(
      (r) => r.method === "POST" && r.path === "/api/interviews",
    ),
  ).toBe(false);
  api.failures.delete("PUT /api/profile");
  await page
    .getByRole("button", { name: "Continue to audio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interviews\/created$/);
  expect(api.profile.details.goal).toBe(
    "Explain technical trade-offs clearly.",
  );
  expect(api.profile.details.headline).toBe("Updated in another tab");
  expect(api.profile.details.stack).toContain("Zod");
  expect(api.profile.onboarding.step).toBe(4);
  expect(api.profile.status).toBe("complete");
  const creation = api.requests.findIndex(
    (r) => r.method === "POST" && r.path === "/api/interviews",
  );
  const save = api.requests.reduce(
    (last, request, index) =>
      request.method === "PUT" && request.path === "/api/profile"
        ? index
        : last,
    -1,
  );
  expect(save).toBeLessThan(creation);
  expect(api.requests[creation]!.body).toEqual({ role: "Backend" });
  await expect(
    page.getByRole("link", { name: "Change role", exact: true }),
  ).toHaveAttribute("href", "/interviews/new?role=Backend");
});

test("preflight microphone denial retries and service unavailability blocks starting", async ({
  page,
  api,
}) => {
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    Object.assign(window, { __preflightStreams: streams });
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    let deny = true;
    navigator.mediaDevices.getUserMedia = (constraints) =>
      deny
        ? ((deny = false),
          Promise.reject(new DOMException("Denied", "NotAllowedError")))
        : original(constraints).then((stream) => {
            streams.push(stream);
            return stream;
          });
  });
  await page.goto("/interviews/draft");
  await page.getByRole("button", { name: "Test input" }).click();
  await expect(
    page.getByRole("meter", { name: "Microphone input level" }),
  ).toBeVisible();
  await expect(
    page.getByText("Allow microphone access in your browser, then retry."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Test input" }).click();
  await expect(
    page.getByRole("button", { name: "Start interview", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Test input again" }),
  ).toBeVisible();
  await expect(
    page.getByText("Microphone access confirmed.", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & { __preflightStreams: MediaStream[] }
        ).__preflightStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Test sound", exact: true }).click();
  await expect(
    page.getByText("Test sound played", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Test input again", exact: true })
    .click();
  await page.getByRole("link", { name: "Change role", exact: true }).click();
  await expect(page).toHaveURL(/\/interviews\/new\?role=Frontend$/);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & { __preflightStreams: MediaStream[] }
        ).__preflightStreams.every((stream) =>
          stream.getTracks().every((track) => track.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
  api.capabilities.voice = false;
  await page.goto("/interviews/draft");
  await expect(
    page.getByRole("button", { name: "Start interview" }),
  ).toBeDisabled();
});

test("history filters, export and deletion retain real sessions", async ({
  page,
  api,
}) => {
  await page.goto("/history");
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search interviews" })
    .fill("no-match");
  await expect(
    page.getByRole("heading", { name: "No interviews match" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Delete Frontend interview" })
    .first()
    .click();
  await page.getByRole("button", { name: "Keep it" }).click();
  expect(
    api.requests.filter((request) => request.method === "DELETE"),
  ).toHaveLength(0);
  await page.goto("/interviews/completed/feedback");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Transcript", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/history$/);
  expect(
    api.interviews.find((item) => item.id === "completed"),
  ).toBeUndefined();
});

test("review findings link exact saved evidence and legacy report stays unscored", async ({
  page,
  api,
}) => {
  await page.goto("/interviews/completed/feedback");
  await expect(page.getByText(review.summary)).toBeVisible();
  await page.getByRole("link", { name: /View evidence 1/ }).click();
  await expect(page).toHaveURL(/#message-answer$/);
  await expect(page.locator("#message-answer")).toContainText(
    "I would profile the application",
  );
  await expect(page.getByText(/\/ 10|score breakdown|Answer 1/i)).toHaveCount(
    0,
  );
  api.interviews[0]!.review = null;
  api.interviews[0]!.feedback = structuredClone(feedback);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Earlier review" }),
  ).toBeVisible();
  await expect(page.getByText(feedback.summary)).toBeVisible();
  await expect(page.getByText(/\/ 10|score breakdown|Answer 1/i)).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Request a new review" }).click();
  await expect(page.getByText(review.summary)).toBeVisible();
});

for (const status of ["pending", "generating", "failed", "skipped"] as const) {
  test(`review ${status} retains transcript and recovery`, async ({
    page,
    api,
  }) => {
    const completed = api.interviews[0]!;
    completed.review = null;
    completed.feedbackStatus = status;
    await page.goto("/interviews/completed/feedback");
    await expect(
      page.getByText(completed.messages[0]!.content, { exact: true }),
    ).toBeVisible();
    if (status === "pending" || status === "generating") {
      await expect(
        page.getByRole("heading", { name: "Review in progress" }),
      ).toBeVisible();
      completed.review = structuredClone(review);
      completed.feedbackStatus = "ready";
      await expect(page.getByText(review.summary)).toBeVisible();
    } else {
      api.failures.set("POST /api/interviews/completed/feedback", {
        status: 503,
        error: "Review unavailable.",
      });
      const button = page.getByRole("button", {
        name: status === "failed" ? "Retry review" : "Generate review",
      });
      await button.click();
      await expect(page.getByText("Review unavailable.")).toBeVisible();
      api.failures.delete("POST /api/interviews/completed/feedback");
      await button.click();
      await expect(page.getByText(review.summary)).toBeVisible();
    }
  });
}

test("practice memory lists owned findings and dismisses it without deleting source", async ({
  page,
  api,
}) => {
  await page.goto("/memory");
  await expect(
    page.getByText("Explain a concrete profiler trace."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Source interview" }),
  ).toHaveAttribute("href", "/interviews/completed/feedback");
  await page.getByRole("button", { name: /Remove practice finding/ }).click();
  await page.getByRole("button", { name: "Remove finding" }).click();
  await expect(page.getByText("No retained findings yet.")).toBeVisible();
  expect(api.interviews.find((item) => item.id === "completed")).toBeDefined();
});

test("playback preference persists from Settings into the live audio menu", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("Interviewer playback speed").press("Enter");
  await page.getByRole("option", { name: "1.5×" }).click();
  await page.goto("/interviews/active");
  await page.getByRole("button", { name: "Audio settings" }).click();
  await expect(
    page.getByRole("menuitem", { name: /Interviewer playback speed/ }),
  ).toContainText("1.5×");
});
