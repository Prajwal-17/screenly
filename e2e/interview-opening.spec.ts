import { expect, test } from "@playwright/test";
import { signInForTest } from "./session-fixture";
import { backendURL, voiceURL, webURL } from "./environment";
import { acceptDocumentExit } from "./navigation";

test("personalized voice overview waits for consent, survives reconnect, and stays out of feedback", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90000);
  await context.grantPermissions(["microphone"]);
  await page.request.post(`${voiceURL}/speech-settings`, {
    data: { wordMs: 20, automaticAnswer: false },
  });
  await signInForTest(context);
  const profile = await (
    await page.request.get(`${backendURL}/api/profile`)
  ).json();
  const updated = await page.request.put(`${backendURL}/api/profile`, {
    headers: { Origin: webURL },
    data: {
      complete: true,
      details: {
        ...profile.details,
        name: "Maya Chen",
        stack: ["React", "TypeScript"],
        goal: "Explain design trade-offs",
        projects: [
          {
            name: "Relay",
            description: "An accessible dashboard",
            role: "Developer",
            stack: ["React"],
            url: "",
            repositoryUrl: "",
          },
        ],
      },
    },
  });
  expect(updated.ok()).toBe(true);
  const created = await page.request.post(`${backendURL}/api/interviews`, {
    data: {
      role: "Frontend",
      level: "Mid-level",
      topics: ["React", "JavaScript"],
      duration: 10,
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const saved = async () =>
    (await page.request.get(`${backendURL}/api/interviews/${id}`)).json();
  const turn = async (transcript: string) => {
    await page.request.post(`${voiceURL}/turn`, { data: { transcript } });
    await expect
      .poll(async () => {
        const messages = (await saved()).messages as {
          role: string;
          content: string;
        }[];
        const answer = messages.findLastIndex(
          (message) =>
            message.role === "user" && message.content === transcript,
        );
        return (
          answer >= 0 &&
          messages
            .slice(answer + 1)
            .some((message) => message.role === "assistant")
        );
      })
      .toBe(true);
  };
  try {
    await page.goto(`/interviews/${id}`);
    await expect(
      page.getByText(
        "A short introduction first. Your timer starts with the first technical question.",
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Start interview", exact: true })
      .click();
    const caption = page.locator('[data-slot="live-caption"]');
    await expect(caption).toContainText("Hi Maya.", { timeout: 15000 });
    await expect(caption).toContainText("We’ll cover React and JavaScript");
    await expect(caption).toContainText("experience with React and TypeScript");
    await expect(caption).toContainText("Ready to begin?");
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
    expect((await saved()).startedAt).toBeNull();
    expect((await saved()).phase).toBe("opening");
    expect((await saved()).messages).toHaveLength(1);
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      await expect(caption).toBeInViewport();
      expect(
        await page.evaluate(() => ({
          horizontal: document.documentElement.scrollWidth <= innerWidth,
          vertical: document.documentElement.scrollHeight <= innerHeight,
        })),
      ).toEqual({ horizontal: true, vertical: true });
      await page.screenshot({
        path: testInfo.outputPath(`opening-${width}.png`),
        animations: "disabled",
      });
    }
    await turn("Not ready yet.");
    await expect(caption).toContainText("Let me know when you’re ready.");
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
    await turn("Yes, but first what topics will we cover?");
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
    expect((await saved()).phase).toBe("opening");
    expect((await saved()).startedAt).toBeNull();
    const count = (await saved()).messages.length;
    await acceptDocumentExit(page, () => page.reload());
    await page
      .getByRole("button", { name: "Resume interview", exact: true })
      .click();
    await expect(
      page.getByText("Ready when you are", { exact: true }),
    ).toBeVisible();
    expect((await saved()).messages).toHaveLength(count);
    expect((await saved()).startedAt).toBeNull();
    await turn("Yes, ready.");
    await expect(caption).toContainText("How would you test a component");
    await expect.poll(async () => (await saved()).startedAt).not.toBeNull();
    await expect(
      page.getByText("Listening to you", { exact: true }),
    ).toBeVisible();
    const intro = await saved();
    expect(intro.phase).toBe("questions");
    expect(
      intro.messages.filter(
        (message: { phase: string }) => message.phase === "questions",
      ),
    ).toHaveLength(1);
    for (const answer of [
      "I would test the visible behavior and loading state.",
      "I would cover errors and retries with a controlled response.",
    ]) {
      await turn(answer);
      await expect(
        page.getByText("Listening to you", { exact: true }),
      ).toBeVisible();
    }
    const finished = await page.request.post(
      `${backendURL}/api/interviews/${id}/finish`,
      { data: { generateFeedback: true } },
    );
    expect(finished.ok()).toBe(true);
    await expect(page).toHaveURL(/\/feedback$/);
    await expect(
      page.getByRole("heading", { name: "Summary", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const report = await saved();
    expect(report.feedback.answers).toHaveLength(2);
    const openingIds = new Set(
      report.messages
        .filter((message: { phase: string }) => message.phase === "opening")
        .map((message: { id: string }) => message.id),
    );
    expect(
      report.feedback.answers.every(
        (answer: { messageId: string }) => !openingIds.has(answer.messageId),
      ),
    ).toBe(true);
  } finally {
    await page.close();
    await page.request.delete(`${backendURL}/api/interviews/${id}`);
    await page.request.post(`${voiceURL}/speech-settings`, {
      data: { wordMs: 45, automaticAnswer: true },
    });
  }
});
