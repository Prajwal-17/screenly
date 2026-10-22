import { expect, test } from "@playwright/test";
import { backendURL } from "./environment";
import type { InterviewDetail } from "@repo/shared";

async function enterWorkspace(page: import("@playwright/test").Page) {
  await page.goto("/auth/sign-in");
  await page
    .getByRole("textbox", { name: "Development email" })
    .fill(`visual-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Enter local workspace" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
}

async function capture(page: import("@playwright/test").Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (process.env.CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: `docs/screenshots/refined-${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
}

test("practice-first workspace keeps secondary navigation and setup usable on desktop and mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await enterWorkspace(page);
  await expect(
    page.getByRole("heading", { name: "No interviews yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Practice statistics" }),
  ).toHaveCount(0);
  const sidebar = page.getByRole("complementary", {
    name: "Screenly workspace",
  });
  await expect(
    sidebar.getByRole("link", { name: "Question library", exact: true }),
  ).toBeHidden();
  await capture(page, "overview-desktop");
  await sidebar.locator("summary").click();
  await sidebar
    .getByRole("link", { name: "Question library", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Prompts worth practising" }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Question library", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "More destinations", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Search workspace" })
    .fill("overview");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Choose a focus" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Backend APIs · Databases", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Backend", exact: true }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "Senior", exact: true }).click();
  await page.getByRole("radio", { name: "30 minutes", exact: true }).click();
  const summary = page.getByRole("complementary", { name: "Session summary" });
  await expect(summary).toContainText("Senior");
  await expect(summary).toContainText("30 minutes");
  await capture(page, "setup-desktop");
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await capture(page, `setup-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation", exact: true });
  await drawer.getByRole("link", { name: "History", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "History" }),
  ).toBeVisible();
  await capture(page, "history-mobile");
});

test("feedback prioritizes practice guidance and retains answer evidence", async ({
  page,
}) => {
  await enterWorkspace(page);
  // Synthetic report is confined to this test's intercepted request.
  const report: InterviewDetail = {
    id: "visual-report",
    role: "Frontend",
    level: "Mid-level",
    topics: ["React", "Testing"],
    duration: 20,
    status: "completed",
    createdAt: 1792404000000,
    startedAt: 1792404000000,
    endedAt: 1792405200000,
    feedbackStatus: "ready",
    feedbackModel: "test-fixture",
    messages: [
      {
        id: "answer-1",
        role: "user",
        content:
          "I would test the loading state, then resolve the request and check the rendered result.",
        status: "complete",
        createdAt: 1792404060000,
      },
    ],
    feedback: {
      scoreScale: 10,
      overallScore: 7.8,
      summary:
        "You connected component testing to user-visible behavior and considered error handling. Keep exploring concrete examples.",
      dimensions: [
        {
          name: "Technical accuracy",
          score: 8,
          explanation: "You described behavior-focused assertions.",
        },
        {
          name: "Depth & trade-offs",
          score: 7.2,
          explanation: "Explore more alternatives and their trade-offs.",
        },
        {
          name: "Problem solving",
          score: 7.8,
          explanation: "Your approach follows a clear sequence.",
        },
        {
          name: "Communication",
          score: 8.2,
          explanation: "Your explanations were clear and concise.",
        },
      ],
      strengths: [
        "You focused on behavior rather than implementation details.",
      ],
      improvements: ["Explain how you would test failure and loading states."],
      answers: [
        {
          messageId: "answer-1",
          observation: "You offered a concrete approach to component testing.",
          suggestion: "Include an example assertion and a failure case.",
        },
      ],
      nextSteps: [
        "Write a loading-state test.",
        "Practice explaining asynchronous errors.",
        "Compare integration tests with unit tests.",
      ],
    },
  };
  await page.route(`${backendURL}/api/interviews/visual-report`, (route) =>
    route.fulfill({ json: report }),
  );
  await page.goto("/interviews/visual-report/feedback");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const steps = page.getByRole("heading", {
      name: "Next steps",
      exact: true,
    });
    const scores = page.getByRole("heading", {
      name: "Score breakdown",
      exact: true,
    });
    await expect(steps).toBeVisible();
    expect((await steps.boundingBox())!.y).toBeLessThan(
      (await scores.boundingBox())!.y,
    );
    await capture(page, `feedback-${width}`);
  }
  await page.getByRole("button", { name: "Answer 1", exact: true }).click();
  await expect(
    page.getByText(report.messages[0]!.content, { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Practice again" }).click();
  await expect(
    page.getByRole("radio", { name: "Frontend", exact: true }),
  ).toBeChecked();
});
