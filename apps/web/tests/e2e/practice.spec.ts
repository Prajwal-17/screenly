import { test, expect } from "./fixtures";

test("dashboard role, setup validation, exact payload, and duplicate prevention", async ({
  page,
  api,
}) => {
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Practice role: Frontend", exact: true })
    .click();
  await page
    .getByRole("menuitemradio", { name: "Backend", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Configure Backend interview", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  for (const box of await page.getByRole("checkbox").all()) await box.uncheck();
  const submit = page.getByRole("button", {
    name: "Check microphone",
    exact: true,
  });
  await submit.click();
  await expect(
    page.getByText("Choose at least one topic.", { exact: true }),
  ).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await submit.click();
  await expect(
    page.getByText("Choose up to six topics.", { exact: true }),
  ).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.uncheck();
  await page.getByRole("checkbox", { name: "APIs", exact: true }).check();
  await page.getByRole("radio", { name: "Senior", exact: true }).click();
  await page.getByRole("radio", { name: "30 min", exact: true }).click();
  let release!: () => void;
  api.holds.set(
    "POST /api/interviews",
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("aria-busy", "true");
  expect(
    api.requests.filter(
      (r) => r.method === "POST" && r.path === "/api/interviews",
    ),
  ).toHaveLength(1);
  release();
  await expect(page).toHaveURL(/\/interviews\/created$/);
  expect(
    api.requests.find(
      (r) => r.method === "POST" && r.path === "/api/interviews",
    )?.body,
  ).toEqual({
    role: "Backend",
    level: "Senior",
    topics: ["APIs"],
    duration: 30,
  });
  await expect(
    page.getByRole("heading", { name: "Check your audio" }),
  ).toBeVisible();
});

test("setup failure preserves choices and retries; profile defaults remain valid", async ({
  page,
  api,
}) => {
  api.profile.details.role = "Full-stack";
  api.profile.details.level = "Senior";
  api.failures.set("POST /api/interviews", {
    status: 503,
    error: "Could not save your setup.",
  });
  await page.goto("/interviews/new");
  await expect(
    page.getByRole("radio", { name: "Full-stack", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Senior", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(page.getByText("Could not save your setup.")).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Full-stack", exact: true }),
  ).toBeChecked();
  api.failures.delete("POST /api/interviews");
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(page).toHaveURL(/\/interviews\/created$/);
});

test("blank profile role, empty dashboard, and failed list recover", async ({
  page,
  api,
}) => {
  api.profile.details.role = "";
  api.interviews = [];
  await page.goto("/dashboard");
  await expect(
    page.getByRole("button", { name: "Practice role: Frontend" }),
  ).toBeVisible();
  await expect(
    page.getByText("No interviews yet.", { exact: true }),
  ).toBeVisible();
  api.failures.set("GET /api/interviews", {
    status: 503,
    error: "Could not load interviews.",
  });
  await page.reload();
  await expect(page.getByText("Could not load interviews.")).toBeVisible();
  api.failures.delete("GET /api/interviews");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("No interviews yet.", { exact: true }),
  ).toBeVisible();
});

test("preflight mic permission denial retries and unavailable services block starting", async ({
  page,
  api,
}) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    let deny = true;
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (deny) {
        deny = false;
        return Promise.reject(new DOMException("Denied", "NotAllowedError"));
      }
      return original(constraints);
    };
  });
  await page.goto("/interviews/draft");
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(
    page.getByText("Allow microphone access in your browser, then retry."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check microphone again", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Test sound", exact: true }).click();
  api.capabilities.voice = false;
  api.capabilities.llm = false;
  await page.reload();
  await expect(
    page.getByText("Voice interviews are unavailable. Try again later."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start interview", exact: true }),
  ).toBeDisabled();
});

test("history filters and destructive recovery preserve data on cancel and failure", async ({
  page,
  api,
}) => {
  await page.goto("/history");
  await page.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search interviews", exact: true })
    .fill("no-match");
  await expect(
    page.getByRole("heading", { name: "No interviews match" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Keep it", exact: true }).click();
  expect(api.requests.filter((r) => r.method === "DELETE")).toHaveLength(0);
  api.failures.set("DELETE /api/interviews/completed", {
    status: 503,
    error: "Could not delete interview.",
  });
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await expect(page.getByText("Could not delete interview.")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  api.failures.delete("DELETE /api/interviews/completed");
  await page
    .getByRole("button", { name: "Delete Frontend interview", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Delete interview", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});

for (const status of ["pending", "generating", "failed", "skipped"] as const) {
  test(`feedback ${status} retains transcript and supports its next action`, async ({
    page,
    api,
  }) => {
    const completed = api.interviews[0]!;
    completed.feedback = null;
    completed.feedbackStatus = status;
    await page.goto("/interviews/completed/feedback");
    await page.getByRole("button", { name: /^Full conversation/ }).click();
    await expect(
      page.getByText(completed.messages[0]!.content, { exact: true }),
    ).toBeVisible();
    if (status === "pending" || status === "generating") {
      await expect(
        page.getByRole("heading", { name: "Generating feedback…" }),
      ).toBeVisible();
      completed.feedback = (await import("./fixtures")).feedback;
      completed.feedbackStatus = "ready";
      await expect(
        page.getByText(completed.feedback.summary, { exact: true }),
      ).toBeVisible();
    } else {
      api.failures.set("POST /api/interviews/completed/feedback", {
        status: 503,
        error: "Feedback service unavailable.",
      });
      const retry = page.getByRole("button", {
        name: status === "skipped" ? "Generate feedback" : "Retry feedback",
        exact: true,
      });
      await retry.click();
      await expect(
        page.getByText("Feedback service unavailable."),
      ).toBeVisible();
      api.failures.delete("POST /api/interviews/completed/feedback");
      await retry.click();
      await expect(
        page.getByText(
          "You explained the rendering lifecycle clearly. Compare alternatives with a concrete example.",
        ),
      ).toBeVisible();
    }
  });
}

test("feedback evidence, null scores, and transcript download", async ({
  page,
  api,
}) => {
  api.interviews[0]!.feedback!.overallScore = null;
  api.interviews[0]!.feedback!.dimensions[0]!.score = null;
  await page.goto("/interviews/completed/feedback");
  await expect(page.getByText("NaN")).toHaveCount(0);
  await page.getByRole("button", { name: "Strengths", exact: true }).click();
  await expect(
    page.getByText("Clear explanation of component rendering."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Answer 1", exact: true }).click();
  await expect(
    page.getByText("You identified unnecessary renders."),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Transcript", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
});
